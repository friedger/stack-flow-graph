import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SEO } from "@/components/SEO";
import { loadDataFromFiles } from "@/utils/loadData";
import { Transaction } from "@/utils/parseTransactions";
import { formatDate, formatAmount } from "@/utils/formatters";
import { AddressLink } from "@/components/AddressLink";
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
        // Sort transactions from newest to oldest
        const sortedTransactions = [...orderedTransactions].sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(sortedTransactions);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
    <>
      <SEO 
        title={`All Transactions - ${transactions.length} STX Transfers | Stacks Endowment Visualizer`}
        description={`Browse complete transaction history with ${transactions.length} STX transfers from the SIP-031 endowment program. View detailed records including timestamps, amounts, and blockchain explorer links.`}
        image="/og-transactions.png"
        url="https://sip-031.fastpool.org/transactions"
      />
      <div className="min-h-screen bg-background p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center gap-3 md:gap-4">
          <Link to="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              All Transactions
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {transactions.length} transactions in total
            </p>
          </div>
        </div>

        <Card className="p-3 sm:p-4 md:p-6 bg-card border-border">
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px] sm:min-w-[160px] md:w-48 whitespace-nowrap">Timestamp</TableHead>
                  <TableHead className="min-w-[120px] sm:min-w-[140px] md:w-40">From</TableHead>
                  <TableHead className="min-w-[120px] sm:min-w-[140px] md:w-40">To</TableHead>
                  <TableHead className="text-right min-w-[100px] sm:min-w-[120px] md:w-32 whitespace-nowrap">Amount</TableHead>
                  <TableHead className="min-w-[60px] md:w-20">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, idx) => (
                  <TableRow key={idx} className="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-[10px] sm:text-xs md:text-sm py-2 sm:py-3">
                      {formatDate(tx.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] sm:text-xs py-2 sm:py-3">
                      <AddressLink address={tx.sender} variant="primary" />
                    </TableCell>
                    <TableCell className="font-mono text-[10px] sm:text-xs py-2 sm:py-3">
                      <AddressLink address={tx.recipient} variant="accent" />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm md:text-base font-semibold py-2 sm:py-3">
                      {formatAmount(tx.amount)}
                    </TableCell>
                    <TableCell className="py-2 sm:py-3">
                      <a
                        href={getExplorerTxUrl(tx.txId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                      >
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
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
    </>
  );
};

export default TransactionsPage;
