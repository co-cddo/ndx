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
 * @returns Formatted currency string
 *
 * @example
 * formatUSD(12.5)   // "$12.50"
 * formatUSD(0)      // "$0.00"
 * formatUSD(1234.5) // "$1,234.50"
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format budget display with current and max spend.
 *
 * @param currentSpend - Current spend amount
 * @param maxSpend - Maximum spend limit
 * @returns Formatted budget string
 *
 * @example
 * formatBudget(12.5, 50) // "$12.50 / $50.00"
 */
export function formatBudget(currentSpend: number, maxSpend: number): string {
  return `${formatUSD(currentSpend)} / ${formatUSD(maxSpend)}`;
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
