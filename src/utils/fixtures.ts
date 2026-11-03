import { TransferData } from "./transferData";

export const SIP = "SP000000000000000000002Q6VF78.sip-031";
export const ENDOWMENT = "SM1Z6BP8PDKYKXTZXXSKXFEY6NQ7RAM7DAEAYR045";
export const WALLET = "SP26E434SDGRSA9QF5D65A3WZ29Y0MXD9AMXFJYDC";
export const ZEST = "SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-vault";
export const DUST = "SP00E7W7JGS6Q80AC9SKCGPD2X65R4EYGA42000";

const STX = (n: number) => String(n * 1_000_000);

/**
 * Three UTC days of activity:
 * - Aug 1: SIP-031 sends 100M to the endowment
 * - Aug 2: one tx sends 2M and 3M from the endowment to WALLET (two events),
 *          WALLET receives 0.0001 STX dust
 * - Aug 4: WALLET supplies 1.5M to Zest (untracked contract)
 * SIP-031 receives 70k STX of mints per day.
 */
export const FIXTURE: TransferData = {
  version: 1,
  generatedAt: "2025-08-05T00:00:00.000Z",
  height: 1000,
  startTime: "2025-07-30T00:27:51.000Z",
  tracked: [SIP, ENDOWMENT, WALLET],
  skipped: [],
  balances: {
    // 200M + 6 days * 70k - 100M
    [SIP]: STX(100_420_000),
    // 100M - 5M - fees of 0.003 STX
    [ENDOWMENT]: "94999999997000",
    // held 1M before the endowment + 5M - 1.5M + dust
    [WALLET]: "4500000000100",
  },
  transfers: [
    {
      id: "0xa:0",
      txId: "0xa",
      height: 10,
      time: "2025-08-01T10:00:00.000Z",
      sender: SIP,
      recipient: ENDOWMENT,
      amount: STX(100_000_000),
    },
    {
      id: "0xb:0",
      txId: "0xb",
      height: 20,
      time: "2025-08-02T12:00:00.000Z",
      sender: ENDOWMENT,
      recipient: WALLET,
      amount: STX(2_000_000),
    },
    {
      id: "0xb:1",
      txId: "0xb",
      height: 20,
      time: "2025-08-02T12:00:00.000Z",
      sender: ENDOWMENT,
      recipient: WALLET,
      amount: STX(3_000_000),
    },
    {
      id: "0xc:0",
      txId: "0xc",
      height: 21,
      time: "2025-08-02T13:00:00.000Z",
      sender: DUST,
      recipient: WALLET,
      amount: "100",
    },
    {
      id: "0xd:0",
      txId: "0xd",
      height: 40,
      time: "2025-08-04T09:00:00.000Z",
      sender: WALLET,
      recipient: ZEST,
      amount: STX(1_500_000),
    },
  ],
  supply: ["07-30", "07-31", "08-01", "08-02", "08-03", "08-04"].map(
    (d, i) => ({
      address: SIP,
      kind: "mint" as const,
      day: `2025-${d}`,
      firstHeight: i * 10,
      lastTime: `2025-${d}T23:00:00.000Z`,
      amount: STX(70_000),
      count: 60,
    })
  ),
  cursors: {},
};
