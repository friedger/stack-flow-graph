import { NetworkGraph } from "@/components/NetworkGraph";
import { StatsPanel } from "@/components/StatsPanel";
import { TimelineControl } from "@/components/TimelineControl";
import { TransactionTable } from "@/components/TransactionTable";
import { loadDataFromFiles } from "@/utils/loadData";
import {
  NetworkLink,
  NetworkNode,
  SEPT_15_START,
  TimeSeries,
  Transaction
} from "@/utils/parseTransactions";
import { getDayIndexAtTime } from "@/utils/timeSeries";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeries>(new Map());
  const [minTime, setMinTime] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dayGroups, setDayGroups] = useState<number[]>([]);
  const [dayChangeTrigger, setDayChangeTrigger] = useState(0); // Trigger for day changes (manual or auto)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { orderedTransactions, networkData, timeSeries, groups } =
          await loadDataFromFiles();
        setTransactions(orderedTransactions);
        setNodes(networkData.nodes);
        setLinks(networkData.links);
        setTimeSeriesData(timeSeries);

        if (orderedTransactions.length > 0) {
          const minTimestamp = groups[0];
          const maxTimestamp = groups[groups.length - 1];
          setMinTime(minTimestamp);
          setMaxTime(maxTimestamp);
          setCurrentTime(minTimestamp);

          setDayGroups(Array.from(groups.values()).sort((a, b) => a - b));
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading transaction data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Detect day changes during auto-play or manual navigation
  useEffect(() => {
    // Only update dayChangeTrigger if currentTime moves to a new day group
    const currentDayIndex = getDayIndexAtTime(dayGroups, currentTime);
    if (currentDayIndex !== -1 && currentDayIndex !== dayChangeTrigger) {
      setDayChangeTrigger(currentDayIndex);
    }
  }, [currentTime, dayGroups]);

  useEffect(() => {
    if (!isPlaying || dayGroups.length === 0) return;

    const particleAnimationDuration = 2000; // 2 seconds for particle animation
    const stepInterval = 50; // Update every 50ms for smooth animation
    const totalTimeRange = maxTime - minTime;
    const baseStepSize = totalTimeRange / 1000; // Smooth progression

    let lastDayIndex = dayGroups.findIndex((dayStart, idx) => {
      const nextDayStart = dayGroups[idx + 1];
      return (
        currentTime >= dayStart && (!nextDayStart || currentTime < nextDayStart)
      );
    });

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        // Find current day index
        const currentDayIndex = dayGroups.findIndex((dayStart, idx) => {
          const nextDayStart = dayGroups[idx + 1];
          return prev >= dayStart && (!nextDayStart || prev < nextDayStart);
        });

        if (currentDayIndex === -1) {
          return dayGroups[0];
        }

        if (prev >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }

        // Check if we just entered a new day
        const enteredNewDay =
          currentDayIndex !== lastDayIndex && currentDayIndex !== -1;
        if (enteredNewDay) {
          lastDayIndex = currentDayIndex;
        }

        // If we're in the last day group, advance to maxTime
        if (currentDayIndex >= dayGroups.length - 1) {
          return Math.min(prev + baseStepSize, maxTime);
        }

        const currentDayStart = dayGroups[currentDayIndex];
        const nextDayStart = dayGroups[currentDayIndex + 1];
        const timeToNextDay = nextDayStart - prev;

        // If we just entered this day, wait for particle animation to complete
        const timeInCurrentDay = prev - currentDayStart;
        if (
          timeInCurrentDay < particleAnimationDuration &&
          timeToNextDay < particleAnimationDuration - timeInCurrentDay
        ) {
          // Wait - don't advance yet, particles still animating
          return prev;
        }

        // Normal advancement
        const nextTime = prev + baseStepSize;

        // Don't overshoot the next day
        return Math.min(nextTime, nextDayStart);
      });
    }, stepInterval);

    return () => clearInterval(interval);
  }, [isPlaying, dayGroups, maxTime, minTime, currentTime]);

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
          <p className="text-lg text-muted-foreground">
            Loading transaction data...
          </p>
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
          <p className="text-muted-foreground text-lg">
            Interactive visualization of STX transactions over time
          </p>
        </div>

        {/* Stats Panel */}
        <StatsPanel
          nodes={nodes}
          totalTransactions={transactions.length}
          currentTimestamp={currentTime}
          dayGroups={dayGroups}
          timeSeriesData={timeSeriesData}
        />

        {/* Network Graph */}
        <div
          className="bg-card border border-border rounded-xl overflow-hidden shadow-lg"
          style={{ height: "600px" }}
        >
          <NetworkGraph
            nodes={nodes}
            links={links}
            timeSeriesData={timeSeriesData}
            transactions={transactions}
            dayGroups={dayGroups}
            currentGroupIndex={dayChangeTrigger}
          />
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
          dayGroups={dayGroups}
          currentGroupIndex={dayChangeTrigger}
          onDayChange={(step: number) => {
            // Stop autoplay when manually navigating
            setIsPlaying(false);
            
            // Use getDayIndexAtTime to correctly find current day even during autoplay
            const currentIdx = getDayIndexAtTime(dayGroups, currentTime);
            let newIdx = currentIdx + step;
            
            // Clamp to valid range
            newIdx = Math.max(0, Math.min(dayGroups.length - 1, newIdx));
            setCurrentTime(dayGroups[newIdx]);
          }}
        />

        {/* Transaction Table */}
        <TransactionTable
          transactions={transactions}
          currentTimestamp={currentTime}
        />

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Displaying addresses with ≥100,000 STX total volume</p>
          <p className="font-mono text-xs">
            {nodes.length} active addresses • {links.length} connections •{" "}
            {transactions.length} transactions
          </p>
          <p className="font-mono text-xs">
            from {minTime} until {maxTime}{" "}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
