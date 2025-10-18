import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DAY_IN_MILLIS, Transaction } from "@/utils/parseTransactions";
import { getDayIndexAtTime } from "@/utils/timeSeries";
import { ExternalLink } from "lucide-react";

interface TransactionTableProps {
  transactions: Transaction[];
  currentTimestamp: number;
  dayGroups: number[];
}

type AggregatedTransaction = Transaction & { 
  txIds: string[];
  txDetails: Array<{ txId: string; amount: number; timestamp: number }>;
};

export function TransactionTable({ transactions, currentTimestamp, dayGroups }: TransactionTableProps) {
  // Filter transactions up to current timestamp
  const filteredTransactions = transactions
    .filter((tx) => tx.timestamp < currentTimestamp + DAY_IN_MILLIS);

  // Group transactions by day
  const groupedByDay = new Map<number, Transaction[]>();
  filteredTransactions.forEach(tx => {
    const dayIndex = getDayIndexAtTime(dayGroups, tx.timestamp);
    if (!groupedByDay.has(dayIndex)) {
      groupedByDay.set(dayIndex, []);
    }
    groupedByDay.get(dayIndex)!.push(tx);
  });

  // Aggregate transactions by sender-receiver pairs within each day
  const aggregatedByDay = new Map<number, AggregatedTransaction[]>();
  groupedByDay.forEach((dayTxs, dayIndex) => {
    const pairMap = new Map<string, AggregatedTransaction>();
    
    dayTxs.forEach(tx => {
      const pairKey = `${tx.sender}-${tx.recipient}`;
      
      if (pairMap.has(pairKey)) {
        // Sum amounts for the same pair and collect transaction details
        const existing = pairMap.get(pairKey)!;
        existing.amount += tx.amount;
        existing.txIds.push(tx.txId);
        existing.txDetails.push({ txId: tx.txId, amount: tx.amount, timestamp: tx.timestamp });
      } else {
        // Create a copy with transaction details
        pairMap.set(pairKey, { 
          ...tx, 
          txIds: [tx.txId],
          txDetails: [{ txId: tx.txId, amount: tx.amount, timestamp: tx.timestamp }]
        });
      }
    });
    
    aggregatedByDay.set(dayIndex, Array.from(pairMap.values()));
  });

  // Flatten all aggregated transactions and take last 20
  const allAggregated = Array.from(aggregatedByDay.entries())
    .sort(([dayA], [dayB]) => dayA - dayB) // Sort by day ascending
    .flatMap(([dayIndex, txs]) => txs.map(tx => ({ dayIndex, tx })))
    .slice(-20)
    .reverse();

  // Re-group for display
  const groupedTransactions = new Map<number, AggregatedTransaction[]>();
  allAggregated.forEach(({ dayIndex, tx }) => {
    if (!groupedTransactions.has(dayIndex)) {
      groupedTransactions.set(dayIndex, []);
    }
    groupedTransactions.get(dayIndex)!.push(tx);
  });

  // Sort by day index (descending - most recent first)
  const sortedDays = Array.from(groupedTransactions.keys()).sort((a, b) => b - a);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDayHeader = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  const formatAmount = (amount: number) => {
    return (amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getExplorerAddressUrl = (address: string) => {
    return `https://explorer.hiro.so/address/${address}?chain=mainnet`;
  };

  const getExplorerTxUrl = (txId: string) => {
    return `https://explorer.hiro.so/txid/${txId}?chain=mainnet`;
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
        <div className="text-sm text-muted-foreground">
          Current time: {formatDate(currentTimestamp)}
        </div>
      </div>
      
      {allAggregated.length === 0 ? (
        <div className="rounded-md border border-border p-8 text-center text-muted-foreground">
          No transactions yet
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDays.map(dayIndex => {
            const dayTransactions = groupedTransactions.get(dayIndex)!;
            const dayStart = dayGroups[dayIndex];
            
            return (
              <div key={dayIndex} className="rounded-md border border-border overflow-hidden">
                <div className="bg-muted px-4 py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {formatDate(dayStart)} (+24h)
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {dayTransactions.length} {dayTransactions.length === 1 ? 'transaction' : 'transactions'}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right w-32">Amount (STX)</TableHead>
                      <TableHead className="w-40">From</TableHead>
                      <TableHead className="w-40">To</TableHead>
                      <TableHead className="w-48">Transactions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayTransactions.map((tx, idx) => (
                      <TableRow key={idx} className="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                        <TableCell className="text-right font-mono text-base font-semibold py-3 w-32">
                          {formatAmount(tx.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-xs py-3 w-40">
                          <a
                            href={getExplorerAddressUrl(tx.sender)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                          >
                            {formatAddress(tx.sender)}
                          </a>
                        </TableCell>
                        <TableCell className="font-mono text-xs py-3 w-40">
                          <a
                            href={getExplorerAddressUrl(tx.recipient)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20"
                          >
                            {formatAddress(tx.recipient)}
                          </a>
                        </TableCell>
                        <TableCell className="py-3 w-48">
                          <div className="flex gap-1.5 flex-wrap">
                            {tx.txDetails.map((detail, i) => (
                              <a
                                key={i}
                                href={getExplorerTxUrl(detail.txId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-7 h-7 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                                title={`${formatAmount(detail.amount)} STX\n${formatDate(detail.timestamp)}`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-2 text-xs text-muted-foreground text-right">
        Showing last 20 aggregated transactions (grouped by sender-receiver pairs)
      </div>
    </Card>
  );
}
