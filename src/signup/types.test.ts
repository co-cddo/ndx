/**
 * Tests for signup shared types and type guards
 *
 * Story 1.1: Type validation tests
 *
 * @module signup/types.test
 */

import {
  SignupErrorCode,
  ERROR_MESSAGES,
  VALIDATION_CONSTRAINTS,
  FORBIDDEN_NAME_CHARS,
  isApiError,
  isSignupResponse,
} from "./types"
import type { SignupRequest, SignupResponse, ApiError, DomainInfo } from "./types"

describe("SignupErrorCode", () => {
  it("should have all expected error codes", () => {
    expect(SignupErrorCode.DOMAIN_NOT_ALLOWED).toBe("DOMAIN_NOT_ALLOWED")
    expect(SignupErrorCode.USER_EXISTS).toBe("USER_EXISTS")
    expect(SignupErrorCode.INVALID_EMAIL).toBe("INVALID_EMAIL")
    expect(SignupErrorCode.INVALID_CONTENT_TYPE).toBe("INVALID_CONTENT_TYPE")
    expect(SignupErrorCode.CSRF_INVALID).toBe("CSRF_INVALID")
    expect(SignupErrorCode.RATE_LIMITED).toBe("RATE_LIMITED")
    expect(SignupErrorCode.SERVER_ERROR).toBe("SERVER_ERROR")
  })
})

describe("ERROR_MESSAGES", () => {
  it("should have messages for all error codes", () => {
    // All error codes should have corresponding messages
    const errorCodes = Object.values(SignupErrorCode)
    errorCodes.forEach((code) => {
      expect(ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof ERROR_MESSAGES[code]).toBe("string")
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    })
  })

  it("should have the exact message for DOMAIN_NOT_ALLOWED", () => {
    expect(ERROR_MESSAGES[SignupErrorCode.DOMAIN_NOT_ALLOWED]).toBe(
      "Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access.",
    )
  })

  it("should have the exact message for USER_EXISTS", () => {
    expect(ERROR_MESSAGES[SignupErrorCode.USER_EXISTS]).toBe("Welcome back! You already have an account.")
  })
})

describe("VALIDATION_CONSTRAINTS", () => {
  it("should have correct email max length per RFC 5321", () => {
    expect(VALIDATION_CONSTRAINTS.EMAIL_MAX_LENGTH).toBe(254)
  })

  it("should have correct name constraints", () => {
    expect(VALIDATION_CONSTRAINTS.NAME_MAX_LENGTH).toBe(100)
    expect(VALIDATION_CONSTRAINTS.NAME_MIN_LENGTH).toBe(1)
  })
})

describe("FORBIDDEN_NAME_CHARS", () => {
  it("should match HTML/script tag characters", () => {
    expect(FORBIDDEN_NAME_CHARS.test("<")).toBe(true)
    expect(FORBIDDEN_NAME_CHARS.test(">")).toBe(true)
    expect(FORBIDDEN_NAME_CHARS.test("'")).toBe(true)
    expect(FORBIDDEN_NAME_CHARS.test('"')).toBe(true)
    expect(FORBIDDEN_NAME_CHARS.test("&")).toBe(true)
  })

  it("should match control characters", () => {
    expect(FORBIDDEN_NAME_CHARS.test("\x00")).toBe(true) // null byte
    expect(FORBIDDEN_NAME_CHARS.test("\x1F")).toBe(true) // unit separator
    expect(FORBIDDEN_NAME_CHARS.test("\x7F")).toBe(true) // DEL
  })

  it("should NOT match valid name characters", () => {
    expect(FORBIDDEN_NAME_CHARS.test("a")).toBe(false)
    expect(FORBIDDEN_NAME_CHARS.test("Z")).toBe(false)
    expect(FORBIDDEN_NAME_CHARS.test(" ")).toBe(false)
    expect(FORBIDDEN_NAME_CHARS.test("-")).toBe(false)
    expect(FORBIDDEN_NAME_CHARS.test(".")).toBe(false)
  })
})

describe("isApiError", () => {
  it("should return true for valid ApiError objects", () => {
    const error: ApiError = {
      error: SignupErrorCode.DOMAIN_NOT_ALLOWED,
      message: "Your organisation isn't registered yet.",
    }
    expect(isApiError(error)).toBe(true)
  })

  it("should return true for ApiError with redirectUrl", () => {
    const error: ApiError = {
      error: SignupErrorCode.USER_EXISTS,
      message: "Welcome back!",
      redirectUrl: "/login",
    }
    expect(isApiError(error)).toBe(true)
  })

  it("should return false for null", () => {
    expect(isApiError(null)).toBe(false)
  })

  it("should return false for undefined", () => {
    expect(isApiError(undefined)).toBe(false)
  })

  it("should return false for strings", () => {
    expect(isApiError("error")).toBe(false)
  })

  it("should return false for objects missing error field", () => {
    expect(isApiError({ message: "test" })).toBe(false)
  })

  it("should return false for objects missing message field", () => {
    expect(isApiError({ error: "TEST" })).toBe(false)
  })

  it("should return false for objects with non-string error", () => {
    expect(isApiError({ error: 123, message: "test" })).toBe(false)
  })

  it("should return false for objects with non-string message", () => {
    expect(isApiError({ error: "TEST", message: 123 })).toBe(false)
  })
})

describe("isSignupResponse", () => {
  it("should return true for valid SignupResponse objects", () => {
    const response: SignupResponse = {
      success: true,
    }
    expect(isSignupResponse(response)).toBe(true)
  })

  it("should return true for SignupResponse with redirectUrl", () => {
    const response: SignupResponse = {
      success: true,
      redirectUrl: "/signup/success",
    }
    expect(isSignupResponse(response)).toBe(true)
  })

  it("should return false for null", () => {
    expect(isSignupResponse(null)).toBe(false)
  })

  it("should return false for undefined", () => {
    expect(isSignupResponse(undefined)).toBe(false)
  })

  it("should return false for objects with success: false", () => {
    expect(isSignupResponse({ success: false })).toBe(false)
  })

  it("should return false for objects without success field", () => {
    expect(isSignupResponse({ redirectUrl: "/" })).toBe(false)
  })
})

describe("Redirect URL handling (Story 1.6)", () => {
  it("should handle success response with explicit redirectUrl to /signup/success", () => {
    const response: SignupResponse = {
      success: true,
      redirectUrl: "/signup/success",
    }
    expect(isSignupResponse(response)).toBe(true)
    expect(response.redirectUrl).toBe("/signup/success")
  })

  it("should handle success response without redirectUrl (defaults to /signup/success in main.ts)", () => {
    const response: SignupResponse = {
      success: true,
    }
    expect(isSignupResponse(response)).toBe(true)
    // Default handled in main.ts: response.redirectUrl ?? "/signup/success"
    expect(response.redirectUrl ?? "/signup/success").toBe("/signup/success")
  })

  it("should handle USER_EXISTS error with redirectUrl for existing user redirect", () => {
    const error: ApiError = {
      error: SignupErrorCode.USER_EXISTS,
      message: ERROR_MESSAGES[SignupErrorCode.USER_EXISTS],
      redirectUrl: "/login",
    }
    expect(isApiError(error)).toBe(true)
    expect(error.error).toBe(SignupErrorCode.USER_EXISTS)
    expect(error.redirectUrl).toBe("/login")
  })
})

describe("Type interfaces compile correctly", () => {
  it("SignupRequest should have correct structure", () => {
    const request: SignupRequest = {
      firstName: "Sarah",
      lastName: "Chen",
      email: "sarah.chen@westbury.gov.uk",
      domain: "westbury.gov.uk",
    }
    expect(request.firstName).toBe("Sarah")
    expect(request.lastName).toBe("Chen")
    expect(request.email).toBe("sarah.chen@westbury.gov.uk")
    expect(request.domain).toBe("westbury.gov.uk")
  })

  it("DomainInfo should have correct structure", () => {
    const domain: DomainInfo = {
      domain: "westbury.gov.uk",
      orgName: "Westbury District Council",
    }
    expect(domain.domain).toBe("westbury.gov.uk")
    expect(domain.orgName).toBe("Westbury District Council")
  })
})
