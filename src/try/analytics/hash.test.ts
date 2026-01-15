/**
 * Hash utility tests
 *
 * @module analytics/hash.test
 */

import { TextEncoder, TextDecoder } from "util"

import { hashEmail } from "./hash"

// Mock crypto.subtle.digest for testing
const mockDigest = jest.fn()

beforeAll(() => {
  // Polyfill TextEncoder/TextDecoder for jsdom environment
  global.TextEncoder = TextEncoder as typeof global.TextEncoder
  global.TextDecoder = TextDecoder as typeof global.TextDecoder

  // Set up crypto mock
  Object.defineProperty(global, "crypto", {
    value: {
      subtle: {
        digest: mockDigest,
      },
    },
    configurable: true,
  })
})

describe("hashEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should hash an email address using SHA-256", async () => {
    // SHA-256 produces 32 bytes
    const mockHashBuffer = new Uint8Array([
      0x97, 0x3d, 0xfe, 0x46, 0x39, 0x6e, 0xb5, 0xa2, 0x5c, 0x0e, 0x7e, 0x83, 0xb0, 0x3c, 0x9a, 0x04,
      0x5f, 0x27, 0x8a, 0x96, 0x10, 0x17, 0x5b, 0x59, 0x12, 0x4a, 0x65, 0xe3, 0x6d, 0x87, 0xb7, 0x48,
    ])

    mockDigest.mockResolvedValue(mockHashBuffer.buffer)

    const result = await hashEmail("test@example.com")

    expect(mockDigest).toHaveBeenCalledWith("SHA-256", expect.anything())
    expect(result).toBe("973dfe46396eb5a25c0e7e83b03c9a045f278a9610175b59124a65e36d87b748")
  })

  it("should normalize email to lowercase before hashing", async () => {
    const mockHashBuffer = new Uint8Array(32).fill(0)
    mockDigest.mockResolvedValue(mockHashBuffer.buffer)

    await hashEmail("TEST@EXAMPLE.COM")

    // Check that the encoder received lowercase email
    const call = mockDigest.mock.calls[0]
    const encodedData = call[1] as Uint8Array
    const decoder = new TextDecoder()
    const decodedEmail = decoder.decode(encodedData)

    expect(decodedEmail).toBe("test@example.com")
  })

  it("should trim whitespace before hashing", async () => {
    const mockHashBuffer = new Uint8Array(32).fill(0)
    mockDigest.mockResolvedValue(mockHashBuffer.buffer)

    await hashEmail("  test@example.com  ")

    const call = mockDigest.mock.calls[0]
    const encodedData = call[1] as Uint8Array
    const decoder = new TextDecoder()
    const decodedEmail = decoder.decode(encodedData)

    expect(decodedEmail).toBe("test@example.com")
  })

  it("should produce consistent output for the same input", async () => {
    const mockHashBuffer = new Uint8Array([
      0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90,
      0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90,
    ])

    mockDigest.mockResolvedValue(mockHashBuffer.buffer)

    const result1 = await hashEmail("user@gov.uk")
    const result2 = await hashEmail("user@gov.uk")

    expect(result1).toBe(result2)
  })

  it("should return hex string of correct length (64 characters for SHA-256)", async () => {
    const mockHashBuffer = new Uint8Array(32).fill(0xff)
    mockDigest.mockResolvedValue(mockHashBuffer.buffer)

    const result = await hashEmail("any@email.com")

    expect(result.length).toBe(64)
    expect(/^[0-9a-f]+$/.test(result)).toBe(true)
  })
})
