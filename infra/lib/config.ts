// Configuration for NDX Infrastructure
export interface EnvironmentConfig {
  readonly distributionId: string;
  readonly oacId: string;
  readonly bucketName: string;
  readonly region: string;
  readonly account: string;
  // Alternate domain name (CNAME) configuration
  // Step 1: Create ACM certificate in us-east-1 manually, add DNS validation records
  // Step 2: Once validated, add certificateArn here
  // Step 3: Add alternateDomainName and deploy
  readonly alternateDomainName?: string;
  readonly certificateArn?: string; // ACM certificate ARN in us-east-1
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  prod: {
    distributionId: 'E3THG4UHYDHVWP',
    oacId: 'E3P8MA1G9Y5BYE',
    bucketName: 'ndx-static-prod',
    region: 'us-west-2',
    account: '568672915267',
    alternateDomainName: 'ndx.digital.cabinet-office.gov.uk',
    certificateArn: 'arn:aws:acm:us-east-1:568672915267:certificate/834f73bb-611f-4fbf-9e36-ffd6624548b6',
  },
  test: {
    distributionId: 'E3TESTDISTID',
    oacId: 'E3TESTOAC',
    bucketName: 'ndx-static-test',
    region: 'us-west-2',
    account: '568672915267',
  },
};

export function getEnvironmentConfig(env: string = 'prod'): EnvironmentConfig {
  const config = ENVIRONMENTS[env];
  if (!config) {
    const validEnvs = Object.keys(ENVIRONMENTS).join(', ');
    throw new Error('Unknown environment: ' + env + '. Valid environments: ' + validEnvs);
  }
  return config;
}
