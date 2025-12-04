/**
 * Unit tests for DynamoDB to Template field name mapping
 *
 * Tests that enriched data from DynamoDB is properly mapped to
 * GOV.UK Notify template field names.
 *
 * This test imports the formatters directly from templates.ts
 * and re-implements the mapping function to test the logic in isolation.
 */

import { formatCurrency, formatUKDate } from "./templates"

// Re-implement the mapping function for testing
// This mirrors the implementation in handler.ts but without all the mocks
function mapEnrichedFieldsToTemplateNames(enrichedData: Record<string, string>): Record<string, string> {
  const mapped = { ...enrichedData }

  // Map awsAccountId → accountId (no formatting needed)
  if (mapped.awsAccountId !== undefined && mapped.accountId === undefined) {
    mapped.accountId = mapped.awsAccountId
  }

  // Map maxSpend → budgetLimit with currency formatting (£X.XX)
  if (mapped.maxSpend !== undefined && mapped.budgetLimit === undefined) {
    const amount = parseFloat(mapped.maxSpend)
    mapped.budgetLimit = isNaN(amount) ? mapped.maxSpend : formatCurrency(amount)
  }

  // Map expirationDate → expiryDate with UK date formatting (DD/MM/YYYY, HH:MM:SS in Europe/London)
  if (mapped.expirationDate !== undefined && mapped.expiryDate === undefined) {
    mapped.expiryDate = formatUKDate(mapped.expirationDate)
  }

  return mapped
}

describe("Field Name Mapping (DynamoDB → Template)", () => {
  test("maps all DynamoDB fields to template fields with formatting", () => {
    const enrichedData = {
      awsAccountId: "831494785845",
      maxSpend: "5",
      expirationDate: "2025-12-04T12:33:59.578Z",
    }

    const mapped = mapEnrichedFieldsToTemplateNames(enrichedData)

    // awsAccountId → accountId (no formatting)
    expect(mapped.accountId).toBe("831494785845")
    expect(mapped.awsAccountId).toBe("831494785845") // Original preserved

    // maxSpend → budgetLimit (formatted as $X.XX - AWS costs are in USD)
    expect(mapped.budgetLimit).toBe("$5.00")
    expect(mapped.maxSpend).toBe("5") // Original preserved

    // expirationDate → expiryDate (formatted as DD/MM/YYYY, HH:MM:SS in Europe/London)
    expect(mapped.expiryDate).toBe("04/12/2025, 12:33:59")
    expect(mapped.expirationDate).toBe("2025-12-04T12:33:59.578Z") // Original preserved
  })

  test("does not overwrite existing accountId", () => {
    const enrichedData = {
      awsAccountId: "831494785845",
      accountId: "999999999999", // Already set
    }

    const mapped = mapEnrichedFieldsToTemplateNames(enrichedData)

    expect(mapped.accountId).toBe("999999999999") // Preserved
    expect(mapped.awsAccountId).toBe("831494785845")
  })

  test("handles missing awsAccountId gracefully", () => {
    const enrichedData = {
      maxSpend: "5",
      expirationDate: "2025-12-04T12:33:59.578Z",
    }

    const mapped = mapEnrichedFieldsToTemplateNames(enrichedData)

    expect(mapped.accountId).toBeUndefined()
    expect(mapped.maxSpend).toBe("5")
  })

  test("handles empty enriched data", () => {
    const mapped = mapEnrichedFieldsToTemplateNames({})
    expect(mapped).toEqual({})
  })

  test("does not mutate original input", () => {
    const enrichedData = {
      awsAccountId: "831494785845",
    }
    const original = { ...enrichedData }

    mapEnrichedFieldsToTemplateNames(enrichedData)

    expect(enrichedData).toEqual(original)
  })
})
