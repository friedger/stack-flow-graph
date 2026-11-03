import { describe, expect, it } from "vitest";
import {
  discoverRecipients,
  hasValidBlockTime,
  interpolateBlockTime,
  pickAnchorHeights,
  mergeSupply,
  mergeTransfers,
  supplyResumeHeight,
  TransferEvent,
} from "./transferData";

const ev = (id: string, height: number, sender: string, recipient: string, amount = "1"): TransferEvent => ({
  id,
  txId: id.split(":")[0],
  height,
  time: "2025-08-01T00:00:00.000Z",
  sender,
  recipient,
  amount,
});

describe("mergeTransfers", () => {
  it("replaces the re-fetched range and keeps distinct events of one tx", () => {
    const stored = [ev("0x1:0", 10, "A", "B"), ev("0x2:0", 50, "A", "B"), ev("0x3:0", 60, "C", "A")];
    // 0x2 was reorged away; 0x4 has two transfers
    const fetched = [ev("0x4:0", 55, "A", "B"), ev("0x4:1", 55, "A", "C")];
    const merged = mergeTransfers(stored, fetched, "transfer-out", "A", 40);
    expect(merged.map((e) => e.id)).toEqual(["0x1:0", "0x4:0", "0x4:1", "0x3:0"]);
  });
});

describe("mergeSupply", () => {
  const mint = (height: number, time: string, amount = "1000") => ({ height, time, amount });

  it("sums events per UTC day and rebuilds days from the resume height", () => {
    const first = mergeSupply(
      [],
      [mint(1, "2025-08-01T01:00:00Z"), mint(2, "2025-08-01T23:00:00Z"), mint(3, "2025-08-02T01:00:00Z")],
      "mint",
      "S",
      0
    );
    expect(first.map((s) => [s.day, s.amount, s.count])).toEqual([
      ["2025-08-01", "2000", 2],
      ["2025-08-02", "1000", 1],
    ]);

    const from = supplyResumeHeight(first, "mint", "S", 3);
    expect(from).toBe(3);
    const second = mergeSupply(
      first,
      [mint(3, "2025-08-02T01:00:00Z"), mint(4, "2025-08-02T05:00:00Z")],
      "mint",
      "S",
      from
    );
    expect(second.map((s) => [s.day, s.amount, s.count])).toEqual([
      ["2025-08-01", "2000", 2],
      ["2025-08-02", "2000", 2],
    ]);
  });

  it("starts from scratch without a cursor", () => {
    expect(supplyResumeHeight([], "mint", "S", undefined)).toBeUndefined();
    expect(supplyResumeHeight([], "mint", "S", 99)).toBe(100);
  });
});

describe("discoverRecipients", () => {
  it("follows large standard-principal recipients of tracked senders only", () => {
    const transfers = [
      ev("1:0", 1, "T", "BIG", "60"),
      ev("2:0", 2, "T", "BIG", "50"),
      ev("3:0", 3, "T", "SMALL", "10"),
      ev("4:0", 4, "T", "SP1.contract", "500"),
      ev("5:0", 5, "X", "OTHER", "500"),
      ev("6:0", 6, "T", "T2", "500"),
    ];
    expect(discoverRecipients(transfers, new Set(["T", "T2"]), 100)).toEqual(["BIG"]);
  });
});

describe("block time repair", () => {
  it("treats the 1970 placeholder and missing values as invalid", () => {
    expect(hasValidBlockTime("1970-01-01T00:00:00.000Z")).toBe(false);
    expect(hasValidBlockTime(null)).toBe(false);
    expect(hasValidBlockTime("2026-04-29T23:16:56.000Z")).toBe(true);
  });

  it("picks anchors at both ends and at most `spacing` blocks apart", () => {
    expect(pickAnchorHeights([105, 100, 1500, 2000, 2100, 2100], 1000)).toEqual([100, 1500, 2100]);
    expect(pickAnchorHeights([7], 1000)).toEqual([7]);
    expect(pickAnchorHeights([], 1000)).toEqual([]);
  });

  it("interpolates between anchors and uses exact values when known", () => {
    const anchors = new Map([
      [100, 1_000_000],
      [200, 2_000_000],
    ]);
    expect(interpolateBlockTime(150, anchors)).toBe(1_500_000);
    expect(interpolateBlockTime(200, anchors)).toBe(2_000_000);
    expect(interpolateBlockTime(50, anchors)).toBe(1_000_000);
    expect(interpolateBlockTime(250, anchors)).toBe(2_000_000);
  });
});
