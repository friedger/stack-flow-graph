/**
 * Shape of src/data/transfers.json and the pure helpers used both by the
 * Secondlayer fetch script (scripts/fetch-transfers.ts) and by the app.
 *
 * This module must not import anything: Node runs the fetch script with
 * native type stripping, which cannot resolve Vite aliases.
 *
 * All amounts are micro-STX. They are stored as decimal strings and handled
 * as integer numbers (the total STX supply in micro-STX is far below 2^53).
 */

export const MICRO_STX_PER_STX = 1_000_000;
export const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

/** One stx_transfer event. `id` is unique per event, not per transaction. */
export interface TransferEvent {
  id: string; // `${txId}:${eventIndex}`
  txId: string;
  height: number;
  time: string; // ISO 8601 block time
  sender: string;
  recipient: string;
  amount: string; // micro-STX
}

/** stx_mint / stx_burn events of one address, summed per UTC day. */
export interface SupplyChange {
  address: string;
  kind: "mint" | "burn";
  day: string; // YYYY-MM-DD (UTC)
  firstHeight: number;
  lastTime: string; // ISO time of the last event of that day
  amount: string; // micro-STX, always positive
  count: number;
}

export interface TransferData {
  version: 1;
  generatedAt: string;
  /** Every event and balance in this file is as of this Stacks block height. */
  height: number;
  /** Events before this time are not stored. */
  startTime: string;
  /** Addresses whose complete STX history (from startTime) is stored. */
  tracked: string[];
  /** Addresses that qualified for tracking but were left out, with a reason. */
  skipped: Array<{ address: string; reason: string }>;
  /** On-chain STX balance (incl. locked) of every tracked address at `height`. */
  balances: Record<string, string>;
  transfers: TransferEvent[];
  supply: SupplyChange[];
  /** Highest fully processed block height per Secondlayer query key. */
  cursors: Record<string, number>;
}

export type QueryKind = "transfer-out" | "transfer-in" | "mint" | "burn";

export function queryKey(kind: QueryKind, address: string): string {
  return `${kind}:${address}`;
}

export function isContractPrincipal(address: string): boolean {
  return address.includes(".");
}

export function toMicro(amount: string | number): number {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`Invalid micro-STX amount: ${amount}`);
  }
  return n;
}

export function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

export function utcDayStart(timestamp: number): number {
  return Math.floor(timestamp / DAY_IN_MILLIS) * DAY_IN_MILLIS;
}

/**
 * Merge freshly fetched transfers into the stored list.
 * Stored events of `address` in `kind` direction at or above `fromHeight`
 * are replaced (that range was re-fetched, which also undoes reorged events).
 */
export function mergeTransfers(
  stored: TransferEvent[],
  fetched: TransferEvent[],
  kind: "transfer-out" | "transfer-in",
  address: string,
  fromHeight: number
): TransferEvent[] {
  const side = kind === "transfer-out" ? "sender" : "recipient";
  const kept = stored.filter(
    (e) => !(e[side] === address && e.height >= fromHeight)
  );
  const byId = new Map(kept.map((e) => [e.id, e]));
  for (const e of fetched) byId.set(e.id, e);
  return Array.from(byId.values()).sort(
    (a, b) => a.height - b.height || a.id.localeCompare(b.id)
  );
}

export interface RawSupplyEvent {
  height: number;
  time: string;
  amount: string;
}

/**
 * Merge fetched mint/burn events into the daily aggregates. Aggregates of
 * `address`/`kind` with `firstHeight >= fromHeight` are rebuilt from `fetched`.
 */
export function mergeSupply(
  stored: SupplyChange[],
  fetched: RawSupplyEvent[],
  kind: "mint" | "burn",
  address: string,
  fromHeight: number
): SupplyChange[] {
  const kept = stored.filter(
    (s) =>
      !(s.address === address && s.kind === kind && s.firstHeight >= fromHeight)
  );
  const days = new Map<string, SupplyChange>();
  for (const e of [...fetched].sort((a, b) => a.height - b.height)) {
    const day = utcDay(e.time);
    const agg = days.get(day);
    if (agg) {
      agg.amount = String(toMicro(agg.amount) + toMicro(e.amount));
      agg.count += 1;
      if (e.time > agg.lastTime) agg.lastTime = e.time;
    } else {
      days.set(day, {
        address,
        kind,
        day,
        firstHeight: e.height,
        lastTime: e.time,
        amount: String(toMicro(e.amount)),
        count: 1,
      });
    }
  }
  return [...kept, ...days.values()].sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      a.address.localeCompare(b.address) ||
      a.kind.localeCompare(b.kind)
  );
}

/**
 * Height to resume a mint/burn query from: the first block of the last stored
 * day, so that day is re-aggregated completely.
 */
export function supplyResumeHeight(
  stored: SupplyChange[],
  kind: "mint" | "burn",
  address: string,
  cursor: number | undefined
): number | undefined {
  if (cursor === undefined) return undefined;
  const own = stored.filter((s) => s.address === address && s.kind === kind);
  if (own.length === 0) return cursor + 1;
  const lastDay = own.reduce((a, b) => (a.day > b.day ? a : b));
  return Math.min(lastDay.firstHeight, cursor + 1);
}

/**
 * Untracked recipients that received at least `minMicro` in total from
 * tracked addresses. Contract principals are never followed.
 */
export function discoverRecipients(
  transfers: TransferEvent[],
  tracked: Set<string>,
  minMicro: number
): string[] {
  const totals = new Map<string, number>();
  for (const t of transfers) {
    if (!tracked.has(t.sender) || tracked.has(t.recipient)) continue;
    if (isContractPrincipal(t.recipient)) continue;
    totals.set(t.recipient, (totals.get(t.recipient) || 0) + toMicro(t.amount));
  }
  return Array.from(totals.entries())
    .filter(([, total]) => total >= minMicro)
    .sort((a, b) => b[1] - a[1])
    .map(([address]) => address);
}

/** Stacks 2.0 launch; any block time before it is a missing value. */
const MIN_VALID_BLOCK_TIME = Date.parse("2021-01-14T00:00:00.000Z");

/** Some indexed blocks carry a placeholder time (1970-01-01). */
export function hasValidBlockTime(time: string | null | undefined): boolean {
  const t = time ? Date.parse(time) : NaN;
  return Number.isFinite(t) && t >= MIN_VALID_BLOCK_TIME;
}

/**
 * Heights to look up exactly so every other height lies within `spacing`
 * blocks of an anchor: the first and last height and one per `spacing` run.
 */
export function pickAnchorHeights(heights: number[], spacing: number): number[] {
  const sorted = Array.from(new Set(heights)).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const anchors = [sorted[0]];
  for (const h of sorted) {
    if (h - anchors[anchors.length - 1] >= spacing) anchors.push(h);
  }
  const last = sorted[sorted.length - 1];
  if (anchors[anchors.length - 1] !== last) anchors.push(last);
  return anchors;
}

/** Linear interpolation of a block time (ms) between known anchors. */
export function interpolateBlockTime(
  height: number,
  anchors: Map<number, number>
): number {
  const exact = anchors.get(height);
  if (exact !== undefined) return exact;
  const sorted = Array.from(anchors.entries()).sort((a, b) => a[0] - b[0]);
  if (sorted.length === 0) throw new Error("No anchors to interpolate from");
  let before = sorted[0];
  let after = sorted[sorted.length - 1];
  for (const a of sorted) {
    if (a[0] <= height) before = a;
    if (a[0] >= height) {
      after = a;
      break;
    }
  }
  if (before[0] === after[0]) return before[1];
  const ratio = (height - before[0]) / (after[0] - before[0]);
  return Math.round(before[1] + ratio * (after[1] - before[1]));
}
