import { getDayIndexAtTime, getTransactionsForDay } from "./timeSeries";
import {PARSED_TRANSACTIONS, groups } from "./parseTransactions.test"

describe("getDayIndexAtTime", () => {
  it("returns correct index for exact match", () => {
    const dayGroups = [1000, 2000, 3000, 4000];
    expect(getDayIndexAtTime(dayGroups, 2000)).toBe(1);
    expect(getDayIndexAtTime(dayGroups, 4000)).toBe(3);
  });

  it("returns closest lower index for in-between values", () => {
    const dayGroups = [1000, 2000, 3000, 4000];
    expect(getDayIndexAtTime(dayGroups, 2500)).toBe(1);
    expect(getDayIndexAtTime(dayGroups, 3999)).toBe(2);
  });

  it("returns 0 for time before first group", () => {
    const dayGroups = [1000, 2000, 3000, 4000];
    expect(getDayIndexAtTime(dayGroups, 999)).toBe(0);
  });

  it("returns last index for time after last group", () => {
    const dayGroups = [1000, 2000, 3000, 4000];
    expect(getDayIndexAtTime(dayGroups, 5000)).toBe(3);
  });
});

describe("getTransactionForDay", () => {
  it("should have 0 transactions for day 0", () => {
    const dayTransactions = getTransactionsForDay(
      groups,
      0,
      PARSED_TRANSACTIONS
    )
    expect (dayTransactions).toStrictEqual([]);
  });


  it("should have 2 transactions for day 1", () => {
    const dayTransactions = getTransactionsForDay(
      groups,
      1,
      PARSED_TRANSACTIONS
    )
    expect (dayTransactions.map(t => t.timestamp)).toStrictEqual([1757894400001, 1757894400002]);
  });


  it("should have 1 transactions for day 2", () => {
    const dayTransactions = getTransactionsForDay(
      groups,
      2,
      PARSED_TRANSACTIONS
    )
    expect (dayTransactions.map(t => t.timestamp)).toStrictEqual([1757980800003]);
  });
});
