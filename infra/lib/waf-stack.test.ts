/**
 * NDX WAF Stack Tests
 *
 * Story 3.2: Tests for WAF rate limiting configuration
 *
 * @module infra/lib/waf-stack.test
 */

import * as cdk from "aws-cdk-lib"
import { Template, Match } from "aws-cdk-lib/assertions"
import { WafStack } from "./waf-stack"

describe("WafStack", () => {
  let app: cdk.App
  let stack: WafStack
  let template: Template

  beforeAll(() => {
    app = new cdk.App()
    stack = new WafStack(app, "TestWafStack", {
      env: {
        account: "123456789012",
        region: "us-east-1", // WAF for CloudFront must be us-east-1
      },
      distributionId: "E3TESTDISTID",
    })
    template = Template.fromStack(stack)
  })

  describe("WAF WebACL", () => {
    it("should create WebACL with CLOUDFRONT scope", () => {
      template.hasResourceProperties("AWS::WAFv2::WebACL", {
        Scope: "CLOUDFRONT",
        Name: "ndx-signup-rate-limit",
      })
    })

    it("should have default allow action", () => {
      template.hasResourceProperties("AWS::WAFv2::WebACL", {
        DefaultAction: { Allow: {} },
      })
    })

    it("should enable CloudWatch metrics", () => {
      template.hasResourceProperties("AWS::WAFv2::WebACL", {
        VisibilityConfig: Match.objectLike({
          CloudWatchMetricsEnabled: true,
          MetricName: "ndx-signup-waf",
          SampledRequestsEnabled: true,
        }),
      })
    })
  })

  describe("Rate-based Rule", () => {
    it("should have rate-based rule with limit of 10", () => {
      template.hasResourceProperties("AWS::WAFv2::WebACL", {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: "signup-rate-limit-per-ip",
            Statement: {
              RateBasedStatement: Match.objectLike({
                Limit: 10,
                AggregateKeyType: "IP",
              }),
            },
          }),
        ]),
      })
    })

    it("should scope rule to /signup-api/signup path", () => {
      template.hasResourceProperties("AWS::WAFv2::WebACL", {
        Rules: Match.arrayWith([
          Match.objectLike({
            Statement: {
              RateBasedStatement: Match.objectLike({
                ScopeDownStatement: {
                  ByteMatchStatement: {
                    FieldToMatch: { UriPath: {} },
                    PositionalConstraint: "STARTS_WITH",
                    SearchString: "/signup-api/signup",
                    TextTransformations: [{ Priority: 0, Type: "NONE" }],
                  },
                },
              }),
            },
          }),
        ]),
      })
    })

    it("should block with 429 custom response", () => {
      template.hasResourceProperties("AWS::WAFv2::WebACL", {
        Rules: Match.arrayWith([
          Match.objectLike({
            Action: {
              Block: {
                CustomResponse: Match.objectLike({
                  ResponseCode: 429,
                  CustomResponseBodyKey: "rate-limited-response",
                }),
              },
            },
          }),
        ]),
      })
    })

    it("should have custom response body with RATE_LIMITED error", () => {
      template.hasResourceProperties("AWS::WAFv2::WebACL", {
        CustomResponseBodies: {
          "rate-limited-response": {
            ContentType: "APPLICATION_JSON",
            Content: Match.stringLikeRegexp("RATE_LIMITED"),
          },
        },
      })
    })
  })

  describe("WAF Logging", () => {
    it("should create CloudWatch log group with correct name prefix", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: "aws-waf-logs-ndx-signup",
        RetentionInDays: 90,
      })
    })

    it("should configure logging to CloudWatch", () => {
      template.hasResourceProperties("AWS::WAFv2::LoggingConfiguration", {
        LogDestinationConfigs: Match.anyValue(),
      })
    })
  })

  describe("Outputs", () => {
    it("should output WebACL ARN", () => {
      template.hasOutput("WebAclArn", {})
    })

    it("should output WebACL ID", () => {
      template.hasOutput("WebAclId", {})
    })

    it("should output WAF log group ARN", () => {
      template.hasOutput("WafLogGroupArn", {})
    })
  })
})
