#!/usr/bin/env node
import * as cdk from "aws-cdk-lib"
import { NdxStaticStack } from "../lib/ndx-stack"
import { NdxNotificationStack } from "../lib/notification-stack"
import { GitHubActionsStack } from "../lib/github-actions-stack"
import { WafStack } from "../lib/waf-stack"

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
    branch: "main",
  },
  contentBucketName: "ndx-static-prod",
  distributionId: "E3THG4UHYDHVWP",
})

// WAF Stack for signup rate limiting (Story 3.2)
// IMPORTANT: WAF for CloudFront MUST be deployed to us-east-1
// Deploy separately: cdk deploy NdxWaf --region us-east-1
const wafEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT || "568672915267",
  region: "us-east-1", // CloudFront WAF requires us-east-1
}

new WafStack(app, "NdxWaf", {
  env: wafEnv,
  distributionId: "E3THG4UHYDHVWP",
  description: "NDX WAF - Rate limiting for signup API (Story 3.2)",
})
