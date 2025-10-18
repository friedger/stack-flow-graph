import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadDataFromFiles } from "@/utils/loadData";
import { Transaction } from "@/utils/parseTransactions";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TransactionsPage = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { orderedTransactions } = await loadDataFromFiles();
        setTransactions(orderedTransactions);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
    return amount.toLocaleString("en-US", {
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              All Transactions
            </h1>
            <p className="text-muted-foreground">
              {transactions.length} transactions in total
            </p>
          </div>
        </div>

        <Card className="p-6 bg-card border-border">
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Timestamp</TableHead>
                  <TableHead className="w-40">From</TableHead>
                  <TableHead className="w-40">To</TableHead>
                  <TableHead className="text-right w-32">Amount (STX)</TableHead>
                  <TableHead className="w-20">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, idx) => (
                  <TableRow key={idx} className="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-sm py-3">
                      {formatDate(tx.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-xs py-3">
                      <a
                        href={getExplorerAddressUrl(tx.sender)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                      >
                        {formatAddress(tx.sender)}
                      </a>
                    </TableCell>
                    <TableCell className="font-mono text-xs py-3">
                      <a
                        href={getExplorerAddressUrl(tx.recipient)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20"
                      >
                        {formatAddress(tx.recipient)}
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-mono text-base font-semibold py-3">
                      {formatAmount(tx.amount)}
                    </TableCell>
                    <TableCell className="py-3">
                      <a
                        href={getExplorerTxUrl(tx.txId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TransactionsPage;
