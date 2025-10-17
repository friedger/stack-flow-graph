import { Card } from '@/components/ui/card';
import { NetworkNode, isSIP031Address } from '@/utils/parseTransactions';
import { useMemo } from 'react';

interface StatsPanelProps {
  nodes: NetworkNode[];
  totalTransactions: number;
  currentTimestamp: number;
  dayGroups: number[];
  timeSeriesData: Map<number, Map<string, number>>;
}

export function StatsPanel({ nodes, totalTransactions, currentTimestamp, dayGroups, timeSeriesData }: StatsPanelProps) {
  // Calculate total STX balance excluding SIP-031 address
  const totalSTXBalance = useMemo(() => {
    // Find the latest balance for each address at or before currentTimestamp
    let index = 0;
    for (let i = 0; i < dayGroups.length; i++) {
      if (dayGroups[i] <= currentTimestamp) {
        index = i;
      }
    }
    const balancesAtTime: Map<string, number> = timeSeriesData.get(dayGroups[index]) || new Map();
    let total = 0;
    balancesAtTime.forEach((balance, addr) => {
      if (isSIP031Address(addr)) {
        return;
      }
      total += balance;
    });
    return total / 1000000; // Convert to millions of STX
  }, [currentTimestamp, dayGroups, timeSeriesData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4 bg-card border-border">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Active Addresses</p>
          <p className="text-2xl font-bold text-primary">{nodes.length}</p>
          <p className="text-xs text-muted-foreground">≥100k STX volume</p>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total STX (excl. SIP-031)</p>
          <p className="text-2xl font-bold text-primary">
            {totalSTXBalance.toFixed(2)}M
          </p>
          <p className="text-xs text-accent">STX</p>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Transactions</p>
          <p className="text-2xl font-bold text-foreground">{totalTransactions}</p>
        </div>
      </Card>
    </div>
  );
}
