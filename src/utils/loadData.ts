// Import CSV files
import csv1 from "../data/transactions-SP1BJGDG8MSM64DMH33A0F1NB0DT40YGBPSW00NES.csv?raw";
import csv2 from "../data/transactions-SP30742YR27SYJF29W9GRS7PT2PNECBKKBQP2GHNC.csv?raw";
import csv3 from "../data/transactions-SP26E434SDGRSA9QF5D65A3WZ29Y0MXD9AMXFJYDC.csv?raw";
import csv4 from "../data/transactions-SM1Z6BP8PDKYKXTZXXSKXFEY6NQ7RAM7DAEAYR045.csv?raw";
import csv5 from "../data/transactions-SM30W6WZKNRJKTPVN09J7D8T2R989ZM25VBG2GHNC.csv?raw";
import { calculateGroupBalances, calculateNetworkData, isSIP031Address, parseTransactionData, TimeSeriesBalance } from "./parseTransactions";

export const csvFiles = [
  {
    name: "transactions-SP1BJGDG8MSM64DMH33A0F1NB0DT40YGBPSW00NES.csv",
    content: csv1,
  },
  {
    name: "transactions-SP30742YR27SYJF29W9GRS7PT2PNECBKKBQP2GHNC.csv",
    content: csv2,
  },
  {
    name: "transactions-SP26E434SDGRSA9QF5D65A3WZ29Y0MXD9AMXFJYDC.csv",
    content: csv3,
  },
  {
    name: "transactions-SM1Z6BP8PDKYKXTZXXSKXFEY6NQ7RAM7DAEAYR045.csv",
    content: csv4,
  },
  {
    name: "transactions-SM30W6WZKNRJKTPVN09J7D8T2R989ZM25VBG2GHNC.csv",
    content: csv5,
  },
];

export const loadDataFromFiles = async () => {
  const orderedTransactions = await parseTransactionData(csvFiles);
  const networkData = calculateNetworkData(orderedTransactions);

  const nodeAddresses = new Set(networkData.nodes.map((n) => n.id));

  // Set initial balance for SP000...sip-031 contract (200m STX on Sept 17, 2025)
  const initialBalances: Map<string, number> = new Map();
  const sip031Address = networkData.nodes.find((n) =>
    isSIP031Address(n.id)
  ).id;
  if (sip031Address) {
    initialBalances.set(sip031Address, 200_000_000);
  }

  const timeSeries = calculateGroupBalances(
    orderedTransactions,
    nodeAddresses,
    initialBalances
  );

  const groups = Array.from(timeSeries.keys());

  return { timeSeries, nodeAddresses, orderedTransactions, networkData, groups };
};
