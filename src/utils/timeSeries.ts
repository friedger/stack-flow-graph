
export function getDayIndexAtTime(dayGroups: number[], currentTime: number) {
  return (
    dayGroups.findIndex((ts, index) => currentTime >= ts
  ));
}