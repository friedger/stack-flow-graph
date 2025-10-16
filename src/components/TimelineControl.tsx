import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineControlProps {
  minTime: number;
  maxTime: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
}

export function TimelineControl({
  minTime,
  maxTime,
  currentTime,
  onTimeChange,
  isPlaying,
  onPlayPause,
  onReset
}: TimelineControlProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSliderChange = (values: number[]) => {
    onTimeChange(values[0]);
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Timeline Control</h3>
          <div className="flex items-center gap-2">
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
          <Slider
            value={[currentTime]}
            min={minTime}
            max={maxTime}
            step={(maxTime - minTime) / 1000}
            onValueChange={handleSliderChange}
            className="w-full"
          />
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatDate(minTime)}</span>
            <span className="font-mono text-primary">{formatDate(currentTime)}</span>
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
