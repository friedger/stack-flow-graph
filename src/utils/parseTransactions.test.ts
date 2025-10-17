import { describe, expect, it } from "vitest";
import {
  calculateGroupBalances,
  calculateNetworkData,
  DAILY_REWARD,
  TimeSeries,
  Transaction,
} from "./parseTransactions";

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;
const PARSED_TRANSACTIONS: Transaction[] = [
  {
    sender: "A",
    recipient: "B",
    amount: 100_000_000,
    timestamp: 1757894400001,
    date: new Date(),
    type: "send",
    ownerAddress: "A",
    txId: "tx1",
  },
  {
    sender: "B",
    recipient: "SP000.sip-031",
    amount: 50_000_000,
    timestamp: 1757894400001,
    date: new Date(),
    type: "send",
    ownerAddress: "B",
    txId: "tx2",
  },
  {
    sender: "A",
    recipient: "SP000.sip-031",
    amount: 30_000_000,
    timestamp: 1757894400003 + DAY_IN_MILLIS,
    date: new Date(),
    type: "receive",
    ownerAddress: "A",
    txId: "tx3",
  },
];

const initialBalances: Map<string, number> = new Map(
  Object.entries({ A: 130_000_000 })
);

const networkData = calculateNetworkData(PARSED_TRANSACTIONS);
// expect(networkData.nodes).toStrictEqual([{
//     balance: -130_000_000,
//     id: "A",
//     received: 0,
//     sent: 130_000_000
// }, {
//     balance: 50_000_000,
//     id: "B",
//     received: 100_000_000,
//     sent: 50_000_000
// },{
//     balance: 80_000_000,
//     id: "C",
//     received: 80_000_000,
//     sent: 0
// }]);

const timeSeriesData: TimeSeries = calculateGroupBalances(
  PARSED_TRANSACTIONS,
  new Set(networkData.nodes.map((n) => n.id)),
  initialBalances
);

const groups = Array.from(timeSeriesData.keys());

describe("parseTransactions", () => {
  it("should generate correct timeseries data", async () => {
    // Check that balances are correct at each timestamp
    // This is a simple check, adapt if your function returns differently
    console.log(timeSeriesData)
    expect(timeSeriesData.get(groups[0])).toEqual(
      new Map(
        Object.entries({
          A: 130_000_000,
          B: 0,
          "SP000.sip-031": 0,
        })
      )
    );

    expect(timeSeriesData.get(groups[1])).toEqual(
      new Map(
        Object.entries({
          A: 30_000_000,
          B: 50_000_000,
          "SP000.sip-031": 50_000_000,
        })
      )
    );
    //             { address: "A", balance: 30_000_000, timestamp: 1757894400001 },
    //   { address: "B", balance: 50_000_000, timestamp: 1757894400001 },
    //   {
    //     address: "SP000.sip-031",
    //     balance: 50_000_000,
    //     timestamp: 1757894400001,
    //   },
    //   { address: "A", balance: 0, timestamp: 1757894400003 + DAY_IN_MILLIS },
    //   {
    //     address: "B",
    //     balance: 50_000_000,
    //     timestamp: 1757894400003 + DAY_IN_MILLIS,
    //   },
    //   {
    //     address: "SP000.sip-031",
    //     balance: 80_000_000 + DAILY_REWARD,
    //     timestamp: 1757894400003 + DAY_IN_MILLIS,
    //   },
  });

  it("should create correct group balance", async () => {
    expect(groups).toStrictEqual([1757808000001, 1757894400001, 1757980800003]);

    let groupBalance = timeSeriesData.get(groups[0]);
    expect(groupBalance).toStrictEqual(
      new Map(Object.entries({ A: 130_000_000, B: 0, "SP000.sip-031": 0 }))
    );

    groupBalance = timeSeriesData.get(groups[1]);
    expect(groupBalance).toStrictEqual(
      new Map(Object.entries({ A: 30_000_000, B: 50_000_000, "SP000.sip-031": 50_000_000 }))
    );
  });
});
