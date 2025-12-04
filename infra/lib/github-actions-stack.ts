import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * GitHub repository configuration for OIDC trust
 */
interface GitHubOIDCConfig {
  /** GitHub organization/owner (e.g., 'co-cddo') */
  readonly owner: string;
  /** Repository name (e.g., 'ndx') */
  readonly repo: string;
  /** Branch allowed to assume the role (e.g., 'try/aws' or 'main') */
  readonly branch: string;
}

/**
 * Stack properties for GitHub Actions OIDC integration
 */
export interface GitHubActionsStackProps extends cdk.StackProps {
  /** GitHub repository configuration */
  readonly github: GitHubOIDCConfig;
  /** S3 bucket name for content deployment */
  readonly contentBucketName: string;
  /** CloudFront distribution ID for cache invalidation */
  readonly distributionId: string;
}

/**
 * GitHub Actions OIDC Stack
 *
 * Creates IAM OIDC provider and roles for GitHub Actions:
 * - Content Deploy Role: S3 write + CloudFront invalidation (minimal permissions)
 * - Infrastructure Deploy Role: Full CDK permissions for infrastructure changes
 *
 * Security: Uses OIDC federation - no long-lived credentials stored in GitHub
 */
export class GitHubActionsStack extends cdk.Stack {
  /** IAM role for content deployment (S3 + CloudFront) */
  public readonly contentDeployRole: iam.Role;

  /** IAM role for infrastructure deployment (CDK) */
  public readonly infraDeployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubActionsStackProps) {
    super(scope, id, props);

    const { github, contentBucketName, distributionId } = props;

    // GitHub OIDC Provider - import existing provider (one per account)
    // The provider was already created in this account, so we import it
    const githubProviderArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;
    const githubProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GitHubOIDCProvider',
      githubProviderArn
    );

    // Trust policy condition for repository and branch
    // Format: repo:<owner>/<repo>:ref:refs/heads/<branch>
    const repoCondition = `repo:${github.owner}/${github.repo}:ref:refs/heads/${github.branch}`;

    // =========================================================================
    // Role 1: Content Deploy Role (minimal permissions)
    // =========================================================================
    // Used for: S3 sync, CloudFront invalidation
    // Trigger: Push to branch when NON-infra files change

    this.contentDeployRole = new iam.Role(this, 'ContentDeployRole', {
      roleName: 'GitHubActions-NDX-ContentDeploy',
      description: 'GitHub Actions role for NDX content deployment to S3',
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.FederatedPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': repoCondition,
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // S3 permissions - write to specific bucket only
    this.contentDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3WriteAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:DeleteObject',
          's3:GetObject',
          's3:ListBucket',
          's3:GetBucketLocation',
        ],
        resources: [
          `arn:aws:s3:::${contentBucketName}`,
          `arn:aws:s3:::${contentBucketName}/*`,
        ],
      })
    );

    // CloudFront invalidation permission - specific distribution only
    this.contentDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFrontInvalidation',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
          'cloudfront:ListInvalidations',
        ],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${distributionId}`,
        ],
      })
    );

    // =========================================================================
    // Role 2: Infrastructure Deploy Role (CDK permissions)
    // =========================================================================
    // Used for: cdk deploy, cdk diff
    // Trigger: Push to branch when infra/** files change

    this.infraDeployRole = new iam.Role(this, 'InfraDeployRole', {
      roleName: 'GitHubActions-NDX-InfraDeploy',
      description: 'GitHub Actions role for NDX CDK infrastructure deployment',
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.FederatedPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': repoCondition,
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // CDK requires permission to assume the CDK execution roles
    // These are created by `cdk bootstrap`
    this.infraDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AssumeCDKRoles',
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
        conditions: {
          StringEquals: {
            'iam:ResourceTag/aws-cdk:bootstrap-role': [
              'deploy',
              'lookup',
              'file-publishing',
              'image-publishing',
            ],
          },
        },
      })
    );

    // CloudFormation permissions for CDK
    this.infraDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFormationAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:GetTemplate',
          'cloudformation:ListStacks',
        ],
        resources: ['*'],
      })
    );

    // SSM Parameter Store read (for CDK context)
    this.infraDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SSMParameterRead',
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/cdk-bootstrap/*`,
        ],
      })
    );

    // ECR permissions (for Lambda Docker images if used)
    this.infraDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ECRAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        resources: ['*'],
      })
    );

    // Tags
    cdk.Tags.of(this).add('project', 'ndx');
    cdk.Tags.of(this).add('managedby', 'cdk');
    cdk.Tags.of(this).add('purpose', 'github-actions-oidc');

    // Outputs
    new cdk.CfnOutput(this, 'GitHubOIDCProviderArn', {
      value: githubProviderArn,
      description: 'GitHub OIDC Provider ARN (imported)',
    });

    new cdk.CfnOutput(this, 'ContentDeployRoleArn', {
      value: this.contentDeployRole.roleArn,
      description: 'IAM Role ARN for content deployment',
    });

    new cdk.CfnOutput(this, 'InfraDeployRoleArn', {
      value: this.infraDeployRole.roleArn,
      description: 'IAM Role ARN for infrastructure deployment',
    });
  }
}
