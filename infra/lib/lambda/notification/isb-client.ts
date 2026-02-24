/**
 * ISB API Client — thin adapter for NDX notification service.
 *
 * Wraps @co-cddo/isb-client with NDX-specific configuration.
 * All business logic lives in the library; this file only provides
 * NDX's service identity and powertools logger.
 */
import { Logger } from "@aws-lambda-powertools/logger"
import {
  createISBClient,
  type ISBLeaseRecord,
  type ISBAccountRecord,
  type ISBTemplateRecord,
} from "@co-cddo/isb-client"

// Re-export types so enrichment.ts imports are unchanged
export type {
  ISBLeaseRecord,
  ISBAccountRecord,
  ISBTemplateRecord,
  ISBClientConfig,
  JSendResponse,
} from "@co-cddo/isb-client"

// Re-export pure utilities
export { constructLeaseId, parseLeaseId, signJwt } from "@co-cddo/isb-client"

const logger = new Logger({ serviceName: "ndx-notifications" })

const NDX_SERVICE_IDENTITY = { email: "ndx+notifier@dsit.gov.uk", roles: ["Admin"] }

let _client: ReturnType<typeof createISBClient> | null = null

function getClient(): ReturnType<typeof createISBClient> {
  if (!_client) {
    _client = createISBClient({
      serviceIdentity: NDX_SERVICE_IDENTITY,
      logger: {
        debug: (msg, extra) => logger.debug(msg, extra as Record<string, unknown>),
        warn: (msg, extra) => logger.warn(msg, extra as Record<string, unknown>),
        error: (msg, extra) => logger.error(msg, extra as Record<string, unknown>),
      },
    })
  }
  return _client
}

export async function fetchLeaseFromISB(leaseId: string, correlationId: string): Promise<ISBLeaseRecord | null> {
  return getClient().fetchLease(leaseId, correlationId)
}

export async function fetchLeaseByKey(
  userEmail: string,
  uuid: string,
  correlationId: string,
): Promise<ISBLeaseRecord | null> {
  return getClient().fetchLeaseByKey(userEmail, uuid, correlationId)
}

export async function fetchAccountFromISB(
  awsAccountId: string,
  correlationId: string,
): Promise<ISBAccountRecord | null> {
  return getClient().fetchAccount(awsAccountId, correlationId)
}

export async function fetchTemplateFromISB(
  templateName: string,
  correlationId: string,
): Promise<ISBTemplateRecord | null> {
  return getClient().fetchTemplate(templateName, correlationId)
}

export function resetTokenCache(): void {
  getClient().resetTokenCache()
}
