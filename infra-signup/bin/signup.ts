#!/usr/bin/env node
/**
 * NDX Signup Infrastructure - CDK App Entry Point
 *
 * Story 1.1: Placeholder CDK app entry
 * Story 1.2: Configure the SignupStack with Lambda and IAM permissions
 *
 * @module infra-signup/bin/signup
 */

import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import { SignupStack } from "../lib/signup-stack"

const app = new cdk.App()

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "eu-west-2",
}

// IAM Identity Center configuration
// These values must be provided via environment variables or CDK context
// See README.md for required environment variables
const identityStoreId =
  (app.node.tryGetContext("identityStoreId") as string | undefined) ?? process.env.IDENTITY_STORE_ID
const groupId = (app.node.tryGetContext("groupId") as string | undefined) ?? process.env.GROUP_ID
const ssoInstanceArn = (app.node.tryGetContext("ssoInstanceArn") as string | undefined) ?? process.env.SSO_INSTANCE_ARN
const distributionId = (app.node.tryGetContext("distributionId") as string | undefined) ?? process.env.DISTRIBUTION_ID

// Slack configuration for Chatbot alerts (Story 3.1)
const slackWorkspaceId =
  (app.node.tryGetContext("slackWorkspaceId") as string | undefined) ?? process.env.SLACK_WORKSPACE_ID
const slackChannelId = (app.node.tryGetContext("slackChannelId") as string | undefined) ?? process.env.SLACK_CHANNEL_ID

// Validate required configuration
if (!identityStoreId) {
  throw new Error(
    "Missing required configuration: identityStoreId. " +
      "Provide via CDK context (-c identityStoreId=...) or IDENTITY_STORE_ID environment variable.",
  )
}

if (!groupId) {
  throw new Error(
    "Missing required configuration: groupId. " +
      "Provide via CDK context (-c groupId=...) or GROUP_ID environment variable.",
  )
}

new SignupStack(app, "NdxSignupStack", {
  env,
  description: "NDX Signup Lambda and CloudFront configuration",
  identityStoreId,
  groupId,
  ssoInstanceArn,
  distributionId,
  slackWorkspaceId,
  slackChannelId,
})
