/**
 * Smoke tests for the NDX ISB client adapter.
 *
 * Full test coverage lives in co-cddo/innovation-sandbox-on-aws-client.
 * These tests only verify the adapter wiring is correct.
 */
import {
  fetchLeaseFromISB,
  fetchLeaseByKey,
  fetchAccountFromISB,
  fetchTemplateFromISB,
  resetTokenCache,
  constructLeaseId,
  parseLeaseId,
  signJwt,
} from "./isb-client"

describe("ISB client adapter smoke tests", () => {
  it("exports all expected functions", () => {
    expect(typeof fetchLeaseFromISB).toBe("function")
    expect(typeof fetchLeaseByKey).toBe("function")
    expect(typeof fetchAccountFromISB).toBe("function")
    expect(typeof fetchTemplateFromISB).toBe("function")
    expect(typeof resetTokenCache).toBe("function")
    expect(typeof constructLeaseId).toBe("function")
    expect(typeof parseLeaseId).toBe("function")
    expect(typeof signJwt).toBe("function")
  })

  it("constructLeaseId produces decodable base64", () => {
    const id = constructLeaseId("user@example.com", "test-uuid")
    const decoded = JSON.parse(Buffer.from(id, "base64").toString("utf-8"))
    expect(decoded).toEqual({ userEmail: "user@example.com", uuid: "test-uuid" })
  })

  it("parseLeaseId round-trips with constructLeaseId", () => {
    const id = constructLeaseId("user@example.com", "test-uuid")
    expect(parseLeaseId(id)).toEqual({ userEmail: "user@example.com", uuid: "test-uuid" })
  })

  it("signJwt produces a three-part JWT", () => {
    const token = signJwt({ user: { email: "test@example.com" } }, "secret")
    expect(token.split(".")).toHaveLength(3)
  })
})
