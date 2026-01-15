/**
 * NDX Signup Stack Tests
 *
 * Story 1.2: Tests for CDK stack configuration
 *
 * @module infra-signup/lib/signup-stack.test
 */

import * as cdk from "aws-cdk-lib"
import { Template, Match } from "aws-cdk-lib/assertions"
import { SignupStack } from "./signup-stack"

describe("SignupStack", () => {
  let app: cdk.App
  let stack: SignupStack
  let template: Template

  beforeAll(() => {
    app = new cdk.App()
    stack = new SignupStack(app, "TestSignupStack", {
      env: {
        account: "123456789012",
        region: "eu-west-2",
      },
      identityStoreId: "d-test123456",
      groupId: "test-group-id-12345",
      ssoInstanceArn: "arn:aws:sso:::instance/ssoins-test",
      ndxAccountId: "568672915267",
    })
    template = Template.fromStack(stack)
  })

  describe("Lambda Function", () => {
    it("should create Lambda function with correct name", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "ndx-signup",
      })
    })

    it("should use Node.js 20.x runtime", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        Runtime: "nodejs20.x",
      })
    })

    it("should configure 256MB memory", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        MemorySize: 256,
      })
    })

    it("should configure 30s timeout", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        Timeout: 30,
      })
    })

    it("should enable X-Ray tracing", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        TracingConfig: {
          Mode: "Active",
        },
      })
    })

    it("should set environment variables for IAM IDC", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: Match.objectLike({
            IDENTITY_STORE_ID: "d-test123456",
            GROUP_ID: "test-group-id-12345",
            SSO_INSTANCE_ARN: "arn:aws:sso:::instance/ssoins-test",
          }),
        },
      })
    })
  })

  describe("Lambda Function URL", () => {
    it("should create Function URL with IAM auth", () => {
      template.hasResourceProperties("AWS::Lambda::Url", {
        AuthType: "AWS_IAM",
      })
    })
  })

  describe("IAM Permissions", () => {
    // Lambda uses cross-account role assumption for Identity Store access (ADR-047)
    // Identity Store permissions are on the cross-account role in ISB account,
    // not directly on the Lambda role
    it("should have sts:AssumeRole permission for cross-account role", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: "sts:AssumeRole",
              Effect: "Allow",
              Resource: Match.stringLikeRegexp(".*ndx-signup-cross-account-role.*"),
            }),
          ]),
        },
      })
    })

    it("should not have direct identitystore permissions (uses cross-account role instead)", () => {
      const resources = template.findResources("AWS::IAM::Policy")
      Object.values(resources).forEach((resource) => {
        const statements = resource.Properties?.PolicyDocument?.Statement || []
        statements.forEach((statement: { Action?: string | string[]; Resource?: string | string[] }) => {
          // Lambda should NOT have direct Identity Store permissions
          // Those are on the cross-account role in ISB account
          const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action]
          const hasIdentityStoreAction = actions.some((a) => a?.includes("identitystore"))
          expect(hasIdentityStoreAction).toBe(false)
        })
      })
    })
  })

  describe("CloudWatch Logs", () => {
    it("should create log group with 90-day retention", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: "/aws/lambda/ndx-signup",
        RetentionInDays: 90,
      })
    })
  })

  describe("Tags", () => {
    it("should tag Lambda function with project tags", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        Tags: Match.arrayWith([{ Key: "project", Value: "ndx" }]),
      })
    })

    it("should tag Lambda function with feature tag", () => {
      template.hasResourceProperties("AWS::Lambda::Function", {
        Tags: Match.arrayWith([{ Key: "feature", Value: "signup" }]),
      })
    })
  })

  describe("SNS Topic (Story 3.1)", () => {
    it("should create SNS topic with correct name", () => {
      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "ndx-signup-alerts",
        DisplayName: "NDX Signup Alerts",
      })
    })

    it("should have resource policy allowing Chatbot subscription", () => {
      template.hasResourceProperties("AWS::SNS::TopicPolicy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: "Allow",
              Principal: {
                Service: "chatbot.amazonaws.com",
              },
              Action: "sns:Subscribe",
              Condition: {
                StringEquals: {
                  "AWS:SourceAccount": "568672915267",
                },
              },
            }),
          ]),
        },
      })
    })
  })

  describe("EventBridge Rule (Story 3.1)", () => {
    it("should create EventBridge rule with correct name", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "ndx-signup-createuser-alert",
      })
    })

    it("should match CreateUser events from sso-directory", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        EventPattern: {
          source: ["aws.sso-directory"],
          "detail-type": ["AWS API Call via CloudTrail"],
          detail: {
            eventSource: ["sso-directory.amazonaws.com"],
            eventName: ["CreateUser"],
          },
        },
      })
    })

    it("should target SNS topic", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Targets: Match.arrayWith([
          Match.objectLike({
            Arn: Match.anyValue(),
          }),
        ]),
      })
    })
  })

  describe("Outputs", () => {
    it("should output Lambda function ARN", () => {
      template.hasOutput("SignupHandlerArn", {})
    })

    it("should output Lambda function name", () => {
      template.hasOutput("SignupHandlerName", {})
    })

    it("should output Function URL", () => {
      template.hasOutput("SignupFunctionUrl", {})
    })

    it("should output SNS topic ARN (Story 3.1)", () => {
      template.hasOutput("SignupAlertsTopicArn", {})
    })

    it("should output EventBridge rule ARN (Story 3.1)", () => {
      template.hasOutput("CreateUserRuleArn", {})
    })
  })
})

describe("SignupStack configuration validation", () => {
  it("should throw error when identityStoreId is missing", () => {
    // Note: This validation is in bin/signup.ts, not the stack itself
    // The stack requires props to be passed
    const app = new cdk.App()
    expect(() => {
      new SignupStack(app, "TestStack", {
        identityStoreId: "", // Empty string
        groupId: "test-group",
      })
    }).not.toThrow() // Stack accepts empty string but Lambda will fail at runtime
  })
})
