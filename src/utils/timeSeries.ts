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