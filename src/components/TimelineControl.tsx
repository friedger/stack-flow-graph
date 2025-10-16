import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

interface TimelineControlProps {
  minTime: number;
  maxTime: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  transactionTimestamps: number[];
}

export function TimelineControl({
  minTime,
  maxTime,
  currentTime,
  onTimeChange,
  isPlaying,
  onPlayPause,
  onReset,
  transactionTimestamps
}: TimelineControlProps) {
  // Group timestamps by day
  const dayGroups = useMemo(() => {
    const groups = new Map<string, number>();
    transactionTimestamps.forEach(ts => {
      const date = new Date(ts);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!groups.has(dayKey)) {
        groups.set(dayKey, ts);
      }
    });
    return Array.from(groups.values()).sort((a, b) => a - b);
  }, [transactionTimestamps]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDayOnly = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSliderChange = (values: number[]) => {
    onTimeChange(values[0]);
  };

  const handlePreviousDay = () => {
    // Find the last day marker that is before the current time
    const previousDays = dayGroups.filter(ts => ts < currentTime);
    if (previousDays.length > 0) {
      onTimeChange(previousDays[previousDays.length - 1]);
    }
  };

  const handleNextDay = () => {
    const currentDayIndex = dayGroups.findIndex(ts => ts > currentTime);
    if (currentDayIndex !== -1 && currentDayIndex < dayGroups.length) {
      onTimeChange(dayGroups[currentDayIndex]);
    }
  };

  const hasPreviousDay = dayGroups.some(ts => ts < currentTime);
  const hasNextDay = dayGroups.some(ts => ts > currentTime);

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Timeline Control</h3>
          
          {/* Day Navigation */}
          <div className="flex items-center gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousDay}
              disabled={!hasPreviousDay}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Day
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              disabled={!hasNextDay}
              className="gap-1"
            >
              Next Day
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onReset}
              className="h-9 w-9"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={onPlayPause}
              className="h-9 w-9"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative pt-6 pb-2">
            {/* Day group markers - positioned above the slider */}
            <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none">
              {dayGroups.map((timestamp, idx) => {
                const position = ((timestamp - minTime) / (maxTime - minTime)) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 group"
                    style={{ left: `${position}%` }}
                    title={formatDayOnly(timestamp)}
                  >
                    <div className="w-0.5 h-6 bg-primary/40 -translate-x-1/2 group-hover:bg-primary transition-colors" />
                  </div>
                );
              })}
            </div>
            
            <Slider
              value={[currentTime]}
              min={minTime}
              max={maxTime}
              step={(maxTime - minTime) / 1000}
              onValueChange={handleSliderChange}
              className="w-full"
            />
          </div>
          
          <div className="flex justify-between text-sm text-muted-foreground pt-1">
            <span>{formatDate(minTime)}</span>
            <span className="font-mono text-primary font-semibold">{formatDate(currentTime)}</span>
            <span>{formatDate(maxTime)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground">Progress</div>
            <div className="text-lg font-semibold text-foreground">
              {Math.round(((currentTime - minTime) / (maxTime - minTime)) * 100)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Playback Speed</div>
            <div className="text-lg font-semibold text-foreground">1x</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
