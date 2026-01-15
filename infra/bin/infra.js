#!/usr/bin/env node
"use strict"
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        var desc = Object.getOwnPropertyDescriptor(m, k)
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k]
            },
          }
        }
        Object.defineProperty(o, k2, desc)
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v })
      }
    : function (o, v) {
        o["default"] = v
      })
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = []
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k
          return ar
        }
      return ownKeys(o)
    }
    return function (mod) {
      if (mod && mod.__esModule) return mod
      var result = {}
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i])
      __setModuleDefault(result, mod)
      return result
    }
  })()
Object.defineProperty(exports, "__esModule", { value: true })
const cdk = __importStar(require("aws-cdk-lib"))
const ndx_stack_1 = require("../lib/ndx-stack")
const notification_stack_1 = require("../lib/notification-stack")
const github_actions_stack_1 = require("../lib/github-actions-stack")
const waf_stack_1 = require("../lib/waf-stack")
const app = new cdk.App()
// Environment configuration shared by all stacks
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || "568672915267",
  region: process.env.CDK_DEFAULT_REGION || "us-west-2",
}
// Static site infrastructure (S3, CloudFront, Cookie Router)
new ndx_stack_1.NdxStaticStack(app, "NdxStatic", {
  /* Use environment from AWS CLI configuration (NDX/InnovationSandboxHub profile)
   * Account: 568672915267
   * Region: us-west-2
   * Profile is specified via --profile flag during cdk deploy/synth */
  env,
})
// Notification infrastructure (Lambda, EventBridge, DLQ, Alarms)
// Separate stack for independent lifecycle and isolated blast radius
new notification_stack_1.NdxNotificationStack(app, "NdxNotification", {
  env,
  description: "NDX Notification System - EventBridge integration with GOV.UK Notify and Slack",
})
// GitHub Actions OIDC integration for CI/CD
// Creates IAM roles for content deployment (S3) and infrastructure deployment (CDK)
new github_actions_stack_1.GitHubActionsStack(app, "NdxGitHubActions", {
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
new waf_stack_1.WafStack(app, "NdxWaf", {
  env: wafEnv,
  distributionId: "E3THG4UHYDHVWP",
  description: "NDX WAF - Rate limiting for signup API (Story 3.2)",
})
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxpREFBa0M7QUFDbEMsZ0RBQWlEO0FBQ2pELGtFQUFnRTtBQUNoRSxzRUFBZ0U7QUFDaEUsZ0RBQTJDO0FBRTNDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFBO0FBRXpCLGlEQUFpRDtBQUNqRCxNQUFNLEdBQUcsR0FBRztJQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLGNBQWM7SUFDMUQsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksV0FBVztDQUN0RCxDQUFBO0FBRUQsNkRBQTZEO0FBQzdELElBQUksMEJBQWMsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFO0lBQ25DOzs7eUVBR3FFO0lBQ3JFLEdBQUc7Q0FDSixDQUFDLENBQUE7QUFFRixpRUFBaUU7QUFDakUscUVBQXFFO0FBQ3JFLElBQUkseUNBQW9CLENBQUMsR0FBRyxFQUFFLGlCQUFpQixFQUFFO0lBQy9DLEdBQUc7SUFDSCxXQUFXLEVBQUUsZ0ZBQWdGO0NBQzlGLENBQUMsQ0FBQTtBQUVGLDRDQUE0QztBQUM1QyxvRkFBb0Y7QUFDcEYsSUFBSSx5Q0FBa0IsQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLEVBQUU7SUFDOUMsR0FBRztJQUNILE1BQU0sRUFBRTtRQUNOLEtBQUssRUFBRSxTQUFTO1FBQ2hCLElBQUksRUFBRSxLQUFLO1FBQ1gsTUFBTSxFQUFFLE1BQU07S0FDZjtJQUNELGlCQUFpQixFQUFFLGlCQUFpQjtJQUNwQyxjQUFjLEVBQUUsZ0JBQWdCO0NBQ2pDLENBQUMsQ0FBQTtBQUVGLGlEQUFpRDtBQUNqRCw4REFBOEQ7QUFDOUQsMERBQTBEO0FBQzFELE1BQU0sTUFBTSxHQUFHO0lBQ2IsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksY0FBYztJQUMxRCxNQUFNLEVBQUUsV0FBVyxFQUFFLG9DQUFvQztDQUMxRCxDQUFBO0FBRUQsSUFBSSxvQkFBUSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUU7SUFDMUIsR0FBRyxFQUFFLE1BQU07SUFDWCxjQUFjLEVBQUUsZ0JBQWdCO0lBQ2hDLFdBQVcsRUFBRSxvREFBb0Q7Q0FDbEUsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiXG5pbXBvcnQgeyBOZHhTdGF0aWNTdGFjayB9IGZyb20gXCIuLi9saWIvbmR4LXN0YWNrXCJcbmltcG9ydCB7IE5keE5vdGlmaWNhdGlvblN0YWNrIH0gZnJvbSBcIi4uL2xpYi9ub3RpZmljYXRpb24tc3RhY2tcIlxuaW1wb3J0IHsgR2l0SHViQWN0aW9uc1N0YWNrIH0gZnJvbSBcIi4uL2xpYi9naXRodWItYWN0aW9ucy1zdGFja1wiXG5pbXBvcnQgeyBXYWZTdGFjayB9IGZyb20gXCIuLi9saWIvd2FmLXN0YWNrXCJcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKVxuXG4vLyBFbnZpcm9ubWVudCBjb25maWd1cmF0aW9uIHNoYXJlZCBieSBhbGwgc3RhY2tzXG5jb25zdCBlbnYgPSB7XG4gIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQgfHwgXCI1Njg2NzI5MTUyNjdcIixcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgXCJ1cy13ZXN0LTJcIixcbn1cblxuLy8gU3RhdGljIHNpdGUgaW5mcmFzdHJ1Y3R1cmUgKFMzLCBDbG91ZEZyb250LCBDb29raWUgUm91dGVyKVxubmV3IE5keFN0YXRpY1N0YWNrKGFwcCwgXCJOZHhTdGF0aWNcIiwge1xuICAvKiBVc2UgZW52aXJvbm1lbnQgZnJvbSBBV1MgQ0xJIGNvbmZpZ3VyYXRpb24gKE5EWC9Jbm5vdmF0aW9uU2FuZGJveEh1YiBwcm9maWxlKVxuICAgKiBBY2NvdW50OiA1Njg2NzI5MTUyNjdcbiAgICogUmVnaW9uOiB1cy13ZXN0LTJcbiAgICogUHJvZmlsZSBpcyBzcGVjaWZpZWQgdmlhIC0tcHJvZmlsZSBmbGFnIGR1cmluZyBjZGsgZGVwbG95L3N5bnRoICovXG4gIGVudixcbn0pXG5cbi8vIE5vdGlmaWNhdGlvbiBpbmZyYXN0cnVjdHVyZSAoTGFtYmRhLCBFdmVudEJyaWRnZSwgRExRLCBBbGFybXMpXG4vLyBTZXBhcmF0ZSBzdGFjayBmb3IgaW5kZXBlbmRlbnQgbGlmZWN5Y2xlIGFuZCBpc29sYXRlZCBibGFzdCByYWRpdXNcbm5ldyBOZHhOb3RpZmljYXRpb25TdGFjayhhcHAsIFwiTmR4Tm90aWZpY2F0aW9uXCIsIHtcbiAgZW52LFxuICBkZXNjcmlwdGlvbjogXCJORFggTm90aWZpY2F0aW9uIFN5c3RlbSAtIEV2ZW50QnJpZGdlIGludGVncmF0aW9uIHdpdGggR09WLlVLIE5vdGlmeSBhbmQgU2xhY2tcIixcbn0pXG5cbi8vIEdpdEh1YiBBY3Rpb25zIE9JREMgaW50ZWdyYXRpb24gZm9yIENJL0NEXG4vLyBDcmVhdGVzIElBTSByb2xlcyBmb3IgY29udGVudCBkZXBsb3ltZW50IChTMykgYW5kIGluZnJhc3RydWN0dXJlIGRlcGxveW1lbnQgKENESylcbm5ldyBHaXRIdWJBY3Rpb25zU3RhY2soYXBwLCBcIk5keEdpdEh1YkFjdGlvbnNcIiwge1xuICBlbnYsXG4gIGdpdGh1Yjoge1xuICAgIG93bmVyOiBcImNvLWNkZG9cIixcbiAgICByZXBvOiBcIm5keFwiLFxuICAgIGJyYW5jaDogXCJtYWluXCIsXG4gIH0sXG4gIGNvbnRlbnRCdWNrZXROYW1lOiBcIm5keC1zdGF0aWMtcHJvZFwiLFxuICBkaXN0cmlidXRpb25JZDogXCJFM1RIRzRVSFlESFZXUFwiLFxufSlcblxuLy8gV0FGIFN0YWNrIGZvciBzaWdudXAgcmF0ZSBsaW1pdGluZyAoU3RvcnkgMy4yKVxuLy8gSU1QT1JUQU5UOiBXQUYgZm9yIENsb3VkRnJvbnQgTVVTVCBiZSBkZXBsb3llZCB0byB1cy1lYXN0LTFcbi8vIERlcGxveSBzZXBhcmF0ZWx5OiBjZGsgZGVwbG95IE5keFdhZiAtLXJlZ2lvbiB1cy1lYXN0LTFcbmNvbnN0IHdhZkVudiA9IHtcbiAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCB8fCBcIjU2ODY3MjkxNTI2N1wiLFxuICByZWdpb246IFwidXMtZWFzdC0xXCIsIC8vIENsb3VkRnJvbnQgV0FGIHJlcXVpcmVzIHVzLWVhc3QtMVxufVxuXG5uZXcgV2FmU3RhY2soYXBwLCBcIk5keFdhZlwiLCB7XG4gIGVudjogd2FmRW52LFxuICBkaXN0cmlidXRpb25JZDogXCJFM1RIRzRVSFlESFZXUFwiLFxuICBkZXNjcmlwdGlvbjogXCJORFggV0FGIC0gUmF0ZSBsaW1pdGluZyBmb3Igc2lnbnVwIEFQSSAoU3RvcnkgMy4yKVwiLFxufSlcbiJdfQ==
