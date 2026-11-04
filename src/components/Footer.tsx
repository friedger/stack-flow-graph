import { useEffect, useState } from "react";
import { loadDataFromFiles } from "@/utils/loadData";
import { formatDayOnly } from "@/utils/formatters";

/** The GitHub mark (lucide-react no longer ships brand icons). */
const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.9.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
  </svg>
);

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
    void loadStats();
  }, []);

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-xs mt-auto">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/logo.png" alt="STX Network Logo" className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-center sm:text-left">Stacks Endowment (SIP-031)</span>
          </div>
          
          {stats && (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-mono text-center">
              <span>{stats.nodes} addresses</span>
              <span className="hidden sm:inline">•</span>
              <span>{stats.links} connections</span>
              <span className="hidden sm:inline">•</span>
              <span>{stats.transactions} txs</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">{formatDayOnly(stats.minTime)} - {formatDayOnly(stats.maxTime)}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://github.com/friedger/stack-flow-graph"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 sm:gap-1.5 hover:text-primary transition-colors"
            >
              <GithubIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>GitHub</span>
            </a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
