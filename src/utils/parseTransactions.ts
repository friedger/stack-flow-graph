export interface Transaction {
  date: Date;
  timestamp: number;
  sender: string;
  recipient: string;
  amount: number;
  type: "send" | "receive";
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

export interface TimeSeriesBalance {
  timestamp: number;
  address: string;
  balance: number;
}
export type TimeSeries = Map<number, Map<string, number>>;

const MIN_STX_THRESHOLD = 100000;
const MIN_TRANSACTION_AMOUNT = 10; // Minimum transaction amount in STX
export const SEPT_15_START = new Date("2025-09-15T00:00:00Z").getTime();
export const DAILY_REWARD = 68400;
export const SIP_031_ADDRESS = "SP000000000000000000002Q6VF78.sip-031";
export const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

export function isSIP031Address(address: string): boolean {
  return address.startsWith("SP000") && address.includes(".sip-031");
}

export function shouldIncludeTransaction(amount: number): boolean {
  return amount > MIN_TRANSACTION_AMOUNT;
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export async function parseTransactionData(
  csvFiles: Array<{ name: string; content: string }>
) {
  const allTransactions: Transaction[] = [];

  for (const file of csvFiles) {
    const ownerAddress = file.name
      .replace("transactions-", "")
      .replace(".csv", "");
    const lines = file.content.split("\n");

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = parseCSVLine(line);

      const inSymbol = fields[2];
      const inAmount = parseFloat(fields[3] || "0");
      const outSymbol = fields[4];
      const outAmount = parseFloat(fields[5] || "0");
      const sender = fields[16];
      const recipient = fields[17];
      const burnDate = fields[1];
      const txId = fields[12];

      // Only process STX transactions
      if (inSymbol === "STX" && inAmount > 0 && sender) {
        allTransactions.push({
          date: new Date(burnDate),
          timestamp: new Date(burnDate).getTime(),
          sender: sender,
          recipient: ownerAddress,
          amount: inAmount,
          type: "receive",
          ownerAddress,
          txId,
        });
      }

      if (outSymbol === "STX" && outAmount > 0 && recipient) {
        allTransactions.push({
          date: new Date(burnDate),
          timestamp: new Date(burnDate).getTime(),
          sender: ownerAddress,
          recipient: recipient,
          amount: outAmount,
          type: "send",
          ownerAddress,
          txId,
        });
      }
    }
  }
  return allTransactions
    .filter(
      (t) => t.timestamp > SEPT_15_START && shouldIncludeTransaction(t.amount)
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function calculateNetworkData(transactions: Transaction[]) {
  const addressTotals: Record<string, { sent: number; received: number }> = {};
  const links: Record<string, number> = {};

  // Calculate totals
  transactions.forEach((tx) => {
    // Track sender
    if (!addressTotals[tx.sender])
      addressTotals[tx.sender] = { sent: 0, received: 0 };
    addressTotals[tx.sender].sent += tx.amount;

    // Track recipient
    if (!addressTotals[tx.recipient])
      addressTotals[tx.recipient] = { sent: 0, received: 0 };
    addressTotals[tx.recipient].received += tx.amount;

    // Track link
    const linkKey = `${tx.sender}->${tx.recipient}`;
    links[linkKey] = (links[linkKey] || 0) + tx.amount;
  });

  // Filter addresses by threshold
  const filteredAddresses = Object.entries(addressTotals)
    .filter(([_, data]) => data.sent + data.received >= MIN_STX_THRESHOLD)
    .map(([address]) => address);

  const filteredAddressSet: Record<string, boolean> = {};
  filteredAddresses.forEach((addr) => (filteredAddressSet[addr] = true));

  // Create nodes
  const nodes: NetworkNode[] = filteredAddresses.map((address) => {
    const data = addressTotals[address]!;
    return {
      id: address,
      balance: data.received - data.sent,
      sent: data.sent,
      received: data.received,
    };
  });

  // Create links (only between filtered addresses)
  const networkLinks: NetworkLink[] = [];
  Object.entries(links).forEach(([key, value]) => {
    const [source, target] = key.split("->");
    if (filteredAddressSet[source] && filteredAddressSet[target]) {
      networkLinks.push({ source, target, value });
    }
  });

  return { nodes, links: networkLinks };
}

export function calculateGroupBalances(
  orderedTransactions: Transaction[],
  nodeAddresses: Set<string>,
  initialBalances?: Map<string, number>
): TimeSeries {
  const timeSeriesData: TimeSeries = new Map();
  let previousTimestamp = orderedTransactions[0].timestamp - DAY_IN_MILLIS;

  // Initialize balances (with initial balances if provided)
  let balances: Map<string, number> = new Map<string, number>();
  nodeAddresses.forEach((addr) => {
    balances.set(addr, initialBalances?.get(addr) || 0);
  });

  // Process transactions chronologically
  orderedTransactions.forEach((tx) => {
    const newGroup = tx.timestamp >= previousTimestamp + DAY_IN_MILLIS;
    console.log("new group", newGroup, tx.timestamp);
    if (newGroup) {
      // Snapshot all balances at previous timestamp
      nodeAddresses.forEach((addr) => {
        let balance = balances.get(addr) || 0;

        // Add daily rewards for sip-031 contract
        // only add dailyRewards for the first tx of the day
        if (addr === SIP_031_ADDRESS && previousTimestamp > SEPT_15_START) {
          const daysSinceSept17 = Math.floor(
            (previousTimestamp - SEPT_15_START) / DAY_IN_MILLIS
          );
          balance += daysSinceSept17 * DAILY_REWARD;
        }
        balances.set(addr, balance);
      });
      // Save snapshot
      timeSeriesData.set(previousTimestamp, balances);
      console.log(previousTimestamp, balances);
      balances = new Map(balances.entries());
      previousTimestamp = tx.timestamp;
    }

    // update balances for sender and receiver
    if (nodeAddresses.has(tx.sender)) {
      const current = balances.get(tx.sender) || 0;
      balances.set(tx.sender, current - tx.amount);
    }

    if (nodeAddresses.has(tx.recipient)) {
      const current = balances.get(tx.recipient) || 0;
      balances.set(tx.recipient, current + tx.amount);
    }
  });

  // Snapshot all balances at this timestamp
  nodeAddresses.forEach((addr) => {
    let balance = balances.get(addr) || 0;

    // Add daily rewards for sip-031 contract
    // only add dailyRewards for the first tx of the day
    if (addr === SIP_031_ADDRESS && previousTimestamp > SEPT_15_START) {
      const daysSinceSept17 = Math.floor(
        (previousTimestamp - SEPT_15_START) / DAY_IN_MILLIS
      );
      balance += daysSinceSept17 * DAILY_REWARD;
    }
    balances.set(addr, balance);
  });
  timeSeriesData.set(previousTimestamp, balances);

  return timeSeriesData;
}
