import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  NetworkNode,
  TimeSeries
} from "@/utils/parseTransactions";
import { formatDate, formatDayOnly } from "@/utils/formatters";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

interface TimelineControlProps {
  minTime: number;
  maxTime: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  dayGroups: number[];
  onDayChange: (step: number) => void;
  currentGroupIndex: number;
}

export function TimelineControl({
  minTime,
  maxTime,
  currentTime,
  onTimeChange,
  isPlaying,
  onPlayPause,
  onReset,
  dayGroups,
  onDayChange,
  currentGroupIndex,
}: TimelineControlProps) {
  const handleSliderChange = (values: number[]) => {
    onTimeChange(values[0]);
  };

  const handlePreviousDay = () => {
    if (currentGroupIndex > 0) {
      onDayChange(-1);
    }
  };

  const handleNextDay = () => {
    if (currentGroupIndex < dayGroups.length - 1) {
      onDayChange(1);
    }
  };

  const hasPreviousDay = currentGroupIndex > 0;
  const hasNextDay = currentGroupIndex < dayGroups.length - 1;


  return (
    <Card className="p-4 sm:p-5 md:p-6 bg-card border-border">
      <div className="space-y-3 md:space-y-4">
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-base sm:text-lg font-semibold text-foreground text-center sm:text-left">
            Timeline Control
          </h3>

          {/* Day Navigation */}
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousDay}
              disabled={!hasPreviousDay}
              className="gap-1 text-xs sm:text-sm"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Previous</span>
              <span className="xs:hidden">Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              disabled={!hasNextDay}
              className="gap-1 text-xs sm:text-sm"
            >
              <span className="hidden xs:inline">Next</span>
              <span className="xs:hidden">Next</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onReset}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={onPlayPause}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative pt-5 sm:pt-6 pb-2">
            {/* Day group markers - positioned above the slider */}
            <div className="absolute top-0 left-0 right-0 h-5 sm:h-6 pointer-events-none">
              {dayGroups.map((timestamp, idx) => {
                const position =
                  ((timestamp - minTime) / (maxTime - minTime)) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 group"
                    style={{ left: `${position}%` }}
                    title={formatDayOnly(timestamp)}
                  >
                    <div className="w-0.5 h-5 sm:h-6 bg-primary/40 -translate-x-1/2 group-hover:bg-primary transition-colors" />
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

          <div className="flex justify-between text-[10px] sm:text-xs md:text-sm text-muted-foreground pt-1 gap-2">
            <span className="hidden sm:inline">{formatDate(minTime)}</span>
            <span className="sm:hidden">{formatDayOnly(minTime)}</span>
            <span className="font-mono text-primary font-semibold text-center flex-1">
              <span className="hidden sm:inline">{formatDate(currentTime)}</span>
              <span className="sm:hidden">{formatDayOnly(currentTime)}</span>
            </span>
            <span className="hidden sm:inline">{formatDate(maxTime)}</span>
            <span className="sm:hidden">{formatDayOnly(maxTime)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 border-t border-border">
          <div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Progress</div>
            <div className="text-base sm:text-lg font-semibold text-foreground">
              {Math.round(
                ((currentTime - minTime) / (maxTime - minTime)) * 100
              )}
              %
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="text-xs text-muted-foreground">Playback Speed</div>
            <div className="text-lg font-semibold text-foreground">1x</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
