// src/try/auth/auth-provider.ts
var AuthState = class {
  constructor() {
    /**
     * Array of listener callbacks subscribed to auth state changes.
     * @private
     */
    this.listeners = [];
    /**
     * sessionStorage key for JWT token storage.
     * CRITICAL: This key must match across all Epic 5+ stories.
     * @private
     * @constant
     */
    this.TOKEN_KEY = "isb-jwt";
  }
  /**
   * Check if user is currently authenticated.
   *
   * Authentication is determined by the presence of a JWT token in sessionStorage.
   * This method does NOT validate the token's expiration or signature - that's
   * handled server-side by the Innovation Sandbox API.
   *
   * @returns {boolean} True if JWT token exists in sessionStorage, false otherwise
   *
   * @example
   * ```typescript
   * if (authState.isAuthenticated()) {
   *   // Show "Sign out" button
   * } else {
   *   // Show "Sign in" button
   * }
   * ```
   */
  isAuthenticated() {
    if (typeof sessionStorage === "undefined") {
      console.warn("[AuthState] sessionStorage not available, auth features disabled");
      return false;
    }
    const token = sessionStorage.getItem(this.TOKEN_KEY);
    return token !== null && token !== "";
  }
  /**
   * Subscribe to authentication state changes.
   *
   * The provided listener will be called:
   * - Immediately with the current auth state (upon subscription)
   * - Whenever the auth state changes (via notify())
   *
   * @param {AuthStateListener} listener - Callback function to invoke on auth state changes
   *
   * @example
   * ```typescript
   * authState.subscribe((isAuthenticated) => {
   *   const navElement = document.getElementById('auth-nav');
   *   if (isAuthenticated) {
   *     navElement.innerHTML = '<a href="#" data-action="signout">Sign out</a>';
   *   } else {
   *     navElement.innerHTML = '<a href="/api/auth/login">Sign in</a>';
   *   }
   * });
   * ```
   */
  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.isAuthenticated());
  }
  /**
   * Notify all subscribed listeners of authentication state change.
   *
   * This method should be called by:
   * - Story 5.3: JWT token extraction (after successful OAuth callback)
   * - Story 5.5: Sign out functionality (after clearing sessionStorage)
   * - Any other component that modifies auth state
   *
   * @example
   * ```typescript
   * // After storing JWT token in sessionStorage (Story 5.3)
   * sessionStorage.setItem('isb-jwt', token);
   * authState.notify(); // Triggers all subscribers to update UI
   *
   * // After sign out (Story 5.5)
   * sessionStorage.removeItem('isb-jwt');
   * authState.notify(); // Triggers all subscribers to update UI
   * ```
   */
  notify() {
    const isAuth = this.isAuthenticated();
    this.listeners.forEach((listener) => listener(isAuth));
  }
  /**
   * Login helper method (for future use in Story 5.3).
   *
   * Stores JWT token in sessionStorage and notifies all subscribers.
   *
   * @param {string} token - JWT token received from OAuth callback
   *
   * @example
   * ```typescript
   * // Story 5.3: JWT Token Extraction
   * const urlParams = new URLSearchParams(window.location.search);
   * const token = urlParams.get('token');
   * if (token) {
   *   authState.login(token);
   * }
   * ```
   */
  login(token) {
    if (typeof sessionStorage === "undefined") {
      console.error("[AuthState] Cannot store token - sessionStorage not available");
      return;
    }
    sessionStorage.setItem(this.TOKEN_KEY, token);
    this.notify();
  }
  /**
   * Logout helper method (for future use in Story 5.5).
   *
   * Removes JWT token from sessionStorage and notifies all subscribers.
   *
   * @example
   * ```typescript
   * // Story 5.5: Sign Out Functionality
   * document.querySelector('[data-action="signout"]').addEventListener('click', (e) => {
   *   e.preventDefault();
   *   authState.logout();
   *   window.location.href = '/';
   * });
   * ```
   */
  logout() {
    if (typeof sessionStorage === "undefined") {
      console.warn("[AuthState] sessionStorage not available, cannot clear token");
      return;
    }
    sessionStorage.removeItem(this.TOKEN_KEY);
    this.notify();
  }
};
var authState = new AuthState();

// src/try/auth/oauth-flow.ts
var RETURN_URL_KEY = "auth-return-to";
var CALLBACK_PATH = "/callback";
function storeReturnURL() {
  if (window.location.pathname === CALLBACK_PATH || window.location.pathname === `${CALLBACK_PATH}.html`) {
    return;
  }
  if (typeof sessionStorage === "undefined") {
    console.warn("[oauth-flow] sessionStorage not available, return URL not stored");
    return;
  }
  const returnURL = window.location.href;
  try {
    sessionStorage.setItem(RETURN_URL_KEY, returnURL);
  } catch (error) {
    console.warn("[oauth-flow] Failed to store return URL:", error);
  }
}
function getReturnURL() {
  if (typeof sessionStorage === "undefined") {
    console.warn("[oauth-flow] sessionStorage not available, returning home page");
    return "/";
  }
  try {
    const returnURL = sessionStorage.getItem(RETURN_URL_KEY);
    return returnURL || "/";
  } catch (error) {
    console.warn("[oauth-flow] Failed to retrieve return URL:", error);
    return "/";
  }
}
function clearReturnURL() {
  if (typeof sessionStorage === "undefined") {
    console.warn("[oauth-flow] sessionStorage not available, cannot clear return URL");
    return;
  }
  try {
    sessionStorage.removeItem(RETURN_URL_KEY);
  } catch (error) {
    console.warn("[oauth-flow] Failed to clear return URL:", error);
  }
}
function parseOAuthError() {
  const urlParams = new URLSearchParams(window.location.search);
  const errorCode = urlParams.get("error");
  if (!errorCode) {
    return null;
  }
  const errorMessages = {
    access_denied: "You cancelled the sign in process. Please try again if you want to access Try features.",
    invalid_request: "There was a problem with the sign in request. Please try again.",
    server_error: "The authentication service is temporarily unavailable. Please try again in a few minutes."
  };
  const message = errorMessages[errorCode] || "An error occurred during sign in. Please try again.";
  return { code: errorCode, message };
}
var JWT_TOKEN_KEY = "isb-jwt";
function extractTokenFromURL() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (!token || token.trim() === "") {
      return false;
    }
    try {
      sessionStorage.setItem(JWT_TOKEN_KEY, token);
      return true;
    } catch (storageError) {
      console.warn("[oauth-flow] Failed to store JWT token in sessionStorage:", storageError);
      return false;
    }
  } catch (error) {
    console.warn("[oauth-flow] Failed to extract token from URL:", error);
    return false;
  }
}
function cleanupURLAfterExtraction() {
  try {
    if (!window.history || !window.history.replaceState) {
      console.warn("[oauth-flow] History API not available, skipping URL cleanup");
      return;
    }
    const cleanURL = window.location.pathname;
    window.history.replaceState({}, document.title, cleanURL);
  } catch (error) {
    console.warn("[oauth-flow] Failed to clean up URL after token extraction:", error);
  }
}
function handleOAuthCallback() {
  console.log("[handleOAuthCallback] Starting OAuth callback handling");
  const tokenExtracted = extractTokenFromURL();
  console.log("[handleOAuthCallback] Token extracted:", tokenExtracted);
  if (!tokenExtracted) {
    console.log("[handleOAuthCallback] No token - redirecting to home");
    clearReturnURL();
    window.location.href = "/";
    return;
  }
  cleanupURLAfterExtraction();
  console.log("[handleOAuthCallback] URL cleaned, current URL:", window.location.href);
  const returnURL = getReturnURL();
  console.log("[handleOAuthCallback] Retrieved return URL:", returnURL);
  clearReturnURL();
  console.log("[handleOAuthCallback] Scheduling redirect to:", returnURL);
  setTimeout(() => {
    console.log("[handleOAuthCallback] Executing redirect now...");
    window.location.href = returnURL;
  }, 0);
}

// src/try/ui/auth-nav.ts
function initAuthNav() {
  const container2 = document.getElementById("auth-nav");
  if (!container2) {
    console.warn("[auth-nav] Container element #auth-nav not found - auth navigation not initialized");
    return;
  }
  authState.subscribe((isAuthenticated) => {
    renderAuthNav(container2, isAuthenticated);
  });
}
function renderAuthNav(container2, isAuthenticated) {
  if (isAuthenticated) {
    container2.innerHTML = `
      <a href="#" class="govuk-service-navigation__link govuk-header__link" data-module="sign-out-button" data-action="signout">
        Sign out
      </a>
    `;
    const signOutLink = container2.querySelector('[data-action="signout"]');
    if (signOutLink) {
      signOutLink.addEventListener("click", handleSignOut);
    }
  } else {
    container2.innerHTML = `
      <a href="/api/auth/login" class="govuk-service-navigation__link govuk-header__link" id="sign-in-button">
        Sign in
      </a>
    `;
    const signInButton = container2.querySelector("#sign-in-button");
    if (signInButton) {
      signInButton.addEventListener("click", () => {
        storeReturnURL();
      });
    }
  }
}
function handleSignOut(event) {
  event.preventDefault();
  authState.logout();
  window.location.href = "/";
}

// src/try/api/api-client.ts
var JWT_TOKEN_KEY2 = "isb-jwt";
var OAUTH_LOGIN_URL = "/api/auth/login";
async function callISBAPI(endpoint, options = {}) {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const headers = {
    "Content-Type": "application/json",
    ...extractHeaders(fetchOptions.headers)
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(endpoint, {
    ...fetchOptions,
    headers
  });
  if (response.status === 401 && !skipAuthRedirect) {
    clearToken();
    redirectToOAuth();
    throw new Error("Unauthorized - redirecting to login");
  }
  return response;
}
function clearToken() {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(JWT_TOKEN_KEY2);
  } catch {
  }
}
function redirectToOAuth() {
  if (typeof window === "undefined") {
    return;
  }
  window.location.href = OAUTH_LOGIN_URL;
}
async function checkAuthStatus() {
  try {
    const response = await callISBAPI("/api/auth/login/status", { skipAuthRedirect: true });
    if (response.ok) {
      const data = await response.json();
      if (data.authenticated && data.session?.user) {
        return {
          authenticated: true,
          user: data.session.user
        };
      }
      return { authenticated: false };
    } else if (response.status === 401) {
      return { authenticated: false };
    } else {
      console.error("[api-client] Auth status check failed:", response.status, response.statusText);
      return { authenticated: false };
    }
  } catch (error) {
    console.error("[api-client] Auth status check error:", error);
    return { authenticated: false };
  }
}
function getToken() {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const token = sessionStorage.getItem(JWT_TOKEN_KEY2);
    if (token === null || token === "") {
      return null;
    }
    return token;
  } catch {
    return null;
  }
}
function extractHeaders(headersInit) {
  if (!headersInit) {
    return {};
  }
  if (Array.isArray(headersInit)) {
    const result = {};
    for (const [key, value] of headersInit) {
      result[key] = value;
    }
    return result;
  }
  if (typeof headersInit.forEach === "function") {
    const result = {};
    headersInit.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  return headersInit;
}

// src/try/config.ts
var DEFAULT_AWS_SSO_PORTAL_URL = "https://d-9267e1e371.awsapps.com/start";
var DEFAULT_SSO_ROLE_NAME = "ndx_IsbUsersPS";
var DEFAULT_API_BASE_URL = "/api";
var DEFAULT_REQUEST_TIMEOUT = 1e4;
function getConfigValue(key, defaultValue) {
  const globalConfig = typeof window !== "undefined" && window.__TRY_CONFIG__ || {};
  if (globalConfig[key]) {
    return globalConfig[key];
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return defaultValue;
}
var config = {
  awsSsoPortalUrl: getConfigValue("AWS_SSO_PORTAL_URL", DEFAULT_AWS_SSO_PORTAL_URL),
  ssoRoleName: getConfigValue("SSO_ROLE_NAME", DEFAULT_SSO_ROLE_NAME),
  apiBaseUrl: getConfigValue("API_BASE_URL", DEFAULT_API_BASE_URL),
  requestTimeout: parseInt(getConfigValue("REQUEST_TIMEOUT", String(DEFAULT_REQUEST_TIMEOUT)), 10),
  oauthLoginUrl: getConfigValue("OAUTH_LOGIN_URL", "/api/auth/login"),
  oauthCallbackUrl: getConfigValue("OAUTH_CALLBACK_URL", "/callback.html")
};

// src/try/api/sessions-service.ts
var LEASES_ENDPOINT = "/api/leases";
var REQUEST_TIMEOUT = 1e4;
async function fetchUserLeases() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const authStatus = await checkAuthStatus();
    if (!authStatus.authenticated || !authStatus.user?.email) {
      console.error("[sessions-service] User not authenticated or email not available");
      return {
        success: false,
        error: "Please sign in to view your sessions."
      };
    }
    const userEmail = encodeURIComponent(authStatus.user.email);
    const endpoint = `${LEASES_ENDPOINT}?userEmail=${userEmail}`;
    const response = await callISBAPI(endpoint, {
      method: "GET",
      signal: controller.signal
      // Let 401 redirect happen naturally
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error("[sessions-service] API error:", response.status, response.statusText);
      return {
        success: false,
        error: getErrorMessage(response.status)
      };
    }
    const data = await response.json();
    let rawLeases = [];
    if (data?.status === "success" && Array.isArray(data?.data?.result)) {
      rawLeases = data.data.result;
    } else if (Array.isArray(data)) {
      rawLeases = data;
    } else if (Array.isArray(data?.leases)) {
      rawLeases = data.leases;
    }
    const leases = rawLeases.map(transformLease);
    leases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      success: true,
      leases
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("[sessions-service] Request timeout");
        return {
          success: false,
          error: "Request timed out. Please check your connection and try again."
        };
      }
      if (error.message.includes("Unauthorized")) {
        return {
          success: false,
          error: "Please sign in to view your sessions."
        };
      }
      console.error("[sessions-service] Fetch error:", error.message);
    }
    return {
      success: false,
      error: "Unable to load your sessions. Please try again."
    };
  }
}
function transformLease(raw) {
  let status = "Expired";
  switch (raw.status) {
    case "Active":
      status = "Active";
      break;
    case "Pending":
      status = "Pending";
      break;
    case "Expired":
      status = "Expired";
      break;
    case "Terminated":
      status = "Terminated";
      break;
    case "ManuallyTerminated":
      status = "ManuallyTerminated";
      break;
  }
  return {
    leaseId: raw.leaseId,
    awsAccountId: raw.awsAccountId,
    leaseTemplateId: raw.originalLeaseTemplateUuid,
    leaseTemplateName: raw.originalLeaseTemplateName,
    status,
    createdAt: raw.meta?.createdTime || raw.startDate,
    expiresAt: raw.expirationDate,
    maxSpend: raw.maxSpend,
    currentSpend: raw.totalCostAccrued,
    // SSO URL will be configured in config
    awsSsoPortalUrl: void 0
  };
}
function getErrorMessage(status) {
  switch (status) {
    case 401:
      return "Please sign in to view your sessions.";
    case 403:
      return "You do not have permission to view sessions.";
    case 404:
      return "Sessions not found.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The sandbox service is temporarily unavailable. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}
function isLeaseActive(lease) {
  return lease.status === "Active";
}
function getSsoUrl(lease) {
  if (lease.awsSsoPortalUrl) {
    return lease.awsSsoPortalUrl;
  }
  const baseUrl = config.awsSsoPortalUrl;
  const accountId = lease.awsAccountId;
  const roleName = config.ssoRoleName;
  return `${baseUrl}/#/console?account_id=${accountId}&role_name=${roleName}`;
}

// src/try/utils/date-utils.ts
function formatRelativeTime(date) {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const now = /* @__PURE__ */ new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1e3);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  if (Math.abs(diffSecs) < 60) {
    return rtf.format(diffSecs, "second");
  } else if (Math.abs(diffMins) < 60) {
    return rtf.format(diffMins, "minute");
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  } else if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, "day");
  } else {
    return formatAbsoluteDate(targetDate);
  }
}
function formatAbsoluteDate(date) {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return targetDate.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
function formatRemainingDuration(expiresAt) {
  const targetDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const now = /* @__PURE__ */ new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return null;
  }
  const hours = Math.floor(diffMs / (1e3 * 60 * 60));
  const minutes = Math.floor(diffMs % (1e3 * 60 * 60) / (1e3 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}
function formatExpiry(expiresAt) {
  const relative = formatRelativeTime(expiresAt);
  const absolute = formatAbsoluteDate(expiresAt);
  return `${relative} (${absolute})`;
}

// src/try/utils/currency-utils.ts
function formatUSD(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
function formatBudget(currentSpend, maxSpend) {
  return `${formatUSD(currentSpend)} / ${formatUSD(maxSpend)}`;
}
function calculateBudgetPercentage(currentSpend, maxSpend) {
  if (maxSpend === 0) return 0;
  return Math.round(currentSpend / maxSpend * 100);
}

// src/try/ui/components/sessions-table.ts
var STATUS_COLORS = {
  Pending: "govuk-tag--yellow",
  Active: "govuk-tag--green",
  Expired: "govuk-tag--grey",
  Terminated: "govuk-tag--red",
  ManuallyTerminated: "govuk-tag--red"
};
var STATUS_LABELS = {
  Pending: "Pending",
  Active: "Active",
  Expired: "Expired",
  Terminated: "Terminated",
  ManuallyTerminated: "Ended"
};
function renderSessionsTable(leases) {
  if (leases.length === 0) {
    return renderEmptyTable();
  }
  const rows = leases.map(renderSessionRow).join("");
  return `
    <table class="govuk-table">
      <caption class="govuk-table__caption govuk-table__caption--m govuk-visually-hidden">
        Your sandbox sessions
      </caption>
      <thead class="govuk-table__head">
        <tr class="govuk-table__row">
          <th scope="col" class="govuk-table__header">Product</th>
          <th scope="col" class="govuk-table__header">Status</th>
          <th scope="col" class="govuk-table__header">Expires</th>
          <th scope="col" class="govuk-table__header">Budget</th>
          <th scope="col" class="govuk-table__header">Actions</th>
        </tr>
      </thead>
      <tbody class="govuk-table__body">
        ${rows}
      </tbody>
    </table>
  `;
}
function renderSessionRow(lease) {
  const statusClass = STATUS_COLORS[lease.status];
  const expiry = formatExpiry(lease.expiresAt);
  const budget = formatBudget(lease.currentSpend, lease.maxSpend);
  const budgetPercentage = calculateBudgetPercentage(lease.currentSpend, lease.maxSpend);
  const remaining = isLeaseActive(lease) ? formatRemainingDuration(lease.expiresAt) : null;
  const actions = renderActions(lease);
  return `
    <tr class="govuk-table__row">
      <td class="govuk-table__cell">
        <strong>${escapeHtml(lease.leaseTemplateName)}</strong>
        ${remaining ? `<br><span class="govuk-body-s govuk-!-margin-top-1">${remaining}</span>` : ""}
      </td>
      <td class="govuk-table__cell">
        <strong class="govuk-tag ${statusClass}">${STATUS_LABELS[lease.status] || lease.status}</strong>
      </td>
      <td class="govuk-table__cell">
        ${expiry}
      </td>
      <td class="govuk-table__cell">
        ${budget}
        <br>
        <progress
          value="${budgetPercentage}"
          max="100"
          aria-label="Budget usage ${budgetPercentage}%"
          class="sessions-budget-progress"
          style="width: 100px; height: 8px;"
        ></progress>
        <span class="govuk-body-s">${budgetPercentage}%</span>
      </td>
      <td class="govuk-table__cell">
        ${actions}
      </td>
    </tr>
  `;
}
function renderActions(lease) {
  if (!isLeaseActive(lease)) {
    return '<span class="govuk-body-s">No actions available</span>';
  }
  const ssoUrl = getSsoUrl(lease);
  return `
    <a
      href="${ssoUrl}"
      target="_blank"
      rel="noopener noreferrer"
      class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0"
      data-module="govuk-button"
    >
      Launch AWS Console
      <span class="govuk-visually-hidden">(opens in new tab)</span>
    </a>
  `;
}
function renderEmptyTable() {
  return `
    <div class="govuk-inset-text">
      <p class="govuk-body">You don't have any sandbox sessions yet.</p>
      <p class="govuk-body">
        <a href="/catalogue/tags/try-before-you-buy" class="govuk-link">
          Browse products you can try
        </a>
        to get started.
      </p>
    </div>
  `;
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function renderLoadingState() {
  return `
    <div class="sessions-loading" aria-live="polite">
      <p class="govuk-body">Loading your sessions...</p>
    </div>
  `;
}
function renderErrorState(message) {
  return `
    <div class="govuk-error-summary" role="alert" aria-labelledby="error-summary-title">
      <h2 class="govuk-error-summary__title" id="error-summary-title">
        There was a problem
      </h2>
      <div class="govuk-error-summary__body">
        <p class="govuk-body">${escapeHtml(message)}</p>
        <button
          type="button"
          class="govuk-button govuk-button--secondary"
          data-action="retry-fetch"
        >
          Try again
        </button>
      </div>
    </div>
  `;
}

// src/try/ui/try-page.ts
var CONTAINER_ID = "try-sessions-container";
var currentState = {
  loading: false,
  error: null,
  leases: []
};
var container = null;
function initTryPage() {
  container = document.getElementById(CONTAINER_ID);
  if (!container) {
    return;
  }
  authState.subscribe((isAuthenticated) => {
    if (isAuthenticated) {
      loadAndRenderSessions();
    } else {
      renderEmptyState(container);
    }
  });
  container.addEventListener("click", (event) => {
    const target = event.target;
    if (target.dataset.action === "retry-fetch") {
      loadAndRenderSessions();
    }
  });
}
async function loadAndRenderSessions() {
  if (!container) return;
  currentState = { loading: true, error: null, leases: [] };
  container.innerHTML = `
    <h1 class="govuk-heading-l">Your try sessions</h1>
    ${renderLoadingState()}
  `;
  const result = await fetchUserLeases();
  if (result.success && result.leases) {
    currentState = { loading: false, error: null, leases: result.leases };
    renderAuthenticatedState(container, result.leases);
  } else {
    currentState = { loading: false, error: result.error || "Unknown error", leases: [] };
    container.innerHTML = `
      <h1 class="govuk-heading-l">Your try sessions</h1>
      ${renderErrorState(currentState.error)}

      <hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible">

      <h2 class="govuk-heading-m">Want to try more products?</h2>
      <p class="govuk-body">
        Browse our catalogue to find products available for evaluation through the Innovation Sandbox programme.
      </p>
      <a href="/catalogue/tags/try-before-you-buy" class="govuk-link">
        Browse products you can try
      </a>

      ${renderFirstTimeGuidance()}
    `;
  }
}
function renderEmptyState(container2) {
  container2.innerHTML = `
    <h1 class="govuk-heading-l">Sign in to view your try sessions</h1>
    <p class="govuk-body">
      You need to sign in with your Innovation Sandbox account to request and manage AWS sandbox environments.
    </p>
    <a href="/api/auth/login" role="button" draggable="false" class="govuk-button govuk-button--start" data-module="govuk-button">
      Sign in
      <svg class="govuk-button__start-icon" xmlns="http://www.w3.org/2000/svg" width="17.5" height="19" viewBox="0 0 33 40" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z" />
      </svg>
    </a>
  `;
}
function renderAuthenticatedState(container2, leases) {
  const hasLeases = leases.length > 0;
  const activeCount = leases.filter((l) => l.status === "Active").length;
  const pendingCount = leases.filter((l) => l.status === "Pending").length;
  let summaryText = "";
  if (hasLeases) {
    const parts = [];
    if (activeCount > 0) parts.push(`${activeCount} active`);
    if (pendingCount > 0) parts.push(`${pendingCount} pending`);
    summaryText = parts.length > 0 ? `You have ${parts.join(" and ")} session${activeCount + pendingCount > 1 ? "s" : ""}.` : "";
  }
  container2.innerHTML = `
    <h1 class="govuk-heading-l">Your try sessions</h1>

    ${summaryText ? `<p class="govuk-body-l">${summaryText}</p>` : ""}

    ${renderSessionsTable(leases)}

    <hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible">

    <h2 class="govuk-heading-m">Want to try more products?</h2>
    <p class="govuk-body">
      Browse our catalogue to find products available for evaluation through the Innovation Sandbox programme.
    </p>
    <a href="/catalogue/tags/try-before-you-buy" class="govuk-link">
      Browse products you can try
    </a>

    ${!hasLeases ? renderFirstTimeGuidance() : ""}
  `;
}
function renderFirstTimeGuidance() {
  return `
    <div class="govuk-inset-text govuk-!-margin-top-6">
      <h3 class="govuk-heading-s">New to Try Before You Buy?</h3>
      <p class="govuk-body">
        With Innovation Sandbox, you can evaluate AWS products in a secure sandbox environment
        for 24 hours with a $50 budget. Here's how to get started:
      </p>
      <ol class="govuk-list govuk-list--number">
        <li>Browse the catalogue for products marked "Try Before You Buy"</li>
        <li>Click "Try this now for 24 hours" on a product page</li>
        <li>Accept the Acceptable Use Policy</li>
        <li>Your sandbox session will appear here within minutes</li>
      </ol>
    </div>
  `;
}

// src/try/ui/utils/focus-trap.ts
var FOCUSABLE_SELECTORS = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");
function createFocusTrap(container2, options = {}) {
  let active = false;
  let previouslyFocused = null;
  function getFocusableElements() {
    const elements = container2.querySelectorAll(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(
      (el) => el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).visibility !== "hidden"
    );
  }
  function handleKeydown(event) {
    if (!active) return;
    if (event.key === "Escape") {
      event.preventDefault();
      options.onEscape?.();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;
    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];
    const activeElement = document.activeElement;
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }
    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
      return;
    }
  }
  return {
    activate() {
      if (active) return;
      active = true;
      previouslyFocused = options.returnFocus || document.activeElement;
      document.addEventListener("keydown", handleKeydown);
      const focusable = getFocusableElements();
      const initialElement = options.initialFocus || focusable[0];
      requestAnimationFrame(() => {
        if (initialElement) {
          initialElement.focus();
        } else if (focusable.length > 0) {
          focusable[0].focus();
        }
      });
    },
    deactivate() {
      if (!active) return;
      active = false;
      document.removeEventListener("keydown", handleKeydown);
      if (previouslyFocused) {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
    },
    isActive() {
      return active;
    }
  };
}

// src/try/ui/utils/aria-live.ts
var liveRegion = null;
function getLiveRegion() {
  if (liveRegion && document.body.contains(liveRegion)) {
    return liveRegion;
  }
  liveRegion = document.createElement("div");
  liveRegion.id = "aria-live-region";
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.className = "govuk-visually-hidden";
  document.body.appendChild(liveRegion);
  return liveRegion;
}
function announce(message, priority = "polite") {
  const region = getLiveRegion();
  region.setAttribute("aria-live", priority);
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

// src/try/api/configurations-service.ts
var FALLBACK_AUP = `
Acceptable Use Policy for AWS Innovation Sandbox

By using this service, you agree to:

1. Use sandbox resources only for evaluation and testing purposes
2. Not store any sensitive, personal, or production data
3. Not exceed the allocated budget limit
4. Comply with all AWS and government acceptable use policies
5. Report any security incidents immediately

Resources will be automatically terminated after the session expires.

For full terms, please contact the Innovation Sandbox team.
`.trim();
var DEFAULT_CONFIG = {
  aup: FALLBACK_AUP,
  maxLeases: 5,
  leaseDuration: 24
};
var CONFIGURATIONS_ENDPOINT = "/api/configurations";
var REQUEST_TIMEOUT2 = 1e4;
async function fetchConfigurations() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT2);
  try {
    const response = await callISBAPI(CONFIGURATIONS_ENDPOINT, {
      method: "GET",
      signal: controller.signal,
      skipAuthRedirect: true
      // Don't redirect on 401, we'll show error in modal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error("[configurations-service] API error:", response.status, response.statusText);
      return {
        success: false,
        error: getErrorMessage2(response.status)
      };
    }
    const data = await response.json();
    if (!data.aup || typeof data.aup !== "string") {
      console.warn("[configurations-service] Invalid AUP in response, using fallback");
      return {
        success: true,
        data: {
          ...DEFAULT_CONFIG,
          ...data,
          aup: data.aup || DEFAULT_CONFIG.aup
        }
      };
    }
    return {
      success: true,
      data: {
        maxLeases: data.maxLeases ?? DEFAULT_CONFIG.maxLeases,
        leaseDuration: data.leaseDuration ?? DEFAULT_CONFIG.leaseDuration,
        aup: data.aup
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("[configurations-service] Request timeout");
        return {
          success: false,
          error: "Request timed out. Please check your connection and try again."
        };
      }
      console.error("[configurations-service] Fetch error:", error.message);
    }
    return {
      success: false,
      error: "Unable to load configuration. Please try again."
    };
  }
}
function getErrorMessage2(status) {
  switch (status) {
    case 401:
      return "Please sign in to continue.";
    case 403:
      return "You do not have permission to access this resource.";
    case 404:
      return "Configuration not found. Please contact support.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The sandbox service is temporarily unavailable. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}
function getFallbackAup() {
  return FALLBACK_AUP;
}

// src/try/ui/components/aup-modal.ts
var IDS = {
  MODAL: "aup-modal",
  TITLE: "aup-modal-title",
  DESCRIPTION: "aup-modal-description",
  AUP_CONTENT: "aup-content",
  CHECKBOX: "aup-accept-checkbox",
  CONTINUE_BTN: "aup-continue-btn",
  CANCEL_BTN: "aup-cancel-btn",
  ERROR: "aup-error"
};
var BODY_MODAL_OPEN_CLASS = "aup-modal-open";
var ERROR_HIDDEN_CLASS = "aup-modal__error--hidden";
var AupModal = class {
  constructor() {
    this.overlay = null;
    this.focusTrap = null;
    this.state = {
      isOpen: false,
      tryId: null,
      aupAccepted: false,
      isLoading: false,
      error: null
    };
    this.onAccept = null;
  }
  /**
   * Open the modal for a specific try product.
   *
   * @param tryId - The product's try_id UUID
   * @param onAccept - Callback when user accepts AUP and clicks Continue
   */
  open(tryId, onAccept) {
    if (this.state.isOpen) {
      console.warn("[AupModal] Modal already open");
      return;
    }
    this.state.tryId = tryId;
    this.state.isOpen = true;
    this.state.aupAccepted = false;
    this.state.error = null;
    this.onAccept = onAccept;
    this.render();
    this.setupFocusTrap();
    document.body.classList.add(BODY_MODAL_OPEN_CLASS);
    announce("Request AWS Sandbox Access dialog opened");
    this.loadAupContent();
  }
  /**
   * Load AUP content from the configurations API.
   * Story 6.7: Fetch and display AUP from Innovation Sandbox API
   */
  async loadAupContent() {
    const aupContent = document.getElementById(IDS.AUP_CONTENT);
    if (!aupContent) return;
    aupContent.textContent = "Loading Acceptable Use Policy...";
    announce("Loading Acceptable Use Policy");
    try {
      const result = await fetchConfigurations();
      if (result.success && result.data?.aup) {
        aupContent.textContent = result.data.aup;
        announce("Acceptable Use Policy loaded");
      } else {
        console.warn("[AupModal] Failed to fetch AUP:", result.error);
        aupContent.textContent = getFallbackAup();
        if (result.error) {
          this.showError(result.error + " Using default policy.");
        }
      }
    } catch (error) {
      console.error("[AupModal] Error loading AUP:", error);
      aupContent.textContent = getFallbackAup();
      this.showError("Unable to load policy. Using default policy.");
    }
  }
  /**
   * Close the modal.
   *
   * @param confirmed - If true, skip confirmation when checkbox is checked
   */
  close(confirmed = false) {
    if (!this.state.isOpen) return;
    if (this.state.aupAccepted && !confirmed && !this.state.isLoading) {
      const shouldClose = window.confirm("Are you sure you want to cancel? Your acceptance will be lost.");
      if (!shouldClose) return;
    }
    this.state.isOpen = false;
    this.state.tryId = null;
    this.state.aupAccepted = false;
    this.state.error = null;
    this.onAccept = null;
    this.focusTrap?.deactivate();
    this.focusTrap = null;
    this.overlay?.remove();
    this.overlay = null;
    document.body.classList.remove(BODY_MODAL_OPEN_CLASS);
    announce("Dialog closed");
  }
  /**
   * Set the AUP content to display.
   *
   * @param content - AUP text or HTML content
   */
  setAupContent(content) {
    const aupContent = document.getElementById(IDS.AUP_CONTENT);
    if (aupContent) {
      aupContent.textContent = content;
    }
  }
  /**
   * Show loading state.
   *
   * @param message - Loading message to display
   */
  showLoading(message = "Loading...") {
    this.state.isLoading = true;
    const body = this.overlay?.querySelector(".aup-modal__body");
    if (body) {
      body.innerHTML = `
        <div class="aup-modal__loading" aria-live="polite">
          <div class="aup-modal__spinner" aria-hidden="true"></div>
          <span>${message}</span>
        </div>
      `;
    }
    this.updateButtons();
    announce(message);
  }
  /**
   * Show error message.
   *
   * @param message - Error message to display
   */
  showError(message) {
    this.state.error = message;
    this.state.isLoading = false;
    const errorEl = document.getElementById(IDS.ERROR);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove(ERROR_HIDDEN_CLASS);
    }
    this.updateButtons();
    announce(message, "assertive");
  }
  /**
   * Hide error message.
   */
  hideError() {
    this.state.error = null;
    const errorEl = document.getElementById(IDS.ERROR);
    if (errorEl) {
      errorEl.classList.add(ERROR_HIDDEN_CLASS);
    }
  }
  /**
   * Get current modal state.
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Render the modal HTML.
   * Styles are defined in styles.scss to comply with CSP (no inline styles).
   */
  render() {
    this.overlay = document.createElement("div");
    this.overlay.className = "aup-modal-overlay";
    this.overlay.setAttribute("aria-hidden", "false");
    this.overlay.innerHTML = `
      <div
        id="${IDS.MODAL}"
        class="aup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="${IDS.TITLE}"
        aria-describedby="${IDS.DESCRIPTION}"
      >
        <div class="aup-modal__header">
          <h2 id="${IDS.TITLE}" class="govuk-heading-l aup-modal__title">Request AWS Sandbox Access</h2>
        </div>
        <div class="aup-modal__body">
          <div id="${IDS.DESCRIPTION}" class="aup-modal__info">
            <p class="govuk-body aup-modal__info-text">
              <strong>Session duration:</strong> 24 hours
            </p>
            <p class="govuk-body aup-modal__info-text">
              <strong>Budget limit:</strong> $50 USD
            </p>
          </div>

          <div id="${IDS.ERROR}" class="aup-modal__error aup-modal__error--hidden govuk-body" role="alert"></div>

          <h3 class="govuk-heading-s">Acceptable Use Policy</h3>
          <div class="aup-modal__aup-container">
            <p id="${IDS.AUP_CONTENT}" class="govuk-body-s aup-modal__aup-content">Loading AUP content...</p>
          </div>

          <div class="aup-modal__checkbox-group govuk-checkboxes">
            <div class="govuk-checkboxes__item">
              <input
                type="checkbox"
                id="${IDS.CHECKBOX}"
                class="govuk-checkboxes__input"
                aria-describedby="${IDS.DESCRIPTION}"
              />
              <label for="${IDS.CHECKBOX}" class="govuk-label govuk-checkboxes__label">
                I have read and accept the Acceptable Use Policy
              </label>
            </div>
          </div>
        </div>
        <div class="aup-modal__footer">
          <button
            id="${IDS.CONTINUE_BTN}"
            type="button"
            class="govuk-button"
            disabled
            aria-disabled="true"
          >
            Continue
          </button>
          <button
            id="${IDS.CANCEL_BTN}"
            type="button"
            class="govuk-button govuk-button--secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);
    this.attachEventListeners();
  }
  /**
   * Attach event listeners to modal elements.
   */
  attachEventListeners() {
    const checkbox = document.getElementById(IDS.CHECKBOX);
    const continueBtn = document.getElementById(IDS.CONTINUE_BTN);
    const cancelBtn = document.getElementById(IDS.CANCEL_BTN);
    checkbox?.addEventListener("change", () => {
      this.state.aupAccepted = checkbox.checked;
      this.updateButtons();
      if (checkbox.checked) {
        announce("Acceptable Use Policy accepted. Continue button is now enabled.");
      } else {
        announce("Acceptable Use Policy not accepted. Continue button is disabled.");
      }
    });
    continueBtn?.addEventListener("click", async () => {
      if (!this.state.aupAccepted || this.state.isLoading || !this.state.tryId) return;
      this.state.isLoading = true;
      this.updateButtons();
      announce("Requesting your sandbox...");
      try {
        await this.onAccept?.(this.state.tryId);
      } catch (error) {
        this.state.isLoading = false;
        this.updateButtons();
      }
    });
    cancelBtn?.addEventListener("click", () => {
      this.close();
    });
  }
  /**
   * Update button disabled states.
   */
  updateButtons() {
    const continueBtn = document.getElementById(IDS.CONTINUE_BTN);
    const cancelBtn = document.getElementById(IDS.CANCEL_BTN);
    if (continueBtn) {
      const shouldDisable = !this.state.aupAccepted || this.state.isLoading;
      continueBtn.disabled = shouldDisable;
      continueBtn.setAttribute("aria-disabled", String(shouldDisable));
      if (this.state.isLoading) {
        continueBtn.textContent = "Requesting...";
      } else {
        continueBtn.textContent = "Continue";
      }
    }
    if (cancelBtn) {
      cancelBtn.disabled = this.state.isLoading;
      cancelBtn.setAttribute("aria-disabled", String(this.state.isLoading));
    }
  }
  /**
   * Setup focus trap for the modal.
   */
  setupFocusTrap() {
    const modal = document.getElementById(IDS.MODAL);
    if (!modal) return;
    this.focusTrap = createFocusTrap(modal, {
      onEscape: () => this.close(),
      initialFocus: document.getElementById(IDS.CANCEL_BTN)
    });
    this.focusTrap.activate();
  }
};
var aupModal = new AupModal();
function openAupModal(tryId, onAccept) {
  aupModal.open(tryId, onAccept);
}
function closeAupModal(confirmed = false) {
  aupModal.close(confirmed);
}

// src/try/api/leases-service.ts
var API_ERRORS = {
  NO_ACCOUNTS: "No accounts are available to lease",
  MAX_LEASES: "maximum number of active/pending leases allowed",
  TEMPLATE_NOT_FOUND: "Lease template not found",
  ACCESS_DENIED: "Access denied",
  USER_NOT_FOUND: "User not found in Identity Center"
};
var LEASES_ENDPOINT2 = "/api/leases";
var REQUEST_TIMEOUT3 = 1e4;
function getApiErrorMessage(errorData) {
  if (!errorData || typeof errorData !== "object") return "";
  const data = errorData;
  return data?.data?.errors?.[0]?.message || "";
}
function matchesApiError(message, errorKey) {
  return message.toLowerCase().includes(API_ERRORS[errorKey].toLowerCase());
}
async function createLease(leaseTemplateId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT3);
  const payload = {
    leaseTemplateUuid: leaseTemplateId,
    comments: "User accepted the Acceptable Use Policy via NDX portal."
  };
  try {
    const response = await callISBAPI(LEASES_ENDPOINT2, {
      method: "POST",
      body: JSON.stringify(payload),
      signal: controller.signal
      // Let 401 redirect happen naturally (user needs to re-authenticate)
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const lease = await response.json();
      return {
        success: true,
        lease
      };
    }
    const errorData = await response.json().catch(() => null);
    const errorMessage = getApiErrorMessage(errorData);
    switch (response.status) {
      case 409: {
        if (matchesApiError(errorMessage, "NO_ACCOUNTS")) {
          return {
            success: false,
            errorCode: "CONFLICT",
            error: "No sandbox accounts are currently available. Please try again later."
          };
        }
        return {
          success: false,
          errorCode: "CONFLICT",
          error: "You've reached the maximum number of active sessions. Please end an existing session before starting a new one."
        };
      }
      case 404: {
        console.error("[leases-service] Not found:", errorMessage);
        if (matchesApiError(errorMessage, "TEMPLATE_NOT_FOUND")) {
          return {
            success: false,
            errorCode: "NOT_FOUND",
            error: "This sandbox template is no longer available."
          };
        }
        if (matchesApiError(errorMessage, "USER_NOT_FOUND")) {
          return {
            success: false,
            errorCode: "UNAUTHORIZED",
            error: "Your account is not registered for sandbox access. Please contact support."
          };
        }
        return {
          success: false,
          errorCode: "NOT_FOUND",
          error: "The requested resource was not found."
        };
      }
      case 400: {
        console.error("[leases-service] Bad request:", errorMessage);
        return {
          success: false,
          errorCode: "SERVER_ERROR",
          error: "Invalid request. Please try again or contact support."
        };
      }
      case 401:
        return {
          success: false,
          errorCode: "UNAUTHORIZED",
          error: "Please sign in to continue."
        };
      case 403: {
        console.error("[leases-service] Forbidden:", errorMessage);
        return {
          success: false,
          errorCode: "UNAUTHORIZED",
          error: "You do not have permission to request this sandbox."
        };
      }
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          success: false,
          errorCode: "SERVER_ERROR",
          error: "The sandbox service is temporarily unavailable. Please try again later."
        };
      default:
        console.error("[leases-service] Unexpected status:", response.status);
        return {
          success: false,
          errorCode: "SERVER_ERROR",
          error: "An unexpected error occurred. Please try again."
        };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("[leases-service] Request timeout");
        return {
          success: false,
          errorCode: "TIMEOUT",
          error: "Request timed out. Please check your connection and try again."
        };
      }
      if (error.message.includes("Unauthorized")) {
        return {
          success: false,
          errorCode: "UNAUTHORIZED",
          error: "Please sign in to continue."
        };
      }
      console.error("[leases-service] Fetch error:", error.message);
    }
    return {
      success: false,
      errorCode: "NETWORK_ERROR",
      error: "Unable to connect to the sandbox service. Please check your connection."
    };
  }
}

// src/try/ui/try-button.ts
var RETURN_URL_KEY2 = "isb-return-url";
function initTryButton() {
  const tryButtons = document.querySelectorAll(
    "button[data-try-id], a[data-try-id]"
  );
  console.log("[TryButton] Found", tryButtons.length, "try button(s)");
  tryButtons.forEach((button) => {
    button.addEventListener("click", handleTryButtonClick);
  });
}
function handleTryButtonClick(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const tryId = button.dataset.tryId;
  if (!tryId) {
    console.error("[TryButton] Button missing data-try-id attribute");
    return;
  }
  if (!authState.isAuthenticated()) {
    storeReturnUrl();
    window.location.href = "/api/auth/login";
    return;
  }
  console.log("[TryButton] User authenticated, opening AUP modal with tryId:", tryId);
  openAupModal(tryId, handleLeaseAccept);
}
async function handleLeaseAccept(tryId) {
  console.log("[TryButton] Submitting lease request for tryId:", tryId);
  const result = await createLease(tryId);
  if (result.success) {
    console.log("[TryButton] Lease created successfully:", result.lease);
    closeAupModal(true);
    window.location.href = "/try";
    return;
  }
  switch (result.errorCode) {
    case "CONFLICT":
      console.log("[TryButton] Max sessions reached");
      closeAupModal(true);
      alert(result.error);
      window.location.href = "/try";
      break;
    case "UNAUTHORIZED":
      console.log("[TryButton] Unauthorized - redirecting to login");
      closeAupModal(true);
      window.location.href = "/api/auth/login";
      break;
    case "TIMEOUT":
    case "NETWORK_ERROR":
    case "SERVER_ERROR":
    default:
      console.error("[TryButton] Lease request failed:", result.error);
      aupModal.showError(result.error || "An error occurred. Please try again.");
      break;
  }
}
function storeReturnUrl() {
  if (typeof sessionStorage === "undefined") {
    console.warn("[TryButton] sessionStorage not available");
    return;
  }
  sessionStorage.setItem(RETURN_URL_KEY2, window.location.href);
}

// src/try/main.ts
function handlePageOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const hasError = urlParams.has("error");
  if (token && token.trim() !== "") {
    handleOAuthCallback();
  } else if (hasError) {
    const error = parseOAuthError();
    if (error) {
      const contentDiv = document.getElementById("main-content");
      if (contentDiv) {
        const errorHTML = `
          <div class="govuk-error-summary" data-module="govuk-error-summary">
            <div role="alert">
              <h2 class="govuk-error-summary__title">Authentication Error</h2>
              <div class="govuk-error-summary__body">
                <p>${error.message}</p>
                <p><a href="/" class="govuk-link">Return to homepage</a></p>
              </div>
            </div>
          </div>
        `;
        contentDiv.insertAdjacentHTML("afterbegin", errorHTML);
      }
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  handlePageOAuthCallback();
  initAuthNav();
  initTryPage();
  initTryButton();
});
export {
  cleanupURLAfterExtraction,
  extractTokenFromURL,
  handleOAuthCallback,
  parseOAuthError
};
//# sourceMappingURL=try.bundle.js.map
