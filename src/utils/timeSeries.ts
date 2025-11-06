import { DAY_IN_MILLIS, TimeSeries, Transaction } from "./parseTransactions";

export function getDayIndexAtTime(dayGroups: number[], currentTime: number) {
  for (let i = 0; i < dayGroups.length; i++) {
    if (currentTime < dayGroups[i]) {
      return i === 0 ? 0 : i - 1;
    }
  }
  return dayGroups.length - 1;
}

export function getTransactionsForDay(dayGroups: number[], currentDayIndex: number, transactions: Transaction[]) {
  if (currentDayIndex === 0) {
    return [];
  }

  const currentDayStart = dayGroups[currentDayIndex];
  const currentDayEnd = dayGroups[currentDayIndex] + DAY_IN_MILLIS;

  // Get all transactions from the current day group
  const activeTransactions = transactions.filter(
    (tx) => tx.timestamp >= currentDayStart && tx.timestamp < currentDayEnd
  );
  return activeTransactions;
}


export function getBalancesForDay(dayGroups: number[], currentDayIndex: number, timeSeriesData: TimeSeries) {
  return timeSeriesData.get(dayGroups[currentDayIndex]);
}

export function getNearestDayFromDate(
  dateString: string | undefined,
  sortedDayGroups: number[],
  minTimestamp: number,
  maxTimestamp: number
): number {
  if (!dateString) {
    return minTimestamp;
  }

  const targetDate = new Date(dateString);
  const targetTimestamp = targetDate.getTime();

  if (isNaN(targetTimestamp)) {
    return minTimestamp;
  }

  // Get the start and end of the target day (midnight to midnight)
  const targetDayStart = new Date(targetDate);
  targetDayStart.setHours(0, 0, 0, 0);
  const targetDayEnd = new Date(targetDate);
  targetDayEnd.setHours(23, 59, 59, 999);

  const dayStart = targetDayStart.getTime();
  const dayEnd = targetDayEnd.getTime();

  // Find the first group that falls on the target day
  for (const dayTimestamp of sortedDayGroups) {
    if (dayTimestamp >= dayStart && dayTimestamp <= dayEnd) {
      return dayTimestamp;
    }
    // Stop if we've passed the target day
    if (dayTimestamp > dayEnd) {
      break;
    }
  }

  // No group found on the target day
  // If target day is within the data range, return the target day start
  if (dayStart >= minTimestamp && dayStart <= maxTimestamp) {
    return dayStart;
  }

  // Target day is outside the data range, return default
  return minTimestamp;
}