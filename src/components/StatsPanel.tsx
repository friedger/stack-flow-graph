import { Card } from "@/components/ui/card";
import { NetworkNode, isSIP031Address } from "@/utils/parseTransactions";
import { formatDate, formatDayOnly } from "@/utils/formatters";
import { useMemo } from "react";

interface StatsPanelProps {
  nodes: NetworkNode[];
  totalTransactions: number;
  currentTimestamp: number;
  dayGroups: number[];
  timeSeriesData: Map<number, Map<string, number>>;
  /** Balances held before the endowment started; not counted as SIP-031 STX */
  openingBalances?: Map<string, number>;
}

export function StatsPanel({
  nodes,
  totalTransactions,
  currentTimestamp,
  dayGroups,
  timeSeriesData,
  openingBalances,
}: StatsPanelProps) {
  // Calculate total STX balance excluding SIP-031 address
  const totalSTXBalance = useMemo(() => {
    // Find the latest balance for each address at or before currentTimestamp
    let index = 0;
    for (let i = 0; i < dayGroups.length; i++) {
      if (dayGroups[i] <= currentTimestamp) {
        index = i;
      }
    }
    const balancesAtTime: Map<string, number> =
      timeSeriesData.get(dayGroups[index]) || new Map<string, number>();
    let total = 0;
    balancesAtTime.forEach((balance, addr) => {
      if (isSIP031Address(addr)) {
        return;
      }
      total += balance - (openingBalances?.get(addr) || 0);
    });
    return total / 1000000; // Convert to millions of STX
  }, [currentTimestamp, dayGroups, timeSeriesData, openingBalances]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      <Card className="p-3 sm:p-4 bg-card border-border">
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Active Addresses</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{nodes.length}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">≥100k STX volume</p>
        </div>
      </Card>

      <Card className="p-3 sm:p-4 bg-card border-border">
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Total STX from SIP-031
          </p>
          <p className="text-xl sm:text-2xl font-bold text-primary">
            {totalSTXBalance.toFixed(2)}M STX
          </p>
          <p className="text-[10px] sm:text-xs text-accent">
            <span className="hidden sm:inline">until {formatDate(currentTimestamp)}</span>
            <span className="sm:hidden">until {formatDayOnly(currentTimestamp)}</span>
          </p>
        </div>
      </Card>

      <Card className="p-3 sm:p-4 bg-card border-border sm:col-span-2 lg:col-span-1">
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total Transactions</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">
            {totalTransactions}
          </p>
          <p className="text-[10px] sm:text-xs text-accent">
            {formatDayOnly(dayGroups[0])} - {formatDayOnly(dayGroups[dayGroups.length -1])}
          </p>
        </div>
      </Card>
    </div>
  );
}
