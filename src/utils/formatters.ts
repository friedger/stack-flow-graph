/**
 * Centralized formatting utilities for dates, addresses, and amounts
 */

/**
 * Format timestamp to date and time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string with time (e.g., "Jan 15, 2024, 10:30 AM")
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format timestamp to date only (no time)
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string without time (e.g., "Jan 15, 2024")
 */
export const formatDayOnly = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format blockchain address for display (truncated with ellipsis)
 * @param address - Full blockchain address
 * @param startChars - Number of characters to show at start (default: 8)
 * @param endChars - Number of characters to show at end (default: 6)
 * @returns Truncated address (e.g., "SP123456...ABC123")
 */
export const formatAddress = (
  address: string,
  startChars: number = 8,
  endChars: number = 6
): string => {
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
};

/**
 * Format number amount with thousand separators
 * @param amount - Numeric amount to format
 * @returns Formatted number string (e.g., "1,234,567")
 */
export const formatAmount = (amount: number): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
