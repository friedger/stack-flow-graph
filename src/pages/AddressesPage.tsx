import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadDataFromFiles } from "@/utils/loadData";
import { NetworkNode } from "@/utils/parseTransactions";
import { Loader2, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AddressesPage = () => {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { networkData } = await loadDataFromFiles();
        setNodes(networkData.nodes);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatAddress = (address: string) => {
    return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Loading addresses...</p>
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
              All Addresses
            </h1>
            <p className="text-muted-foreground">
              {nodes.length} addresses with ≥100,000 STX total volume
            </p>
          </div>
        </div>

        <Card className="p-6 bg-card border-border">
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-80">Address</TableHead>
                  <TableHead className="text-right w-40">Received (STX)</TableHead>
                  <TableHead className="text-right w-40">Sent (STX)</TableHead>
                  <TableHead className="text-right w-40">Balance (STX)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node, idx) => (
                  <TableRow key={idx} className="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs py-3">
                      <a
                        href={getExplorerAddressUrl(node.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                      >
                        {formatAddress(node.id)}
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-mono text-base py-3">
                      {formatAmount(node.received)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-base py-3">
                      {formatAmount(node.sent)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-base font-semibold py-3 ${
                      node.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatAmount(node.balance)}
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

export default AddressesPage;
