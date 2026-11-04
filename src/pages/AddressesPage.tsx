import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEO } from "@/components/SEO";
import { loadDataFromFiles } from "@/utils/loadData";
import { NetworkNode } from "@/utils/parseTransactions";
import { AddressSummary } from "@/utils/loadData";
import { formatAmount } from "@/utils/formatters";
import { AddressLink } from "@/components/AddressLink";
import { getAddressComment } from "@/data/addressComments";
import { LoaderCircle, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type AddressData = NetworkNode & AddressSummary;

const AddressesPage = () => {
  const [loading, setLoading] = useState(true);
  const [addressData, setAddressData] = useState<AddressData[]>([]);
  const [dataHeight, setDataHeight] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          networkData: { nodes },
          addressSummaries,
          dataHeight,
        } = await loadDataFromFiles();
        setDataHeight(dataHeight);
        setAddressData(
          nodes.map((node) => ({ ...node, ...addressSummaries.get(node.id) }))
        );
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  // Totals for displayed addresses; "minted" is net of burns
  const displayedTotals = addressData.reduce(
    (acc, addr) => ({
      opening: acc.opening + addr.opening,
      minted: acc.minted + addr.minted - addr.burned,
      received: acc.received + addr.received,
      sent: acc.sent + addr.sent,
      finalBalance: acc.finalBalance + addr.finalBalance,
    }),
    { opening: 0, minted: 0, received: 0, sent: 0, finalBalance: 0 }
  );

  // Transfers between displayed and low volume addresses.
  // Total sent must equal total received across all addresses.
  const netDifference = displayedTotals.sent - displayedTotals.received;
  const lowVolumeReceived = netDifference > 0 ? netDifference : 0;
  const lowVolumeSent = netDifference < 0 ? -netDifference : 0;
  const lowVolumeFinalBalance = lowVolumeReceived - lowVolumeSent;

  const grandTotals = {
    opening: displayedTotals.opening,
    minted: displayedTotals.minted,
    received: displayedTotals.received + lowVolumeReceived,
    sent: displayedTotals.sent + lowVolumeSent,
    finalBalance: displayedTotals.finalBalance + lowVolumeFinalBalance,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Loading addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`All Addresses - Track ${addressData.length}+ STX Balances | Stacks Endowment Visualizer`}
        description={`Monitor STX balances across ${addressData.length}+ addresses in the SIP-031 endowment network. View detailed breakdowns of minted, received, and sent tokens with real-time balance tracking.`}
        image="/og-addresses.png"
        url="https://sip-031.fastpool.org/addresses"
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-linear-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              All Addresses
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {addressData.length} addresses with ≥100,000 STX total volume
            </p>
          </div>
        </div>

        <Card className="p-3 sm:p-4 md:p-6 bg-card border-border">
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px] sm:min-w-[220px] md:w-64">Address</TableHead>
                  <TableHead className="min-w-[120px] sm:min-w-[150px]">Comment</TableHead>
                  <TableHead className="text-right min-w-[100px] sm:min-w-[120px] md:w-36 whitespace-nowrap">
                    Opening
                  </TableHead>
                  <TableHead className="text-right min-w-[100px] sm:min-w-[120px] md:w-36 whitespace-nowrap">
                    Minted
                  </TableHead>
                  <TableHead className="text-right min-w-[100px] sm:min-w-[120px] md:w-36 whitespace-nowrap">
                    Received
                  </TableHead>
                  <TableHead className="text-right min-w-[100px] sm:min-w-[120px] md:w-36 whitespace-nowrap">Sent</TableHead>
                  <TableHead className="text-right min-w-[120px] sm:min-w-[140px] md:w-36 whitespace-nowrap">
                    Final Balance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addressData.map((addr, idx) => (
                  <TableRow
                    key={idx}
                    className="even:bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-mono text-[10px] sm:text-xs py-2 sm:py-3">
                      <AddressLink address={addr.id} startChars={10} endChars={8} />
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm py-2 sm:py-3 text-muted-foreground">
                      {getAddressComment(addr.id) || ""}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm md:text-base py-2 sm:py-3">
                      {addr.tracked ? formatAmount(addr.opening) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm md:text-base py-2 sm:py-3">
                      {formatAmount(addr.minted - addr.burned)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm md:text-base py-2 sm:py-3">
                      {formatAmount(addr.received)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm md:text-base py-2 sm:py-3">
                      {formatAmount(addr.sent)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs sm:text-sm md:text-base font-semibold py-2 sm:py-3 ${
                        addr.finalBalance >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatAmount(addr.finalBalance)}
                      {!addr.tracked && (
                        <span className="text-muted-foreground" title="Net flow with tracked addresses">*</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Low Volume Addresses Row */}
                <TableRow className="bg-muted/30 border-t border-border">
                  <TableCell className="py-3 text-muted-foreground italic">
                    Other Low Volume Addresses
                  </TableCell>
                  <TableCell className="py-3"></TableCell>
                  <TableCell className="py-3"></TableCell>
                  <TableCell className="py-3"></TableCell>
                  <TableCell className="text-right font-mono text-base py-3 text-muted-foreground">
                    {formatAmount(lowVolumeReceived)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-base py-3 text-muted-foreground">
                    {formatAmount(lowVolumeSent)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-base py-3 text-muted-foreground">
                    {formatAmount(lowVolumeFinalBalance)}
                  </TableCell>
                </TableRow>

                {/* Grand Totals Row */}
                <TableRow className="bg-muted/50 font-semibold border-t-2 border-border">
                  <TableCell className="py-3">
                    <span className="font-bold">TOTAL</span>
                  </TableCell>
                  <TableCell className="py-3"></TableCell>
                  <TableCell className="text-right font-mono text-base py-3">
                    {formatAmount(grandTotals.opening)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-base py-3">
                    {formatAmount(grandTotals.minted)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-base py-3">
                    {formatAmount(grandTotals.received)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-base py-3">
                    {formatAmount(grandTotals.sent)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-base font-bold py-3 ${
                      grandTotals.finalBalance >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatAmount(grandTotals.finalBalance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Balances of tracked addresses match the chain at block {dataHeight.toLocaleString("en-US")}.
            Opening is the balance at the start of the endowment, including fees and older history.
            * Untracked counterparty: net flow with tracked addresses.
          </p>
        </Card>
      </div>
    </div>
    </>
  );
};

export default AddressesPage;
