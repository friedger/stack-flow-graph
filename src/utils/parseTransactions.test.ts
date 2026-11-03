import { describe, expect, it } from "vitest";
import { DUST, ENDOWMENT, FIXTURE, SIP, WALLET, ZEST } from "./fixtures";
import { loadDataFromFiles } from "./loadData";
import {
  calculateBalanceDeltas,
  calculateDayGroups,
  calculateGroupBalances,
  calculateOpeningBalances,
  parseTransferData,
} from "./parseTransactions";

const day = (iso: string) => Date.parse(`${iso}T00:00:00.000Z`);

describe("parseTransferData", () => {
  it("keeps every transfer event of a multi-transfer tx", () => {
    const txs = parseTransferData(FIXTURE);
    expect(txs.filter((t) => t.txId === "0xb").map((t) => t.amount)).toEqual([
      2_000_000, 3_000_000,
    ]);
  });

  it("marks the tracked side as owner", () => {
    const txs = parseTransferData(FIXTURE);
    const dust = txs.find((t) => t.sender === DUST);
    expect(dust.ownerAddress).toBe(WALLET);
    expect(dust.type).toBe("receive");
  });
});

describe("calculateOpeningBalances", () => {
  it("derives the start balance from the chain balance and all events", () => {
    const txs = parseTransferData(FIXTURE);
    const opening = calculateOpeningBalances(
      FIXTURE,
      calculateBalanceDeltas(txs, FIXTURE.supply)
    );
    expect(Object.fromEntries(opening)).toEqual({
      [SIP]: 200_000_000_000_000,
      [ENDOWMENT]: -3000, // fees are not events
      [WALLET]: 1_000_000_000_000,
    });
  });
});

describe("calculateDayGroups", () => {
  it("uses UTC days with displayed transactions plus a starting day", async () => {
    const { groups } = await loadDataFromFiles(FIXTURE);
    expect(groups).toEqual([
      day("2025-07-31"),
      day("2025-08-01"),
      day("2025-08-02"),
      day("2025-08-04"),
    ]);
  });

  it("returns no groups without transactions", () => {
    expect(calculateDayGroups([])).toEqual([]);
  });
});

describe("calculateGroupBalances", () => {
  it("adds each mint once, without compounding", () => {
    const groups = [day("2025-08-01"), day("2025-08-02"), day("2025-08-03")];
    const deltas = [1, 2, 3].map((d) => ({
      timestamp: day(`2025-08-0${d}`) + 1000,
      address: SIP,
      delta: 70_000_000_000,
    }));
    const series = calculateGroupBalances(groups, deltas, new Set([SIP]));
    expect(groups.map((g) => series.get(g).get(SIP))).toEqual([
      70_000, 140_000, 210_000,
    ]);
  });

  it("reconstructs balances that end at the chain balance", async () => {
    const { groups, timeSeries, nodeAddresses } = await loadDataFromFiles(FIXTURE);
    expect(Array.from(nodeAddresses).sort()).toEqual(
      [SIP, ENDOWMENT, WALLET, ZEST].sort()
    );
    const at = (g: number) => Object.fromEntries(timeSeries.get(g));
    expect(at(groups[0])).toEqual({
      [SIP]: 200_140_000,
      [ENDOWMENT]: -0.003,
      [WALLET]: 1_000_000,
      [ZEST]: 0,
    });
    expect(at(groups[1])).toEqual({
      [SIP]: 100_210_000,
      [ENDOWMENT]: 99_999_999.997,
      [WALLET]: 1_000_000,
      [ZEST]: 0,
    });
    expect(at(groups[2])).toEqual({
      [SIP]: 100_350_000,
      [ENDOWMENT]: 94_999_999.997,
      [WALLET]: 6_000_000.0001,
      [ZEST]: 0,
    });
    expect(at(groups[3])).toEqual({
      [SIP]: 100_420_000,
      [ENDOWMENT]: 94_999_999.997,
      [WALLET]: 4_500_000.0001,
      [ZEST]: 1_500_000,
    });
  });
});

describe("loadDataFromFiles", () => {
  it("hides dust from transaction lists", async () => {
    const { orderedTransactions } = await loadDataFromFiles(FIXTURE);
    expect(orderedTransactions.map((t) => t.id)).toEqual([
      "0xa:0",
      "0xb:0",
      "0xb:1",
      "0xd:0",
    ]);
  });

  it("summarises addresses so each tracked row reconciles", async () => {
    const { addressSummaries, networkData } = await loadDataFromFiles(FIXTURE);
    for (const node of networkData.nodes) {
      const s = addressSummaries.get(node.id);
      if (!s.tracked) continue;
      expect(s.opening + s.minted - s.burned + node.received - node.sent).toBeCloseTo(
        s.finalBalance,
        6
      );
    }
    expect(addressSummaries.get(SIP)).toMatchObject({
      opening: 200_000_000,
      minted: 420_000,
      finalBalance: 100_420_000,
      tracked: true,
    });
    expect(addressSummaries.get(ZEST)).toMatchObject({
      finalBalance: 1_500_000,
      tracked: false,
    });
  });
});
