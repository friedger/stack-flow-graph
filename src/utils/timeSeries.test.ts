import { getDayIndexAtTime, getTransactionsForDay, getNearestDayFromDate } from "./timeSeries";
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

describe("getNearestDayFromDate", () => {
  // Nov 4th 2025 at different times
  const nov4_5pm = new Date("2025-11-04T17:00:00Z").getTime();
  const nov4_8am = new Date("2025-11-04T08:00:00Z").getTime();
  const nov5_2pm = new Date("2025-11-05T14:00:00Z").getTime();
  const nov6_10am = new Date("2025-11-06T10:00:00Z").getTime();
  const nov10_midnight = new Date("2025-11-10T00:00:00Z").getTime();
  
  const dayGroups = [nov4_8am, nov4_5pm, nov5_2pm, nov6_10am, nov10_midnight];

  it("should return the first group on the exact day (morning group)", () => {
    const result = getNearestDayFromDate("2025-11-04", dayGroups);
    expect(result).toBe(nov4_8am);
  });

  it("should return the first group when multiple groups exist on same day", () => {
    const result = getNearestDayFromDate("2025-11-04", dayGroups);
    // Should return 8am, not 5pm (first group of the day)
    expect(result).toBe(nov4_8am);
  });

  it("should return the group on Nov 5th when date is Nov 5th", () => {
    const result = getNearestDayFromDate("2025-11-05", dayGroups);
    expect(result).toBe(nov5_2pm);
  });

  it("should return the target day start when no group exists but date is within range", () => {
    const nov7_start = new Date("2025-11-07T00:00:00Z").getTime();
    const result = getNearestDayFromDate("2025-11-07", dayGroups);
    expect(result).toBe(nov7_start);
  });

  it("should return minTimestamp when date is before data range", () => {
    const result = getNearestDayFromDate("2025-11-01", dayGroups);
    expect(result).toBe(nov4_8am);
  });

  it("should return minTimestamp when date is after data range", () => {
    const result = getNearestDayFromDate("2025-11-15", dayGroups);
    expect(result).toBe(nov4_8am);
  });

  it("should return minTimestamp for invalid date string", () => {
    const result = getNearestDayFromDate("invalid-date", dayGroups);
    expect(result).toBe(nov4_8am);
  });

  it("should return minTimestamp for undefined date", () => {
    const result = getNearestDayFromDate(undefined, dayGroups);
    expect(result).toBe(nov4_8am);
  });

  it("should handle date with time component (should match day only)", () => {
    const result = getNearestDayFromDate("2025-11-04T23:59:59Z", dayGroups);
    // Should still match Nov 4th groups
    expect(result).toBe(nov4_8am);
  });

  it("should return 0 for empty day groups", () => {
    const result = getNearestDayFromDate("2025-11-04", []);
    expect(result).toBe(0);
  });
});
