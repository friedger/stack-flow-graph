import { Github } from "lucide-react";
import { useEffect, useState } from "react";
import { loadDataFromFiles } from "@/utils/loadData";
import { formatDayOnly } from "@/utils/formatters";

export const Footer = () => {
  const [stats, setStats] = useState<{
    nodes: number;
    links: number;
    transactions: number;
    minTime: number;
    maxTime: number;
  } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { orderedTransactions, networkData } = await loadDataFromFiles();
        setStats({
          nodes: networkData.nodes.length,
          links: networkData.links.length,
          transactions: orderedTransactions.length,
          minTime: orderedTransactions[0]?.timestamp || 0,
          maxTime: orderedTransactions[orderedTransactions.length - 1]?.timestamp || 0,
        });
      } catch (error) {
        console.error("Error loading footer stats:", error);
      }
    };
    loadStats();
  }, []);

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="STX Network Logo" className="h-6 w-6" />
            <span>Stacks Endowment (SIP-031)</span>
          </div>
          
          {stats && (
            <div className="flex items-center gap-3 font-mono">
              <span>{stats.nodes} addresses</span>
              <span>•</span>
              <span>{stats.links} connections</span>
              <span>•</span>
              <span>{stats.transactions} transactions</span>
              <span>•</span>
              <span>{formatDayOnly(stats.minTime)} - {formatDayOnly(stats.maxTime)}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/yourusername/stx-network-visualizer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
