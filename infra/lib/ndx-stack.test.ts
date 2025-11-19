import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { NdxStaticStack } from './ndx-stack';

test('Stack snapshot matches expected CloudFormation', () => {
  const app = new cdk.App();
  const stack = new NdxStaticStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  expect(template.toJSON()).toMatchSnapshot();
});

test('S3 bucket has correct configuration', () => {
  const app = new cdk.App();
  const stack = new NdxStaticStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: 'ndx-static-prod',
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault: {
          SSEAlgorithm: 'AES256'
        }
      }]
    },
    VersioningConfiguration: {
      Status: 'Enabled'
    },
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    },
    Tags: [
      { Key: 'environment', Value: 'prod' },
      { Key: 'managedby', Value: 'cdk' },
      { Key: 'project', Value: 'ndx' }
    ]
  });
});
