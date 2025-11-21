// Configuration for NDX Infrastructure
export interface EnvironmentConfig {
  readonly distributionId: string;
  readonly oacId: string;
  readonly bucketName: string;
  readonly region: string;
  readonly account: string;
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  prod: {
    distributionId: 'E3THG4UHYDHVWP',
    oacId: 'E3P8MA1G9Y5BYE',
    bucketName: 'ndx-static-prod',
    region: 'us-west-2',
    account: '568672915267',
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
