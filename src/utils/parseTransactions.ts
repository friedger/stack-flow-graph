import {
  DAY_IN_MILLIS,
  MICRO_STX_PER_STX,
  TransferData,
  TransferEvent,
  toMicro,
  utcDayStart,
} from "./transferData";

export { DAY_IN_MILLIS };

export interface Transaction {
  /** Unique per transfer event: `${txId}:${eventIndex}` */
  id: string;
  date: Date;
  timestamp: number;
  sender: string;
  recipient: string;
  /** STX */
  amount: number;
  amountMicro: number;
  type: "send" | "receive";
  /** The tracked side of the transfer */
  ownerAddress: string;
  txId: string;
}

export interface NetworkNode {
  id: string;
  balance: number;
  sent: number;
  received: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  value: number;
}

/** Balances (STX) at the end of each day group, keyed by the group's timestamp. */
export type TimeSeries = Map<number, Map<string, number>>;

/** A change of one address's balance, in micro-STX. */
export interface BalanceDelta {
  timestamp: number;
  address: string;
  delta: number;
}

export const MIN_STX_THRESHOLD = 100000;
const MIN_TRANSACTION_AMOUNT = 10; // Minimum transaction amount in STX shown in lists
export const SIP_031_ADDRESS = "SP000000000000000000002Q6VF78.sip-031";

export function isSIP031Address(address: string): boolean {
  return address === SIP_031_ADDRESS;
}

export function shouldIncludeTransaction(amount: number): boolean {
  return amount > MIN_TRANSACTION_AMOUNT;
}

export function toTransaction(
  event: TransferEvent,
  tracked: Set<string>
): Transaction {
  const timestamp = Date.parse(event.time);
  const amountMicro = toMicro(event.amount);
  const senderTracked = tracked.has(event.sender);
  return {
    id: event.id,
    date: new Date(timestamp),
    timestamp,
    sender: event.sender,
    recipient: event.recipient,
    amount: amountMicro / MICRO_STX_PER_STX,
    amountMicro,
    type: senderTracked ? "send" : "receive",
    ownerAddress: senderTracked ? event.sender : event.recipient,
    txId: event.txId,
  };
}

/** All transfers of the data file, oldest first. */
export function parseTransferData(data: TransferData): Transaction[] {
  const tracked = new Set(data.tracked);
  return data.transfers
    .map((e) => toTransaction(e, tracked))
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}

/** Every balance change: both sides of each transfer, plus mints and burns. */
export function calculateBalanceDeltas(
  transactions: Transaction[],
  supply: TransferData["supply"]
): BalanceDelta[] {
  const deltas: BalanceDelta[] = [];
  for (const tx of transactions) {
    deltas.push({ timestamp: tx.timestamp, address: tx.sender, delta: -tx.amountMicro });
    deltas.push({ timestamp: tx.timestamp, address: tx.recipient, delta: tx.amountMicro });
  }
  for (const s of supply) {
    const amount = toMicro(s.amount);
    deltas.push({
      timestamp: Date.parse(s.lastTime),
      address: s.address,
      delta: s.kind === "mint" ? amount : -amount,
    });
  }
  return deltas.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Balance (micro-STX) of each tracked address at the start of the data window:
 * its on-chain balance at `data.height` minus every recorded change.
 * Whatever is not an event (fees, history before startTime) ends up here,
 * so reconstructed balances match the chain at the end of the window.
 */
export function calculateOpeningBalances(
  data: TransferData,
  deltas: BalanceDelta[]
): Map<string, number> {
  const opening = new Map<string, number>();
  for (const address of data.tracked) {
    const balance = data.balances[address];
    if (balance !== undefined) opening.set(address, toMicro(balance));
  }
  for (const d of deltas) {
    if (opening.has(d.address)) {
      opening.set(d.address, opening.get(d.address) - d.delta);
    }
  }
  return opening;
}

export function calculateNetworkData(transactions: Transaction[]) {
  const addressTotals: Record<string, { sent: number; received: number }> = {};
  const links: Record<string, number> = {};

  transactions.forEach((tx) => {
    if (!addressTotals[tx.sender])
      addressTotals[tx.sender] = { sent: 0, received: 0 };
    addressTotals[tx.sender].sent += tx.amountMicro;

    if (!addressTotals[tx.recipient])
      addressTotals[tx.recipient] = { sent: 0, received: 0 };
    addressTotals[tx.recipient].received += tx.amountMicro;

    const linkKey = `${tx.sender}->${tx.recipient}`;
    links[linkKey] = (links[linkKey] || 0) + tx.amountMicro;
  });

  const minMicro = MIN_STX_THRESHOLD * MICRO_STX_PER_STX;
  const filteredAddresses = Object.entries(addressTotals)
    .filter(([_, data]) => data.sent + data.received >= minMicro)
    .map(([address]) => address);
  const filteredAddressSet = new Set(filteredAddresses);

  const nodes: NetworkNode[] = filteredAddresses.map((address) => {
    const data = addressTotals[address];
    return {
      id: address,
      balance: (data.received - data.sent) / MICRO_STX_PER_STX,
      sent: data.sent / MICRO_STX_PER_STX,
      received: data.received / MICRO_STX_PER_STX,
    };
  });

  const networkLinks: NetworkLink[] = [];
  Object.entries(links).forEach(([key, value]) => {
    const [source, target] = key.split("->");
    if (filteredAddressSet.has(source) && filteredAddressSet.has(target)) {
      networkLinks.push({ source, target, value: value / MICRO_STX_PER_STX });
    }
  });

  return { nodes, links: networkLinks };
}

/**
 * Day groups: the UTC day before the first transaction (the starting state),
 * then the start of every UTC day with at least one transaction.
 */
export function calculateDayGroups(transactions: Transaction[]): number[] {
  if (transactions.length === 0) return [];
  const days = new Set(transactions.map((tx) => utcDayStart(tx.timestamp)));
  const sorted = Array.from(days).sort((a, b) => a - b);
  return [sorted[0] - DAY_IN_MILLIS, ...sorted];
}

/**
 * Balances (STX) of `nodeAddresses` at the end of each day group.
 * A group's snapshot includes every change before the next group starts;
 * the last snapshot includes all changes.
 */
export function calculateGroupBalances(
  groups: number[],
  deltas: BalanceDelta[],
  nodeAddresses: Set<string>,
  openingBalances: Map<string, number> = new Map()
): TimeSeries {
  const timeSeries: TimeSeries = new Map();
  const balances = new Map<string, number>();
  nodeAddresses.forEach((addr) => balances.set(addr, openingBalances.get(addr) || 0));

  const sorted = [...deltas].sort((a, b) => a.timestamp - b.timestamp);
  let i = 0;
  groups.forEach((group, index) => {
    const end = index + 1 < groups.length ? groups[index + 1] : Infinity;
    for (; i < sorted.length && sorted[i].timestamp < end; i++) {
      const d = sorted[i];
      if (balances.has(d.address)) {
        balances.set(d.address, balances.get(d.address) + d.delta);
      }
    }
    const snapshot = new Map<string, number>();
    balances.forEach((micro, addr) => snapshot.set(addr, micro / MICRO_STX_PER_STX));
    timeSeries.set(group, snapshot);
  });
  return timeSeries;
}
