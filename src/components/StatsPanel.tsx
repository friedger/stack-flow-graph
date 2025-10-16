import { Card } from '@/components/ui/card';
import { NetworkNode } from '@/utils/parseTransactions';

interface StatsPanelProps {
  nodes: NetworkNode[];
  totalTransactions: number;
  currentTimestamp: number;
}

export function StatsPanel({ nodes, totalTransactions, currentTimestamp }: StatsPanelProps) {
  const totalSent = nodes.reduce((sum, node) => sum + node.sent, 0);
  const totalReceived = nodes.reduce((sum, node) => sum + node.received, 0);
  const totalVolume = totalSent;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4 bg-card border-border">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Active Addresses</p>
          <p className="text-2xl font-bold text-primary">{nodes.length}</p>
          <p className="text-xs text-muted-foreground">≥100k STX volume</p>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Volume</p>
          <p className="text-2xl font-bold text-foreground">
            {(totalVolume / 1000000).toFixed(2)}M
          </p>
          <p className="text-xs text-accent">STX</p>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Sent</p>
          <p className="text-2xl font-bold text-foreground">
            {(totalSent / 1000000).toFixed(2)}M
          </p>
          <p className="text-xs text-destructive">STX</p>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Received</p>
          <p className="text-2xl font-bold text-foreground">
            {(totalReceived / 1000000).toFixed(2)}M
          </p>
          <p className="text-xs text-primary">STX</p>
        </div>
      </Card>
    </div>
  );
}
