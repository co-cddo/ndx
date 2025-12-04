#!/usr/bin/env node
import * as cdk from "aws-cdk-lib"
import { NdxStaticStack } from "../lib/ndx-stack"
import { NdxNotificationStack } from "../lib/notification-stack"
import { GitHubActionsStack } from "../lib/github-actions-stack"

const app = new cdk.App()

// Environment configuration shared by all stacks
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || "568672915267",
  region: process.env.CDK_DEFAULT_REGION || "us-west-2",
}

// Static site infrastructure (S3, CloudFront, Cookie Router)
new NdxStaticStack(app, "NdxStatic", {
  /* Use environment from AWS CLI configuration (NDX/InnovationSandboxHub profile)
   * Account: 568672915267
   * Region: us-west-2
   * Profile is specified via --profile flag during cdk deploy/synth */
  env,
})

// Notification infrastructure (Lambda, EventBridge, DLQ, Alarms)
// Separate stack for independent lifecycle and isolated blast radius
new NdxNotificationStack(app, "NdxNotification", {
  env,
  description: "NDX Notification System - EventBridge integration with GOV.UK Notify and Slack",
})

// GitHub Actions OIDC integration for CI/CD
// Creates IAM roles for content deployment (S3) and infrastructure deployment (CDK)
new GitHubActionsStack(app, "NdxGitHubActions", {
  env,
  github: {
    owner: "co-cddo",
    repo: "ndx",
    branch: "try/aws", // Change to 'main' after testing
  },
  contentBucketName: "ndx-static-prod",
  distributionId: "E3THG4UHYDHVWP",
})
