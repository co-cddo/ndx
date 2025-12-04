/**
 * Unit tests for Currency Utilities
 *
 * Story 7.6: Budget display with cost formatting
 *
 * @jest-environment jsdom
 */

import { formatUSD, formatBudget, calculateBudgetPercentage, getBudgetStatus } from "./currency-utils"

describe("Currency Utilities", () => {
  describe("formatUSD", () => {
    it("should format zero correctly", () => {
      expect(formatUSD(0)).toBe("$0.00")
    })

    it("should format whole numbers with decimal places", () => {
      expect(formatUSD(50)).toBe("$50.00")
    })

    it("should format decimal numbers correctly", () => {
      expect(formatUSD(12.5)).toBe("$12.50")
      expect(formatUSD(12.56)).toBe("$12.56")
    })

    it("should round to two decimal places", () => {
      expect(formatUSD(12.555)).toBe("$12.56") // Rounds up
      expect(formatUSD(12.554)).toBe("$12.55") // Rounds down
    })

    it("should add thousand separators", () => {
      expect(formatUSD(1234.5)).toBe("$1,234.50")
      expect(formatUSD(1234567.89)).toBe("$1,234,567.89")
    })

    it("should handle negative numbers", () => {
      expect(formatUSD(-50)).toBe("-$50.00")
    })

    it("should handle very small amounts", () => {
      expect(formatUSD(0.01)).toBe("$0.01")
      expect(formatUSD(0.001)).toBe("$0.00") // Rounds to zero
    })
  })

  describe("formatUSD with custom decimals", () => {
    it("should format with 4 decimals for AWS microdollar precision", () => {
      expect(formatUSD(12.3456, 4)).toBe("$12.3456")
    })

    it("should format zero with 4 decimals", () => {
      expect(formatUSD(0, 4)).toBe("$0.0000")
    })

    it("should format whole numbers with 4 decimals", () => {
      expect(formatUSD(50, 4)).toBe("$50.0000")
    })
  })

  describe("formatBudget", () => {
    it("should format budget with 4 decimals for current, 2 for max (Story 7.6)", () => {
      expect(formatBudget(12.3456, 50)).toBe("$12.3456 / $50.00")
    })

    it("should handle zero current spend", () => {
      expect(formatBudget(0, 50)).toBe("$0.0000 / $50.00")
    })

    it("should handle full budget usage", () => {
      expect(formatBudget(50, 50)).toBe("$50.0000 / $50.00")
    })

    it("should handle over-budget scenario", () => {
      expect(formatBudget(60.1234, 50)).toBe("$60.1234 / $50.00")
    })

    it("should handle very precise AWS costs", () => {
      expect(formatBudget(0.0001, 50)).toBe("$0.0001 / $50.00")
    })
  })

  describe("calculateBudgetPercentage", () => {
    it("should return 0 for zero spend", () => {
      expect(calculateBudgetPercentage(0, 50)).toBe(0)
    })

    it("should return 50 for half budget", () => {
      expect(calculateBudgetPercentage(25, 50)).toBe(50)
    })

    it("should return 100 for full budget", () => {
      expect(calculateBudgetPercentage(50, 50)).toBe(100)
    })

    it("should handle over 100%", () => {
      expect(calculateBudgetPercentage(75, 50)).toBe(150)
    })

    it("should round to nearest integer", () => {
      expect(calculateBudgetPercentage(1, 3)).toBe(33) // 33.33... rounds to 33
      expect(calculateBudgetPercentage(2, 3)).toBe(67) // 66.66... rounds to 67
    })

    it("should return 0 when max spend is 0", () => {
      expect(calculateBudgetPercentage(10, 0)).toBe(0)
    })

    it("should return 0 when both are 0", () => {
      expect(calculateBudgetPercentage(0, 0)).toBe(0)
    })
  })

  describe("getBudgetStatus", () => {
    it('should return "low" for less than 50% usage', () => {
      expect(getBudgetStatus(0, 50)).toBe("low")
      expect(getBudgetStatus(24, 50)).toBe("low") // 48%
    })

    it('should return "medium" for 50-79% usage', () => {
      expect(getBudgetStatus(25, 50)).toBe("medium") // 50%
      expect(getBudgetStatus(39, 50)).toBe("medium") // 78%
    })

    it('should return "high" for 80% or more usage', () => {
      expect(getBudgetStatus(40, 50)).toBe("high") // 80%
      expect(getBudgetStatus(50, 50)).toBe("high") // 100%
      expect(getBudgetStatus(60, 50)).toBe("high") // 120% - Over budget
    })

    it('should return "low" when max spend is 0', () => {
      expect(getBudgetStatus(10, 0)).toBe("low")
    })
  })
})
