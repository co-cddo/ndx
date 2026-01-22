/**
 * Analytics Module - Public API
 *
 * Re-exports the public interface for the analytics module.
 * Import from this file for cleaner imports.
 *
 * @module analytics
 *
 * @example
 * ```typescript
 * import { initGA4, trackTryButtonClick, hasAnalyticsConsent } from './analytics';
 * ```
 */

// Core analytics functions
export { initGA4, disableGA4, isGA4Active, setUserId, setUserProperties, trackEvent, trackPageView } from "./analytics"

// Consent management
export {
  getCookieConsent,
  setCookieConsent,
  hasAnalyticsConsent,
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
} from "./consent"

// Hashing utility
export { hashEmail } from "./hash"

// Typed event tracking
export {
  trackPageViewEvent,
  trackTryButtonClick,
  trackAupViewed,
  trackAupAccepted,
  trackSignIn,
  trackSignOut,
  trackSessionAccess,
  trackCliCredentials,
  trackCloudFormationAccess,
  trackNavClick,
  trackExternalLink,
  trackConsentChoice,
} from "./events"

// Cookie banner initialization
export { initCookieBanner, initCookieSettings, initAnalytics } from "./cookie-banner"

// Types
export type { CookieConsent } from "./consent"
export type { UserProperties } from "./analytics"
