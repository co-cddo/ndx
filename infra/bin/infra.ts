#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NdxStaticStack } from '../lib/ndx-stack';

const app = new cdk.App();
new NdxStaticStack(app, 'NdxStatic', {
  /* Use environment from AWS CLI configuration (NDX/InnovationSandboxHub profile)
   * Account: 568672915267
   * Region: us-west-2
   * Profile is specified via --profile flag during cdk deploy/synth */
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
  },
});
