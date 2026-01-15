/**
 * NDX Signup Lambda - IAM Identity Store Service
 *
 * Handles user creation and management in AWS IAM Identity Center.
 * Uses AWS SDK v3 with retry logic for reliability.
 *
 * Story 1.4: Signup API Core implementation
 *
 * @module infra-signup/lib/lambda/signup/identity-store-service
 */

import {
  IdentitystoreClient,
  ListUsersCommand,
  CreateUserCommand,
  CreateGroupMembershipCommand,
  ConflictException,
  type ListUsersCommandOutput,
  type CreateUserCommandOutput,
} from "@aws-sdk/client-identitystore"
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts"
import type { SignupRequest } from "@ndx/signup-types"

/**
 * Get Identity Store ID from environment variable.
 * Read lazily to allow tests to set environment variables.
 */
function getIdentityStoreId(): string {
  return process.env.IDENTITY_STORE_ID || ""
}

/**
 * Get Group ID from environment variable.
 * Read lazily to allow tests to set environment variables.
 */
function getGroupId(): string {
  return process.env.GROUP_ID || ""
}

/**
 * Get AWS region from environment variable.
 */
function getRegion(): string {
  return process.env.AWS_REGION || "us-west-2"
}

/**
 * Get cross-account role ARN from environment variable.
 * This role is in the ISB account and has Identity Store permissions.
 */
function getCrossAccountRoleArn(): string {
  return process.env.CROSS_ACCOUNT_ROLE_ARN || ""
}

/**
 * External ID for cross-account role assumption (security best practice).
 */
const EXTERNAL_ID = "ndx-signup-external-id"

/**
 * Cached cross-account credentials.
 */
let cachedCredentials: {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
  expiration: Date
} | null = null

/**
 * STS client for assuming cross-account role.
 */
let stsClient: STSClient | null = null

/**
 * Get or create the STS client.
 */
function getStsClient(): STSClient {
  if (!stsClient) {
    stsClient = new STSClient({ region: getRegion() })
  }
  return stsClient
}

/**
 * Credentials with refresh status indicator.
 */
interface CredentialsResult {
  credentials: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken: string
  }
  /** True if credentials were just refreshed via STS, false if returned from cache */
  wasRefreshed: boolean
}

/**
 * Assume the cross-account role in ISB account.
 * Caches credentials until they're close to expiration.
 *
 * @returns Object with credentials and wasRefreshed flag indicating if STS was called
 */
async function getCrossAccountCredentials(): Promise<CredentialsResult> {
  const roleArn = getCrossAccountRoleArn()

  // If no cross-account role configured, throw error
  if (!roleArn) {
    throw new Error("CROSS_ACCOUNT_ROLE_ARN environment variable is required")
  }

  // Check if cached credentials are still valid (with 5 min buffer)
  if (cachedCredentials && cachedCredentials.expiration > new Date(Date.now() + 5 * 60 * 1000)) {
    return { credentials: cachedCredentials, wasRefreshed: false }
  }

  // Assume the cross-account role
  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: "ndx-signup-lambda",
    ExternalId: EXTERNAL_ID,
    DurationSeconds: 3600, // 1 hour
  })

  const response = await getStsClient().send(command)

  if (!response.Credentials?.AccessKeyId || !response.Credentials?.SecretAccessKey || !response.Credentials?.SessionToken) {
    throw new Error("AssumeRole did not return valid credentials")
  }

  cachedCredentials = {
    accessKeyId: response.Credentials.AccessKeyId,
    secretAccessKey: response.Credentials.SecretAccessKey,
    sessionToken: response.Credentials.SessionToken,
    expiration: response.Credentials.Expiration ?? new Date(Date.now() + 3600 * 1000),
  }

  return { credentials: cachedCredentials, wasRefreshed: true }
}

/**
 * Lazy-initialized Identity Store client.
 * Allows Lambda to reuse client across invocations.
 * Note: SDK v3 has built-in retry logic (NFR17).
 */
let client: IdentitystoreClient | null = null

/**
 * Get or create the Identity Store client with cross-account credentials.
 *
 * The client is reused across Lambda invocations to improve performance.
 * It's only recreated when credentials are refreshed (after expiration).
 *
 * @returns Promise resolving to IdentitystoreClient instance
 */
async function getClient(): Promise<IdentitystoreClient> {
  // Check credentials - may return cached or refresh via STS
  const { credentials, wasRefreshed } = await getCrossAccountCredentials()

  // Only recreate client if it doesn't exist OR credentials were just refreshed
  if (!client || wasRefreshed) {
    client = new IdentitystoreClient({
      region: getRegion(),
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    })
  }
  return client
}

/**
 * Check if required environment variables are configured.
 *
 * @throws Error if required variables are missing
 */
export function validateConfiguration(): void {
  if (!getIdentityStoreId()) {
    throw new Error("IDENTITY_STORE_ID environment variable is required")
  }
  if (!getGroupId()) {
    throw new Error("GROUP_ID environment variable is required")
  }
}

/**
 * Check if a user already exists in IAM Identity Center.
 *
 * @param email - Normalized email address to check
 * @param correlationId - Request correlation ID for logging
 * @returns Promise resolving to true if user exists
 */
export async function checkUserExists(email: string, correlationId: string): Promise<boolean> {
  validateConfiguration()

  console.log(
    JSON.stringify({
      level: "DEBUG",
      message: "Checking if user exists",
      correlationId,
    }),
  )

  try {
    const identityClient = await getClient()
    const response: ListUsersCommandOutput = await identityClient.send(
      new ListUsersCommand({
        IdentityStoreId: getIdentityStoreId(),
        Filters: [
          {
            AttributePath: "UserName",
            AttributeValue: email,
          },
        ],
      }),
    )

    const exists = (response.Users?.length ?? 0) > 0

    console.log(
      JSON.stringify({
        level: "DEBUG",
        message: exists ? "User already exists" : "User not found",
        correlationId,
      }),
    )

    return exists
  } catch (error) {
    console.log(
      JSON.stringify({
        level: "ERROR",
        message: "Failed to check user existence",
        error: error instanceof Error ? error.message : "Unknown error",
        correlationId,
      }),
    )
    throw error
  }
}

/**
 * Create a new user in IAM Identity Center and add to NDX group.
 *
 * This function:
 * 1. Creates the user in the identity store
 * 2. Adds the user to the NDX users group
 *
 * Note: Email verification is NOT sent on user creation. With "Send email OTP
 * for users created from API" enabled in IAM Identity Center, users receive
 * a one-time password email when they first attempt to sign in at the access portal.
 *
 * @param request - Signup request with user details
 * @param correlationId - Request correlation ID for logging
 * @returns Promise resolving to created user ID
 * @throws ConflictException if user already exists
 */
export async function createUser(request: SignupRequest, correlationId: string): Promise<string> {
  validateConfiguration()

  const { firstName, lastName, email } = request

  console.log(
    JSON.stringify({
      level: "INFO",
      message: "Creating user in Identity Store",
      domain: request.domain,
      correlationId,
    }),
  )

  try {
    const identityClient = await getClient()

    // Create user in Identity Store
    const createUserResponse: CreateUserCommandOutput = await identityClient.send(
      new CreateUserCommand({
        IdentityStoreId: getIdentityStoreId(),
        UserName: email,
        DisplayName: `${firstName} ${lastName}`,
        Name: {
          GivenName: firstName,
          FamilyName: lastName,
        },
        Emails: [
          {
            Value: email,
            Primary: true,
          },
        ],
      }),
    )

    const userId = createUserResponse.UserId

    if (!userId) {
      throw new Error("CreateUser did not return a UserId")
    }

    console.log(
      JSON.stringify({
        level: "INFO",
        message: "User created, adding to group",
        domain: request.domain,
        correlationId,
      }),
    )

    // Add user to NDX group
    await identityClient.send(
      new CreateGroupMembershipCommand({
        IdentityStoreId: getIdentityStoreId(),
        GroupId: getGroupId(),
        MemberId: {
          UserId: userId,
        },
      }),
    )

    console.log(
      JSON.stringify({
        level: "INFO",
        message: "User created and added to group successfully",
        domain: request.domain,
        correlationId,
      }),
    )

    return userId
  } catch (error) {
    // Handle ConflictException (user already exists)
    if (error instanceof ConflictException) {
      console.log(
        JSON.stringify({
          level: "WARN",
          message: "User already exists (conflict)",
          domain: request.domain,
          correlationId,
        }),
      )
      throw error
    }

    console.log(
      JSON.stringify({
        level: "ERROR",
        message: "Failed to create user",
        error: error instanceof Error ? error.message : "Unknown error",
        domain: request.domain,
        correlationId,
      }),
    )
    throw error
  }
}

/**
 * Reset the client and cached credentials for testing purposes.
 */
export function resetClient(): void {
  client = null
  cachedCredentials = null
  stsClient = null
}
