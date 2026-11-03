import transferDataJson from "../data/transfers.json";
import {
  calculateBalanceDeltas,
  calculateDayGroups,
  calculateGroupBalances,
  calculateNetworkData,
  calculateOpeningBalances,
  parseTransferData,
  shouldIncludeTransaction,
} from "./parseTransactions";
import { MICRO_STX_PER_STX, TransferData, toMicro } from "./transferData";

export const transferData = transferDataJson as TransferData;

export interface AddressSummary {
  /** STX balance at the start of the data window (tracked addresses only) */
  opening: number;
  minted: number;
  burned: number;
  /** On-chain balance for tracked addresses, net flow for the others */
  finalBalance: number;
  tracked: boolean;
}

export const computeData = (data: TransferData = transferData) => {
  const allTransactions = parseTransferData(data);
  // Dust transfers are hidden in lists and the graph, but still count for balances.
  const orderedTransactions = allTransactions.filter((t) =>
    shouldIncludeTransaction(t.amount)
  );
  const networkData = calculateNetworkData(allTransactions);
  const nodeAddresses = new Set(networkData.nodes.map((n) => n.id));

  const deltas = calculateBalanceDeltas(allTransactions, data.supply);
  const openingMicro = calculateOpeningBalances(data, deltas);
  const groups = calculateDayGroups(orderedTransactions);
  const timeSeries = calculateGroupBalances(
    groups,
    deltas,
    nodeAddresses,
    openingMicro
  );

  const tracked = new Set(data.tracked);
  const openingBalances = new Map<string, number>();
  openingMicro.forEach((micro, addr) =>
    openingBalances.set(addr, micro / MICRO_STX_PER_STX)
  );

  const addressSummaries = new Map<string, AddressSummary>();
  networkData.nodes.forEach((node) => {
    const supply = data.supply.filter((s) => s.address === node.id);
    const sum = (kind: "mint" | "burn") =>
      supply
        .filter((s) => s.kind === kind)
        .reduce((acc, s) => acc + toMicro(s.amount), 0) / MICRO_STX_PER_STX;
    const isTracked = tracked.has(node.id) && data.balances[node.id] !== undefined;
    addressSummaries.set(node.id, {
      opening: openingBalances.get(node.id) || 0,
      minted: sum("mint"),
      burned: sum("burn"),
      finalBalance: isTracked
        ? toMicro(data.balances[node.id]) / MICRO_STX_PER_STX
        : node.balance,
      tracked: isTracked,
    });
  });

  return {
    timeSeries,
    nodeAddresses,
    orderedTransactions,
    networkData,
    groups,
    openingBalances,
    addressSummaries,
    dataHeight: data.height,
    generatedAt: data.generatedAt,
  };
};

/** Async for callers that may later load the data over the network. */
export const loadDataFromFiles = (data: TransferData = transferData) =>
  Promise.resolve(computeData(data));
