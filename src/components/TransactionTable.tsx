import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DAY_IN_MILLIS, Transaction } from "@/utils/parseTransactions";
import { getDayIndexAtTime } from "@/utils/timeSeries";
import { formatDate, formatDayOnly, formatAddress, formatAmount, isContractAddress } from "@/utils/formatters";
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

  const getExplorerAddressUrl = (address: string) => {
    return `https://explorer.hiro.so/address/${address}?chain=mainnet`;
  };

  const getExplorerTxUrl = (txId: string) => {
    return `https://explorer.hiro.so/txid/${txId}?chain=mainnet`;
  };

  return (
    <Card className="p-4 sm:p-5 md:p-6 bg-card border-border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 md:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Recent Transactions</h3>
        <div className="text-xs sm:text-sm text-muted-foreground">
          <span className="hidden sm:inline">Current time: {formatDate(currentTimestamp)}</span>
          <span className="sm:hidden">{formatDayOnly(currentTimestamp)}</span>
        </div>
      </div>
      
      {allAggregated.length === 0 ? (
        <div className="rounded-md border border-border p-6 sm:p-8 text-center text-sm text-muted-foreground">
          No transactions yet
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right min-w-[100px] sm:min-w-[120px] md:w-32 whitespace-nowrap">Amount</TableHead>
                <TableHead className="min-w-[120px] sm:min-w-[140px] md:w-40">From</TableHead>
                <TableHead className="min-w-[120px] sm:min-w-[140px] md:w-40">To</TableHead>
                <TableHead className="min-w-[140px] sm:min-w-[160px] md:w-48">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDays.map((dayIndex, dayIdx) => {
                const dayTransactions = groupedTransactions.get(dayIndex)!;
                const dayStart = dayGroups[dayIndex];
                
                return (
                  <>
                    <TableRow key={`day-${dayIndex}`} className="bg-muted hover:bg-muted">
                      <TableCell colSpan={4} className="py-2 text-center text-xs sm:text-sm font-semibold text-foreground">
                        {formatDayOnly(dayStart)} (+24h)
                      </TableCell>
                    </TableRow>
                    {dayTransactions.map((tx, idx) => (
                      <TableRow key={`${dayIndex}-${idx}`} className="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                        <TableCell className="text-right font-mono text-xs sm:text-sm md:text-base font-semibold py-2 sm:py-3">
                          {formatAmount(tx.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] sm:text-xs py-2 sm:py-3">
                          <a
                            href={getExplorerAddressUrl(tx.sender)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-colors border ${
                              isContractAddress(tx.sender)
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border-purple-500/20"
                                : "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                            }`}
                          >
                            {formatAddress(tx.sender)}
                          </a>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] sm:text-xs py-2 sm:py-3">
                          <a
                            href={getExplorerAddressUrl(tx.recipient)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-colors border ${
                              isContractAddress(tx.recipient)
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border-purple-500/20"
                                : "bg-accent/10 text-accent hover:bg-accent/20 border-accent/20"
                            }`}
                          >
                            {formatAddress(tx.recipient)}
                          </a>
                        </TableCell>
                        <TableCell className="py-2 sm:py-3">
                          <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                            {tx.txDetails.map((detail, i) => (
                              <a
                                key={i}
                                href={getExplorerTxUrl(detail.txId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                                title={`${formatAmount(detail.amount)} STX\n${formatDate(detail.timestamp)}`}
                              >
                                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </a>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      
      <div className="mt-2 text-[10px] sm:text-xs text-muted-foreground text-center sm:text-right">
        Showing last 20 aggregated transactions (grouped by sender-receiver pairs)
      </div>
    </Card>
  );
}
