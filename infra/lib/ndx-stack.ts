import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class NdxStaticStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Read environment context for multi-environment support (Story 3.5)
    // Enables integration testing with separate test bucket
    const env = this.node.tryGetContext('env') || 'prod';
    const bucketName = env === 'test' ? 'ndx-static-test' : 'ndx-static-prod';

    // S3 bucket for static site hosting
    // Bucket name validated as available in Story 2.1
    const bucket = new s3.Bucket(this, 'StaticSiteBucket', {
      bucketName: bucketName,

      // Security: Server-side encryption with AWS managed keys (NFR-SEC-2)
      encryption: s3.BucketEncryption.S3_MANAGED,

      // Security: Block all public access (NFR-SEC-1)
      // Prepared for CloudFront origin access in growth phase
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // Data protection: Enable versioning for rollback capability (FR22, ADR-003)
      versioned: true,

      // Data protection: Retain bucket on stack deletion (protect production data)
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Governance: Resource tags for organization and cost tracking (NFR-OPS-4)
    // All tags lowercase per architecture standards
    cdk.Tags.of(bucket).add('project', 'ndx');
    cdk.Tags.of(bucket).add('environment', env);
    cdk.Tags.of(bucket).add('managedby', 'cdk');
  }
}
