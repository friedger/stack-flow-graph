export interface Transaction {
  date: Date;
  timestamp: number;
  sender: string;
  recipient: string;
  amount: number;
  type: 'send' | 'receive';
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

const MIN_STX_THRESHOLD = 100000;

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export async function parseTransactionData(csvFiles: Array<{ name: string; content: string }>) {
  const allTransactions: Transaction[] = [];
  
  for (const file of csvFiles) {
    const ownerAddress = file.name.replace('transactions-', '').replace('.csv', '');
    const lines = file.content.split('\n');
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const fields = parseCSVLine(line);
      
      const inSymbol = fields[2];
      const inAmount = parseFloat(fields[3] || '0');
      const outSymbol = fields[4];
      const outAmount = parseFloat(fields[5] || '0');
      const sender = fields[16];
      const recipient = fields[17];
      const burnDate = fields[1];
      const txId = fields[12];
      
      // Only process STX transactions
      if (inSymbol === 'STX' && inAmount > 0 && sender) {
        allTransactions.push({
          date: new Date(burnDate),
          timestamp: new Date(burnDate).getTime(),
          sender: sender,
          recipient: ownerAddress,
          amount: inAmount,
          type: 'receive',
          ownerAddress,
          txId
        });
      }
      
      if (outSymbol === 'STX' && outAmount > 0 && recipient) {
        allTransactions.push({
          date: new Date(burnDate),
          timestamp: new Date(burnDate).getTime(),
          sender: ownerAddress,
          recipient: recipient,
          amount: outAmount,
          type: 'send',
          ownerAddress,
          txId
        });
      }
    }
  }
  
  return allTransactions.sort((a, b) => a.timestamp - b.timestamp);
}

export function calculateNetworkData(transactions: Transaction[]) {
  const addressTotals = new Map<string, { sent: number; received: number }>();
  const links = new Map<string, number>();
  
  // Calculate totals
  transactions.forEach(tx => {
    // Track sender
    const senderData = addressTotals.get(tx.sender) || { sent: 0, received: 0 };
    senderData.sent += tx.amount;
    addressTotals.set(tx.sender, senderData);
    
    // Track recipient
    const recipientData = addressTotals.get(tx.recipient) || { sent: 0, received: 0 };
    recipientData.received += tx.amount;
    addressTotals.set(tx.recipient, recipientData);
    
    // Track link
    const linkKey = `${tx.sender}->${tx.recipient}`;
    links.set(linkKey, (links.get(linkKey) || 0) + tx.amount);
  });
  
  // Filter addresses by threshold
  const filteredAddresses = Array.from(addressTotals.entries())
    .filter(([_, data]) => (data.sent + data.received) >= MIN_STX_THRESHOLD)
    .map(([address]) => address);
  
  const filteredAddressSet = new Set(filteredAddresses);
  
  // Create nodes
  const nodes: NetworkNode[] = filteredAddresses.map(address => {
    const data = addressTotals.get(address)!;
    return {
      id: address,
      balance: data.received - data.sent,
      sent: data.sent,
      received: data.received
    };
  });
  
  // Create links (only between filtered addresses)
  const networkLinks: NetworkLink[] = [];
  links.forEach((value, key) => {
    const [source, target] = key.split('->');
    if (filteredAddressSet.has(source) && filteredAddressSet.has(target)) {
      networkLinks.push({ source, target, value });
    }
  });
  
  return { nodes, links: networkLinks };
}

export function calculateTimeSeriesBalances(
  transactions: Transaction[],
  filteredAddresses: Set<string>,
  initialBalances?: Map<string, number>
): TimeSeriesBalance[] {
  const balances = new Map<string, number>();
  const timeSeriesData: TimeSeriesBalance[] = [];
  
  // Initialize balances (with initial balances if provided)
  filteredAddresses.forEach(addr => {
    balances.set(addr, initialBalances?.get(addr) || 0);
  });
  
  // Find sip-031 contract address for daily rewards
  const sip031Address = Array.from(filteredAddresses).find(addr => 
    addr.startsWith('SP000') && addr.includes('.sip-031')
  );
  const sept17Start = new Date('2025-09-17T00:00:00Z').getTime();
  const dailyReward = 68400;
  
  // Process transactions chronologically
  transactions.forEach(tx => {
    if (filteredAddresses.has(tx.sender)) {
      const current = balances.get(tx.sender) || 0;
      balances.set(tx.sender, current - tx.amount);
    }
    
    if (filteredAddresses.has(tx.recipient)) {
      const current = balances.get(tx.recipient) || 0;
      balances.set(tx.recipient, current + tx.amount);
    }
    
    // Snapshot all balances at this timestamp
    filteredAddresses.forEach(addr => {
      let balance = balances.get(addr) || 0;
      
      // Add daily rewards for sip-031 contract
      if (addr === sip031Address && tx.timestamp > sept17Start) {
        const daysSinceSept17 = Math.floor((tx.timestamp - sept17Start) / (24 * 60 * 60 * 1000));
        balance += daysSinceSept17 * dailyReward;
      }
      
      timeSeriesData.push({
        timestamp: tx.timestamp,
        address: addr,
        balance: balance
      });
    });
  });
  
  return timeSeriesData;
}
