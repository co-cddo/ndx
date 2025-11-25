/**
 * Currency Formatting Utilities
 *
 * Story 7.6: Budget display with cost formatting
 *
 * @module currency-utils
 */

/**
 * Format a number as USD currency.
 *
 * @param amount - Amount in USD
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 *
 * @example
 * formatUSD(12.5)        // "$12.50"
 * formatUSD(0)           // "$0.00"
 * formatUSD(1234.5)      // "$1,234.50"
 * formatUSD(12.3456, 4)  // "$12.3456"
 */
export function formatUSD(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format budget display with current and max spend.
 * Story 7.6: AWS microdollar precision - 4 decimals for current, 2 for max.
 *
 * @param currentSpend - Current spend amount
 * @param maxSpend - Maximum spend limit
 * @returns Formatted budget string
 *
 * @example
 * formatBudget(12.3456, 50) // "$12.3456 / $50.00"
 */
export function formatBudget(currentSpend: number, maxSpend: number): string {
  return `${formatUSD(currentSpend, 4)} / ${formatUSD(maxSpend, 2)}`;
}

/**
 * Calculate budget usage percentage.
 *
 * @param currentSpend - Current spend amount
 * @param maxSpend - Maximum spend limit
 * @returns Percentage (0-100)
 *
 * @example
 * calculateBudgetPercentage(25, 50) // 50
 */
export function calculateBudgetPercentage(currentSpend: number, maxSpend: number): number {
  if (maxSpend === 0) return 0;
  return Math.round((currentSpend / maxSpend) * 100);
}

/**
 * Get budget status for color coding.
 *
 * NOTE: This function is implemented for future enhancement (growth feature).
 * Story 7.2 notes: "Budget progress bar could use color coding (green/yellow/red) based on usage %"
 * Currently exported and tested, but not yet used in sessions-table component.
 *
 * @param currentSpend - Current spend amount
 * @param maxSpend - Maximum spend limit
 * @returns Status: 'low' (< 50%), 'medium' (50-80%), 'high' (> 80%)
 */
export function getBudgetStatus(currentSpend: number, maxSpend: number): 'low' | 'medium' | 'high' {
  const percentage = calculateBudgetPercentage(currentSpend, maxSpend);
  if (percentage < 50) return 'low';
  if (percentage < 80) return 'medium';
  return 'high';
}
