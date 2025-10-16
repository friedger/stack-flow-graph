import { useState, useEffect } from "react";
import { NetworkGraph } from "@/components/NetworkGraph";
import { TimelineControl } from "@/components/TimelineControl";
import { StatsPanel } from "@/components/StatsPanel";
import { TransactionTable } from "@/components/TransactionTable";
import {
  parseTransactionData,
  calculateNetworkData,
  calculateTimeSeriesBalances,
  Transaction,
  NetworkNode,
  NetworkLink,
  TimeSeriesBalance,
} from "@/utils/parseTransactions";
import { Loader2 } from "lucide-react";

// Import CSV files
import csv1 from "@/data/transactions-SP1BJGDG8MSM64DMH33A0F1NB0DT40YGBPSW00NES.csv?raw";
import csv2 from "@/data/transactions-SP30742YR27SYJF29W9GRS7PT2PNECBKKBQP2GHNC.csv?raw";
import csv3 from "@/data/transactions-SP26E434SDGRSA9QF5D65A3WZ29Y0MXD9AMXFJYDC.csv?raw";
import csv4 from "@/data/transactions-SM1Z6BP8PDKYKXTZXXSKXFEY6NQ7RAM7DAEAYR045.csv?raw";
import csv5 from "@/data/transactions-SM30W6WZKNRJKTPVN09J7D8T2R989ZM25VBG2GHNC.csv?raw";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesBalance[]>([]);
  const [minTime, setMinTime] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const csvFiles = [
          { name: "transactions-SP1BJGDG8MSM64DMH33A0F1NB0DT40YGBPSW00NES.csv", content: csv1 },
          { name: "transactions-SP30742YR27SYJF29W9GRS7PT2PNECBKKBQP2GHNC.csv", content: csv2 },
          { name: "transactions-SP26E434SDGRSA9QF5D65A3WZ29Y0MXD9AMXFJYDC.csv", content: csv3 },
          { name: "transactions-SM1Z6BP8PDKYKXTZXXSKXFEY6NQ7RAM7DAEAYR045.csv", content: csv4 },
          { name: "transactions-SM30W6WZKNRJKTPVN09J7D8T2R989ZM25VBG2GHNC.csv", content: csv5 },
        ];

        const parsedTransactions = await parseTransactionData(csvFiles);
        const networkData = calculateNetworkData(parsedTransactions);

        const filteredAddresses = new Set(networkData.nodes.map((n) => n.id));

        // Set initial balance for SP000...sip-031 contract (200m STX on Sept 17, 2025)
        const initialBalances = new Map<string, number>();
        const sip031Address = Array.from(filteredAddresses).find(
          (addr) => addr.startsWith("SP000") && addr.includes(".sip-031"),
        );
        if (sip031Address) {
          initialBalances.set(sip031Address, 200000000);
        }

        const timeSeries = calculateTimeSeriesBalances(parsedTransactions, filteredAddresses, initialBalances);

        setTransactions(parsedTransactions);
        setNodes(networkData.nodes);
        setLinks(networkData.links);
        setTimeSeriesData(timeSeries);

        if (parsedTransactions.length > 0) {
          // Start timeline on September 15th, 2025
          const minTimestamp = new Date("2025-09-15T00:00:00Z").getTime();
          const maxTimestamp = parsedTransactions[parsedTransactions.length - 1].timestamp;
          setMinTime(minTimestamp);
          setMaxTime(maxTimestamp);
          setCurrentTime(maxTimestamp);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading transaction data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const step = (maxTime - minTime) / 100;
        const next = prev + step;
        if (next >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, minTime, maxTime]);

  const handlePlayPause = () => {
    if (currentTime >= maxTime) {
      setCurrentTime(minTime);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(minTime);
    setIsPlaying(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Loading transaction data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Stacks Endowment (SIP-031)
          </h1>
          <p className="text-muted-foreground text-lg">Interactive visualization of STX transactions over time</p>
        </div>

        {/* Stats Panel */}
        <StatsPanel nodes={nodes} totalTransactions={transactions.length} currentTimestamp={currentTime} />

        {/* Network Graph */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg" style={{ height: "600px" }}>
          <NetworkGraph nodes={nodes} links={links} timeSeriesData={timeSeriesData} currentTimestamp={currentTime} />
        </div>

        {/* Timeline Control */}
        <TimelineControl
          minTime={minTime}
          maxTime={maxTime}
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
          transactionTimestamps={transactions.map((tx) => tx.timestamp)}
        />

        {/* Transaction Table */}
        <TransactionTable transactions={transactions} currentTimestamp={currentTime} />

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Displaying addresses with ≥100,000 STX total volume</p>
          <p className="font-mono text-xs">
            {nodes.length} active addresses • {links.length} connections • {transactions.length} transactions
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
