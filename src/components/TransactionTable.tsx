import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DAY_IN_MILLIS, Transaction } from "@/utils/parseTransactions";
import { getDayIndexAtTime } from "@/utils/timeSeries";

interface TransactionTableProps {
  transactions: Transaction[];
  currentTimestamp: number;
}

export function TransactionTable({ transactions, currentTimestamp}: TransactionTableProps) {
  // Filter transactions up to current timestamp and get last 20
  const visibleTransactions = transactions
    .filter((tx) => tx.timestamp <= currentTimestamp + DAY_IN_MILLIS)
    .slice(-20)
    .reverse();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  const formatAmount = (amount: number) => {
    return (amount / 1000000).toFixed(6);
  };

  const getExplorerAddressUrl = (address: string) => {
    return `https://explorer.hiro.so/address/${address}?chain=mainnet`;
  };

  const getExplorerTxUrl = (txId: string) => {
    return `https://explorer.hiro.so/txid/${txId}?chain=mainnet`;
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Transactions</h3>
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Amount (M STX)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No transactions yet
                </TableCell>
              </TableRow>
            ) : (
              visibleTransactions.map((tx, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-xs">
                    <a
                      href={getExplorerTxUrl(tx.txId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {formatDate(tx.timestamp)}
                    </a>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <a
                      href={getExplorerAddressUrl(tx.sender)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      {formatAddress(tx.sender)}
                    </a>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <a
                      href={getExplorerAddressUrl(tx.recipient)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20"
                    >
                      {formatAddress(tx.recipient)}
                    </a>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(tx.amount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-right">Showing last 20 transactions</div>
    </Card>
  );
}
