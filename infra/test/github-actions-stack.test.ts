import { App } from "aws-cdk-lib"
import { Template, Match } from "aws-cdk-lib/assertions"
import { GitHubActionsStack } from "../lib/github-actions-stack"

/**
 * Tests for GitHubActionsStack
 *
 * These tests verify the IAM roles and trust policies for GitHub Actions OIDC integration,
 * with particular focus on the InfraDiffRole's fork protection mechanism.
 */
describe("GitHubActionsStack", () => {
  let template: Template

  beforeAll(() => {
    const app = new App()
    const stack = new GitHubActionsStack(app, "TestGitHubActions", {
      env: { account: "123456789012", region: "us-west-2" },
      github: {
        owner: "co-cddo",
        repo: "ndx",
        branch: "main",
      },
      contentBucketName: "test-content-bucket",
      distributionId: "TESTDIST123",
    })
    template = Template.fromStack(stack)
  })

  describe("InfraDiffRole (readonly, fork-protected)", () => {
    test("creates InfraDiffRole with correct name", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "GitHubActions-NDX-InfraDiff",
      })
    })

    test("InfraDiffRole has repository_owner condition for fork protection", () => {
      // This is the CRITICAL security control that prevents forks from assuming the role
      // The repository_owner claim in GitHub OIDC tokens contains the owner of the repo
      // that triggered the workflow. For forks, this will be the fork owner, not 'co-cddo'.
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "GitHubActions-NDX-InfraDiff",
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: "sts:AssumeRoleWithWebIdentity",
              Condition: {
                StringEquals: Match.objectLike({
                  "token.actions.githubusercontent.com:repository_owner": "co-cddo",
                }),
              },
            }),
          ]),
        },
      })
    })

    test("InfraDiffRole allows any branch pattern from origin repo", () => {
      // The diff role should allow any branch, unlike the deploy role which requires main
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "GitHubActions-NDX-InfraDiff",
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: "sts:AssumeRoleWithWebIdentity",
              Condition: {
                StringLike: Match.objectLike({
                  "token.actions.githubusercontent.com:sub": Match.arrayWith([
                    "repo:co-cddo/ndx:ref:refs/heads/*",
                  ]),
                }),
              },
            }),
          ]),
        },
      })
    })

    test("InfraDiffRole allows pull_request events", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "GitHubActions-NDX-InfraDiff",
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: "sts:AssumeRoleWithWebIdentity",
              Condition: {
                StringLike: Match.objectLike({
                  "token.actions.githubusercontent.com:sub": Match.arrayWith([
                    "repo:co-cddo/ndx:pull_request",
                  ]),
                }),
              },
            }),
          ]),
        },
      })
    })

    test("InfraDiffRole has CloudFormation read-only permissions", () => {
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: "CloudFormationReadOnly",
              Effect: "Allow",
              Action: Match.arrayWith([
                "cloudformation:DescribeStacks",
                "cloudformation:GetTemplate",
              ]),
            }),
          ]),
        },
      })
    })

    test("InfraDiffRole can only assume CDK lookup role (not deploy)", () => {
      // This ensures the diff role cannot perform deployments, only lookups
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: "AssumeCDKLookupRole",
              Action: "sts:AssumeRole",
              Condition: {
                StringEquals: {
                  "iam:ResourceTag/aws-cdk:bootstrap-role": ["lookup"],
                },
              },
            }),
          ]),
        },
      })
    })
  })

  describe("InfraDeployRole (main branch only)", () => {
    test("InfraDeployRole still requires main branch", () => {
      // Verify the deploy role still has restrictive branch conditions
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "GitHubActions-NDX-InfraDeploy",
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: "sts:AssumeRoleWithWebIdentity",
              Condition: {
                StringLike: Match.objectLike({
                  "token.actions.githubusercontent.com:sub": Match.arrayWith([
                    "repo:co-cddo/ndx:ref:refs/heads/main",
                  ]),
                }),
              },
            }),
          ]),
        },
      })
    })

    test("InfraDeployRole can assume all CDK bootstrap roles", () => {
      // Deploy role needs access to deploy, lookup, file-publishing, image-publishing
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: "AssumeCDKRoles",
              Action: "sts:AssumeRole",
              Condition: {
                StringEquals: {
                  "iam:ResourceTag/aws-cdk:bootstrap-role": [
                    "deploy",
                    "lookup",
                    "file-publishing",
                    "image-publishing",
                  ],
                },
              },
            }),
          ]),
        },
      })
    })
  })

  describe("ContentDeployRole", () => {
    test("ContentDeployRole exists with correct name", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "GitHubActions-NDX-ContentDeploy",
      })
    })
  })

  describe("Stack outputs", () => {
    test("outputs InfraDiffRoleArn", () => {
      template.hasOutput("InfraDiffRoleArn", {
        Description: "IAM Role ARN for infrastructure diff (read-only, fork-protected)",
      })
    })

    test("outputs InfraDeployRoleArn", () => {
      template.hasOutput("InfraDeployRoleArn", {
        Description: "IAM Role ARN for infrastructure deployment",
      })
    })

    test("outputs ContentDeployRoleArn", () => {
      template.hasOutput("ContentDeployRoleArn", {
        Description: "IAM Role ARN for content deployment",
      })
    })
  })
})
