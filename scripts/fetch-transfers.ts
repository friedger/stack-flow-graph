/**
 * Fetches the STX history of the tracked addresses from Secondlayer and
 * writes public/data/transfers.json.
 *
 *   SECONDLAYER_API_KEY=sk-sl_... npm run data:update
 *
 * - Transfers, mints and burns come from the Secondlayer Index API
 *   (GET /v1/index/events). Runs are incremental: each query resumes from the
 *   height stored in `cursors`, re-fetching the last REORG_MARGIN blocks.
 * - Balances come from the Hiro API at the same block height, so the app can
 *   anchor its reconstructed balances to the chain.
 * - Seeds and discovery rules live in scripts/tracking.config.json.
 *
 * Env: SECONDLAYER_API_KEY (required for the hosted API), SL_API_URL,
 * HIRO_API_URL, HIRO_API_KEY. A .env.local file in the repo root is read too.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DATA_VERSION,
  discoverRecipients,
  hasValidBlockTime,
  interpolateBlockTime,
  isContractPrincipal,
  mergeSupply,
  mergeTransfers,
  pickAnchorHeights,
  queryKey,
  supplyResumeHeight,
  type QueryKind,
  type RawSupplyEvent,
  type TransferData,
  type TransferEvent,
} from "../src/utils/transferData.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = resolve(ROOT, "scripts/tracking.config.json");
const DATA_PATH = resolve(ROOT, "public/data/transfers.json");
const REORG_MARGIN = 100;
const PAGE_LIMIT = 1000;
/** Max distance in blocks between exact time lookups when interpolating mint times. */
const ANCHOR_SPACING = 1000;

loadEnvFile(resolve(ROOT, ".env.local"));
const SL_API_URL = (process.env.SL_API_URL || "https://api.secondlayer.tools").replace(/\/$/, "");
const SL_API_KEY = process.env.SECONDLAYER_API_KEY || process.env.INSTANCE_TOKEN;
const HIRO_API_URL = (process.env.HIRO_API_URL || "https://api.hiro.so").replace(/\/$/, "");
const HIRO_API_KEY = process.env.HIRO_API_KEY;

interface Config {
  startTime: string;
  seeds: string[];
  follow: { minStx: number; maxDepth: number; maxEventsPerAddress: number };
  ignore: string[];
}

interface IndexEvent {
  cursor: string;
  block_height: number;
  block_time: string;
  tx_id: string;
  event_index: number;
  event_type: string;
  sender: string | null;
  recipient: string | null;
  amount: string;
}

interface IndexResponse {
  events: IndexEvent[];
  next_cursor: string | null;
  tip?: unknown;
  reorgs?: unknown[];
}

const EVENT_QUERIES: Record<QueryKind, { eventType: string; side: "sender" | "recipient" }> = {
  "transfer-out": { eventType: "stx_transfer", side: "sender" },
  "transfer-in": { eventType: "stx_transfer", side: "recipient" },
  mint: { eventType: "stx_mint", side: "recipient" },
  burn: { eventType: "stx_burn", side: "sender" },
};

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return (await res.json()) as T;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 5) {
      throw new Error(`${res.status} ${res.statusText} for ${url}\n${await res.text()}`);
    }
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep((retryAfter > 0 ? retryAfter : 2 ** attempt) * 1000);
  }
}

function slHeaders(): Record<string, string> {
  return SL_API_KEY ? { Authorization: `Bearer ${SL_API_KEY}` } : {};
}

function indexUrl(params: Record<string, string | number | undefined>) {
  const url = new URL(`${SL_API_URL}/v1/index/events`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function parseTipHeight(tip: unknown): number | undefined {
  if (typeof tip === "number") return tip;
  if (tip && typeof tip === "object") {
    const t = tip as Record<string, unknown>;
    // finalized_height: blocks below it can no longer be reorged
    for (const key of ["finalized_height", "block_height", "height"]) {
      if (typeof t[key] === "number") return t[key];
    }
  }
  return undefined;
}

function reorgForkHeight(reorgs: unknown[] | undefined): number | undefined {
  let min: number | undefined;
  for (const r of reorgs || []) {
    const o = r as Record<string, unknown>;
    const h = [o.fork_point_height, o.height, o.block_height].find(
      (v) => typeof v === "number"
    );
    if (h !== undefined) min = min === undefined ? h : Math.min(min, h);
  }
  return min;
}

/** Secondlayer's finalized tip, so every query and balance uses the same height. */
async function fetchTipHeight(): Promise<number> {
  const res = await getJson<IndexResponse>(
    indexUrl({ event_type: "stx_transfer", limit: 1, order: "desc" }),
    slHeaders()
  );
  const tip = parseTipHeight(res.tip) ?? res.events[0]?.block_height;
  if (tip === undefined) throw new Error("Could not determine Secondlayer tip height");
  return tip;
}

/**
 * Fetches all events of one query in [fromHeight, toHeight].
 * Returns `truncated` when more than `cap` events exist.
 */
async function fetchEvents(
  kind: QueryKind,
  address: string,
  fromHeight: number | undefined,
  toHeight: number,
  cap = Infinity
): Promise<{ events: IndexEvent[]; truncated: boolean; reorgFrom?: number }> {
  const { eventType, side } = EVENT_QUERIES[kind];
  const events: IndexEvent[] = [];
  let cursor: string | null = null;
  let reorgFrom: number | undefined;
  do {
    const res: IndexResponse = await getJson<IndexResponse>(
      indexUrl({
        event_type: eventType,
        [side]: address,
        order: "asc",
        limit: PAGE_LIMIT,
        to_height: toHeight,
        // Without from_height the API only returns recent events.
        ...(cursor ? { cursor } : { from_height: fromHeight ?? 1 }),
      }),
      slHeaders()
    );
    const fork = reorgForkHeight(res.reorgs);
    if (fork !== undefined) reorgFrom = Math.min(reorgFrom ?? fork, fork);
    for (const e of res.events) {
      // Guard against filters the API might ignore.
      if (e.event_type !== eventType || e[side] !== address) continue;
      if (e.block_height > toHeight) continue;
      events.push(e);
    }
    if (events.length > cap) return { events, truncated: true, reorgFrom };
    cursor = res.events.length > 0 ? res.next_cursor : null;
  } while (cursor);
  return { events, truncated: false, reorgFrom };
}

function toTransfer(e: IndexEvent): TransferEvent {
  return {
    txId: e.tx_id,
    index: e.event_index,
    height: e.block_height,
    time: e.block_time,
    sender: e.sender!,
    recipient: e.recipient!,
    amount: String(e.amount),
  };
}

function toSupply(e: IndexEvent): RawSupplyEvent {
  return { height: e.block_height, time: e.block_time, amount: String(e.amount) };
}

async function fetchBalance(address: string, height: number): Promise<string> {
  const res = await getJson<{ balance: string }>(
    `${HIRO_API_URL}/extended/v1/address/${address}/stx?until_block=${height}`,
    HIRO_API_KEY ? { "x-api-key": HIRO_API_KEY } : {}
  );
  if (!HIRO_API_KEY) await sleep(1300); // stay below the anonymous rate limit
  return res.balance;
}

const blockTimes = new Map<number, number>();
let repairedEvents = 0;

async function fetchBlockTime(height: number): Promise<number> {
  const cached = blockTimes.get(height);
  if (cached !== undefined) return cached;
  const res = await getJson<{ block_time_iso: string }>(
    `${HIRO_API_URL}/extended/v2/blocks/${height}`,
    HIRO_API_KEY ? { "x-api-key": HIRO_API_KEY } : {}
  );
  if (!HIRO_API_KEY) await sleep(1300);
  const time = Date.parse(res.block_time_iso);
  blockTimes.set(height, time);
  return time;
}

/**
 * Secondlayer returns 1970-01-01 as block_time for some block ranges.
 * Transfers get their exact block time from Hiro; mints and burns (thousands
 * per range, summed per day anyway) are interpolated between exact anchors.
 */
async function repairBlockTimes(events: IndexEvent[], exact: boolean) {
  const bad = events.filter((e) => !hasValidBlockTime(e.block_time));
  if (bad.length === 0) return;
  const heights = bad.map((e) => e.block_height);
  const lookups = exact ? Array.from(new Set(heights)) : pickAnchorHeights(heights, ANCHOR_SPACING);
  const anchors = new Map<number, number>();
  for (const h of lookups) anchors.set(h, await fetchBlockTime(h));
  for (const e of bad) {
    e.block_time = new Date(interpolateBlockTime(e.block_height, anchors)).toISOString();
  }
  repairedEvents += bad.length;
  console.log(
    `  repaired ${bad.length} missing block times (heights ${Math.min(...heights)}-${Math.max(...heights)}, ${lookups.length} lookups)`
  );
}

function emptyData(config: Config): TransferData {
  return {
    version: DATA_VERSION,
    generatedAt: "",
    height: 0,
    startTime: config.startTime,
    tracked: [],
    skipped: [],
    balances: {},
    transfers: [],
    supply: [],
    cursors: {},
  };
}

/** Pretty top level, one array element per line: small, reviewable diffs. */
function formatData(data: TransferData): string {
  const lines = Object.entries(data).map(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return `  ${JSON.stringify(key)}: []`;
      const items = value.map((v) => `    ${JSON.stringify(v)}`).join(",\n");
      return `  ${JSON.stringify(key)}: [\n${items}\n  ]`;
    }
    return `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
  });
  return `{\n${lines.join(",\n")}\n}\n`;
}

async function main() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Config;
  const startMs = Date.parse(config.startTime);
  const previous: TransferData = existsSync(DATA_PATH)
    ? (JSON.parse(readFileSync(DATA_PATH, "utf8")) as TransferData)
    : emptyData(config);
  if (previous.version !== DATA_VERSION || previous.startTime !== config.startTime) {
    console.log("data format or startTime changed, refetching everything");
    previous.transfers = [];
    previous.supply = [];
    previous.cursors = {};
  }

  const ignore = new Set(config.ignore);
  const seeds = config.seeds.filter((a) => !ignore.has(a));
  const knownSkipped = new Map(previous.skipped.map((s) => [s.address, s.reason]));
  const height = await fetchTipHeight();
  console.log(`Secondlayer tip: ${height}`);

  let transfers = previous.transfers;
  let supply = previous.supply;
  const cursors: Record<string, number> = {};
  const tracked = new Set<string>();
  const skipped: TransferData["skipped"] = [];
  const minMicro = config.follow.minStx * 1_000_000;

  async function runQuery(kind: QueryKind, address: string, cap?: number): Promise<boolean> {
    const key = queryKey(kind, address);
    const cursor = previous.cursors[key];
    const isSupply = kind === "mint" || kind === "burn";
    let from = isSupply
      ? supplyResumeHeight(supply, kind, address, cursor)
      : cursor === undefined
        ? undefined
        : Math.max(0, cursor + 1 - REORG_MARGIN);

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await fetchEvents(kind, address, from, height, cap);
      if (result.truncated) return false;
      if (result.reorgFrom !== undefined && from !== undefined && result.reorgFrom < from) {
        console.log(`  reorg below ${from} for ${key}, refetching from ${result.reorgFrom}`);
        from = result.reorgFrom;
        continue;
      }
      await repairBlockTimes(result.events, !isSupply);
      const inWindow = result.events.filter((e) => Date.parse(e.block_time) >= startMs);
      const fromHeight = from ?? 0;
      if (isSupply) {
        supply = mergeSupply(supply, inWindow.map(toSupply), kind, address, fromHeight);
      } else {
        transfers = mergeTransfers(transfers, inWindow.map(toTransfer), kind, address, fromHeight);
      }
      cursors[key] = height;
      if (result.events.length > 0) {
        console.log(`  ${key}: ${result.events.length} new events`);
      }
      return true;
    }
    throw new Error(`Repeated reorgs while fetching ${key}`);
  }

  async function track(address: string, isSeed: boolean): Promise<boolean> {
    if (!isSeed && knownSkipped.has(address)) {
      skipped.push({ address, reason: knownSkipped.get(address)! });
      return false;
    }
    // A discovered address without history yet gets a size check first, so a
    // busy exchange wallet does not pull in its whole history.
    const isNew = previous.cursors[queryKey("transfer-out", address)] === undefined;
    const cap = !isSeed && isNew ? config.follow.maxEventsPerAddress : undefined;
    for (const kind of ["transfer-out", "transfer-in", "mint", "burn"] as QueryKind[]) {
      const ok = await runQuery(kind, address, kind.startsWith("transfer") ? cap : undefined);
      if (!ok) {
        const reason = `more than ${config.follow.maxEventsPerAddress} ${kind} events`;
        console.log(`  skipping ${address}: ${reason}`);
        skipped.push({ address, reason });
        return false;
      }
    }
    tracked.add(address);
    return true;
  }

  let level = seeds;
  for (let depth = 0; level.length > 0; depth++) {
    console.log(`Depth ${depth}: ${level.length} addresses`);
    const added: string[] = [];
    for (const address of level) {
      if (tracked.has(address)) continue;
      if (await track(address, depth === 0)) added.push(address);
    }
    if (depth >= config.follow.maxDepth) break;
    const senders = new Set(added);
    level = discoverRecipients(
      transfers.filter((t) => senders.has(t.sender)),
      tracked,
      minMicro
    ).filter((a) => !ignore.has(a) && !tracked.has(a));
    for (const a of level) {
      if (!previous.tracked.includes(a)) console.log(`  discovered ${a}`);
    }
  }

  // Keep only data that concerns tracked addresses.
  transfers = transfers.filter((t) => tracked.has(t.sender) || tracked.has(t.recipient));
  supply = supply.filter((s) => tracked.has(s.address));

  console.log(`Fetching ${tracked.size} balances at height ${height}`);
  const balances: Record<string, string> = {};
  for (const address of tracked) {
    balances[address] = await fetchBalance(address, height);
  }

  const data: TransferData = {
    version: DATA_VERSION,
    generatedAt: new Date().toISOString(),
    height,
    startTime: config.startTime,
    tracked: Array.from(tracked),
    skipped,
    balances,
    transfers,
    supply,
    cursors,
  };
  writeFileSync(DATA_PATH, formatData(data));

  const contracts = data.tracked.filter(isContractPrincipal).length;
  console.log(
    `Wrote ${DATA_PATH}: ${data.tracked.length} tracked (${contracts} contracts), ` +
      `${skipped.length} skipped, ${transfers.length} transfers, ${supply.length} daily supply rows`
  );
  if (repairedEvents > 0) {
    console.log(`Repaired ${repairedEvents} events whose block_time Secondlayer returned as missing`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
