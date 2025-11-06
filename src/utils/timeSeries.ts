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
  minTimestamp: number
): number {
  if (!dateString) {
    return minTimestamp;
  }

  const targetDate = new Date(dateString);
  const targetTimestamp = targetDate.getTime();

  if (isNaN(targetTimestamp)) {
    return minTimestamp;
  }

  // Find the nearest day group with transactions
  let nearestDay = minTimestamp;
  let minDiff = Math.abs(targetTimestamp - minTimestamp);

  for (const dayTimestamp of sortedDayGroups) {
    const diff = Math.abs(targetTimestamp - dayTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      nearestDay = dayTimestamp;
    }
    // Stop if we've passed the target date
    if (dayTimestamp > targetTimestamp) break;
  }

  return nearestDay;
}