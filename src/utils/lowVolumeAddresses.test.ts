import { describe, it, expect } from "vitest";
import {
  parseTransactionData,
  calculateNetworkData,
  MIN_STX_THRESHOLD,
} from "./parseTransactions";
import { csvFiles, loadDataFromFiles } from "./loadData";

describe("Low Volume Addresses", () => {
  it("should correctly calculate low volume address transactions from filtered nodes", async () => {
    const {
      orderedTransactions: allTransactions,
      networkData,
      nodeAddresses: displayedNodeIds,
    } = await loadDataFromFiles();

    // Calculate sent/received for displayed addresses
    const displayedTotals = networkData.nodes.reduce(
      (acc, node) => ({
        sent: acc.sent + node.sent,
        received: acc.received + node.received,
      }),
      { sent: 0, received: 0 }
    );

    // Calculate actual low volume transactions
    // These are transactions involving addresses not in the displayed nodes
    let lowVolumeSentActual = 0;
    let lowVolumeReceivedActual = 0;

    allTransactions.forEach((tx) => {
      const senderIsDisplayed = displayedNodeIds.has(tx.sender);
      const recipientIsDisplayed = displayedNodeIds.has(tx.recipient);

      // If sender is displayed but recipient is not, it's sent to low volume
      if (senderIsDisplayed && !recipientIsDisplayed) {
        lowVolumeReceivedActual += tx.amount;
      }

      // If recipient is displayed but sender is not, it's received from low volume
      if (!senderIsDisplayed && recipientIsDisplayed) {
        lowVolumeSentActual += tx.amount;
      }

      if (!senderIsDisplayed && !recipientIsDisplayed) {
        console.log("outside tx", tx);
      }
    });

    expect(lowVolumeReceivedActual).toBe(100);
    expect(lowVolumeSentActual).toBe(0);

    // Calculate what the AddressesPage calculates for low volume
    const netDifference = displayedTotals.sent - displayedTotals.received;
    const lowVolumeReceivedCalculated = netDifference > 0 ? netDifference : 0;
    const lowVolumeSentCalculated = netDifference < 0 ? -netDifference : 0;

    // Verify conservation: total sent = total received
    const totalSentAcrossAll = displayedTotals.sent + lowVolumeSentActual;
    const totalReceivedAcrossAll =
      displayedTotals.received + lowVolumeReceivedActual;

    expect(totalSentAcrossAll).toBeCloseTo(totalReceivedAcrossAll, 2);

    // Verify the low volume calculations match actual transactions with low volume addresses
    expect(lowVolumeReceivedCalculated).toBeCloseTo(lowVolumeReceivedActual, 2);
    expect(lowVolumeSentCalculated).toBeCloseTo(lowVolumeSentActual, 2);

    // Additional verification: net difference should equal the difference in low volume transactions
    const actualNetDifference = lowVolumeReceivedActual - lowVolumeSentActual;
    expect(netDifference).toBeCloseTo(actualNetDifference, 2);
  });

  it("should identify correct addresses as low volume (below threshold)", async () => {
    const {
      orderedTransactions: allTransactions,
      networkData,
      nodeAddresses: displayedNodeIds,
    } = await loadDataFromFiles();
    // Track all addresses and their totals
    const allAddressTotals: Record<string, { sent: number; received: number }> =
      {};

    allTransactions.forEach((tx) => {
      if (!allAddressTotals[tx.sender]) {
        allAddressTotals[tx.sender] = { sent: 0, received: 0 };
      }
      if (!allAddressTotals[tx.recipient]) {
        allAddressTotals[tx.recipient] = { sent: 0, received: 0 };
      }

      allAddressTotals[tx.sender].sent += tx.amount;
      allAddressTotals[tx.recipient].received += tx.amount;
    });

    // Count low volume addresses
    let lowVolumeCount = 0;
    let highVolumeNotDisplayedCount = 0;

    Object.entries(allAddressTotals).forEach(([address, totals]) => {
      const totalVolume = totals.sent + totals.received;
      const isDisplayed = displayedNodeIds.has(address);

      if (totalVolume < MIN_STX_THRESHOLD) {
        lowVolumeCount++;
        // Low volume addresses should NOT be displayed
        expect(isDisplayed).toBe(false);
      } else {
        // High volume addresses SHOULD be displayed
        if (!isDisplayed) {
          highVolumeNotDisplayedCount++;
        }
        expect(isDisplayed).toBe(true);
      }
    });

    expect(lowVolumeCount).toBe(2);
    expect(highVolumeNotDisplayedCount).toBe(0);
  });
});
