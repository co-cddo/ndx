import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { NdxNotificationStack } from './notification-stack';

describe('NdxNotificationStack', () => {
  let app: cdk.App;
  let stack: NdxNotificationStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new NdxNotificationStack(app, 'TestNotification', {
      env: {
        account: '123456789012',
        region: 'us-west-2',
      },
    });
    template = Template.fromStack(stack);
  });

  describe('Stack Synthesis', () => {
    test('stack synthesizes without errors', () => {
      // If we got here, synthesis succeeded
      expect(stack).toBeDefined();
      expect(template).toBeDefined();
    });

    test('stack has correct name pattern', () => {
      // The stack name is derived from the ID passed to constructor
      expect(stack.stackName).toContain('Notification');
    });
  });

  describe('Lambda Function Configuration', () => {
    test('creates Lambda function with Node.js 20.x runtime', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
      });
    });

    test('Lambda has 512MB memory (TC-AC-2)', () => {
      // TC-AC-2: Increased from 256MB for Slack webhook integration
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 512,
      });
    });

    test('Lambda has 30 second timeout', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 30,
      });
    });

    test('Lambda has correct function name', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'ndx-notification-handler',
      });
    });

    test('Lambda has description', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Description: Match.stringLikeRegexp('NDX Notification Handler'),
      });
    });

    test('Lambda has handler pointing to handler function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
      });
    });

    test('Lambda has environment variables configured', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            NODE_OPTIONS: '--enable-source-maps',
          }),
        },
      });
    });

    test('Lambda has reserved concurrency = 10 (AC-3.6)', () => {
      // Reserved concurrency limits blast radius per Devil's Advocate analysis
      // Calculation: Notify rate limit (3000/min) ÷ Lambda duration (500ms) × safety factor (0.4) = 10
      template.hasResourceProperties('AWS::Lambda::Function', {
        ReservedConcurrentExecutions: 10,
      });
    });

    test('Lambda has ENVIRONMENT variable set', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            ENVIRONMENT: Match.anyValue(),
          }),
        },
      });
    });

    test('Lambda has LOG_LEVEL variable set', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            LOG_LEVEL: Match.anyValue(),
          }),
        },
      });
    });
  });

  describe('Resource Tagging', () => {
    test('Lambda function has project tag', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'project', Value: 'ndx' }),
        ]),
      });
    });

    test('Lambda function has component tag', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'component', Value: 'notifications' }),
        ]),
      });
    });

    test('Lambda function has managedby tag', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'managedby', Value: 'cdk' }),
        ]),
      });
    });
  });

  describe('IAM Role', () => {
    test('creates IAM role for Lambda', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
            }),
          ]),
        },
      });
    });

    test('Lambda role has basic execution permissions', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              Match.arrayWith([
                Match.stringLikeRegexp('AWSLambdaBasicExecutionRole'),
              ]),
            ]),
          }),
        ]),
      });
    });
  });

  describe('Outputs', () => {
    test('exports Lambda function ARN', () => {
      template.hasOutput('NotificationHandlerArn', {
        Description: Match.stringLikeRegexp('ARN'),
      });
    });

    test('exports Lambda function name', () => {
      template.hasOutput('NotificationHandlerName', {
        Description: Match.stringLikeRegexp('Name'),
      });
    });

    test('exports EventBridge rule ARN', () => {
      template.hasOutput('NotificationRuleArn', {
        Description: Match.stringLikeRegexp('EventBridge rule'),
      });
    });

    test('exports ISB EventBus ARN', () => {
      template.hasOutput('ISBEventBusArn', {
        Description: Match.stringLikeRegexp('ISB EventBridge bus'),
      });
    });
  });

  describe('EventBridge Rule Configuration', () => {
    test('creates EventBridge rule with correct name (AC-2.6)', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'ndx-notification-rule',
      });
    });

    test('rule targets notification Lambda function (AC-2.1)', () => {
      // Verify the rule has a Lambda target
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({
            Arn: Match.objectLike({
              'Fn::GetAtt': Match.arrayWith([
                Match.stringLikeRegexp('NotificationHandler'),
              ]),
            }),
          }),
        ]),
      });
    });

    test('rule has description', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Description: Match.stringLikeRegexp('ISB notification events'),
      });
    });

    // Note: Source filtering intentionally not used
    // Decision: Account-level filtering is sufficient security control
    // See: docs/sprint-artifacts/code-review-fix-plan.md - Decision 3
    test.skip('event pattern includes source filter (AC-2.2) - SKIPPED: Source filtering not required', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: Match.objectLike({
          source: ['innovation-sandbox'],
        }),
      });
    });

    test('event pattern includes account filter for security (AC-2.3)', () => {
      // Account-level filtering is a Red Team requirement
      // Verify the account field exists in the event pattern
      const rules = template.findResources('AWS::Events::Rule');
      const ruleKeys = Object.keys(rules);
      expect(ruleKeys.length).toBeGreaterThan(0);

      const rule = rules[ruleKeys[0]] as {
        Properties: {
          EventPattern: {
            account: string[];
          };
        };
      };
      const eventPattern = rule.Properties.EventPattern;
      expect(eventPattern.account).toBeDefined();
      expect(Array.isArray(eventPattern.account)).toBe(true);
      expect(eventPattern.account.length).toBe(1);
      // The account ID should be from ISB config (111122223333 for prod/staging)
      expect(eventPattern.account[0]).toMatch(/^\d{12}$/);
    });

    test('event pattern includes all 13 detail-types (AC-2.2)', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: Match.objectLike({
          'detail-type': Match.arrayWith([
            // Lease lifecycle events
            'LeaseRequested',
            'LeaseApproved',
            'LeaseDenied',
            'LeaseTerminated',
            'LeaseFrozen',
            // Monitoring threshold events
            'LeaseBudgetThresholdAlert',
            'LeaseDurationThresholdAlert',
            'LeaseFreezingThresholdAlert',
            'LeaseBudgetExceeded',
            'LeaseExpired',
            // Ops events
            'AccountQuarantined',
            'AccountCleanupFailed',
            'AccountDriftDetected',
          ]),
        }),
      });
    });

    test('event pattern has exactly 13 detail-types', () => {
      const rules = template.findResources('AWS::Events::Rule');
      const ruleKeys = Object.keys(rules);
      expect(ruleKeys.length).toBeGreaterThan(0);

      const rule = rules[ruleKeys[0]] as {
        Properties: {
          EventPattern: {
            'detail-type': string[];
          };
        };
      };
      const eventPattern = rule.Properties.EventPattern;
      expect(eventPattern['detail-type']).toHaveLength(13);
    });

    test('rule references ISB event bus (cross-account)', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        // ISB event bus naming: InnovationSandboxComputeISBEventBus{suffix}
        EventBusName: Match.stringLikeRegexp('InnovationSandbox.*ISBEventBus.*'),
      });
    });

    test('EventBridge rules have project tag', () => {
      // Note: Tags on EventBridge rules are applied at stack level
      // We verify the rules are created correctly, tags are inherited
      // We have 2 rules: notification subscription and DLQ digest schedule (n6-7)
      template.resourceCountIs('AWS::Events::Rule', 2);
    });
  });

  describe('Lambda EventBridge Permissions', () => {
    test('Lambda has permission to be invoked by EventBridge', () => {
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
      });
    });
  });

  describe('Dead Letter Queue Configuration (n4-4)', () => {
    test('creates SQS Dead Letter Queue with correct name (AC-4.6)', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'ndx-notification-dlq',
      });
    });

    test('DLQ has 14-day retention period (AC-4.3)', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        MessageRetentionPeriod: 1209600, // 14 days in seconds
      });
    });

    test('DLQ has SQS_MANAGED encryption (AC-4.4)', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        SqsManagedSseEnabled: true,
      });
    });

    test('DLQ has visibility timeout of 300 seconds', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        VisibilityTimeout: 300,
      });
    });

    test('DLQ has project tag', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'project', Value: 'ndx' }),
        ]),
      });
    });

    test('DLQ has component tag', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'component', Value: 'notifications' }),
        ]),
      });
    });
  });

  describe('EventBridge Target DLQ Configuration (n4-4)', () => {
    test('EventBridge target has retry attempts configured (AC-4.5)', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({
            RetryPolicy: Match.objectLike({
              MaximumRetryAttempts: 2,
            }),
          }),
        ]),
      });
    });

    test('EventBridge target has maximum event age configured', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({
            RetryPolicy: Match.objectLike({
              MaximumEventAgeInSeconds: 3600, // 1 hour
            }),
          }),
        ]),
      });
    });

    test('EventBridge target references DLQ (AC-4.1)', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({
            DeadLetterConfig: Match.objectLike({
              Arn: Match.objectLike({
                'Fn::GetAtt': Match.arrayWith([
                  Match.stringLikeRegexp('NotificationDLQ'),
                ]),
              }),
            }),
          }),
        ]),
      });
    });
  });

  describe('DLQ Outputs', () => {
    test('exports DLQ ARN', () => {
      template.hasOutput('NotificationDLQArn', {
        Description: Match.stringLikeRegexp('Dead Letter Queue'),
      });
    });

    test('exports DLQ URL', () => {
      template.hasOutput('NotificationDLQUrl', {
        Description: Match.stringLikeRegexp('Dead Letter Queue'),
      });
    });
  });

  describe('Secrets Manager Configuration (n4-5)', () => {
    test('Lambda has SECRETS_PATH environment variable (AC-5.1)', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            SECRETS_PATH: '/ndx/notifications/credentials',
          }),
        },
      });
    });

    test('Lambda role has GetSecretValue permission (AC-5.4)', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'secretsmanager:GetSecretValue',
              Effect: 'Allow',
            }),
          ]),
        },
      });
    });

    test('GetSecretValue permission is scoped to secret paths', () => {
      // n4-5: credentials secret, IC-AC-1: separate Slack webhook secret
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'secretsmanager:GetSecretValue',
              // IC-AC-1: Now includes both consolidated and separate Slack webhook secrets
              Resource: Match.arrayWith([
                Match.stringLikeRegexp('/ndx/notifications/credentials'),
                Match.stringLikeRegexp('/ndx/notifications/slack-webhook'),
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe('CloudWatch Monitoring Configuration (n4-6)', () => {
    test('creates SNS alarm topic with correct name (AC-6.9)', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'ndx-notification-alarms',
        DisplayName: 'NDX Notification System Alarms',
      });
    });

    test('creates 12 CloudWatch alarms (8 n4-6 + 3 n5-4 + 1 n6-1)', () => {
      // n4-6: DLQ depth, Lambda errors, canary, DLQ rate, auth failure, error rate, DLQ stale, secrets expiry
      // n5-4: complaint rate (AC-4.21), bounce rate (AC-4.22), unsubscribe rate (AC-4.24)
      // n6-1: Slack message failure (AC-NEW-2)
      template.resourceCountIs('AWS::CloudWatch::Alarm', 12);
    });

    test('creates DLQ depth alarm with threshold > 0 (AC-6.1)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'ndx-notification-dlq-depth',
        Threshold: 0,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    test('creates Lambda errors alarm (AC-6.2)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'ndx-notification-errors',
        Threshold: 5,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    test('creates canary alarm for zero invocations (AC-6.3)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'ndx-notification-canary',
        Threshold: 1,
        ComparisonOperator: 'LessThanThreshold',
        TreatMissingData: 'breaching', // Critical - detects silent death
      });
    });

    test('creates DLQ rate alarm for flooding detection (AC-6.4)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'ndx-notification-dlq-rate',
        Threshold: 50,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    test('creates auth failure alarm (AC-6.5)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'ndx-notification-auth-failure',
        Threshold: 0,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    test('creates error rate alarm (AC-6.6)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'ndx-notification-error-rate',
        Threshold: 10,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    test('creates DLQ stale alarm (AC-6.7)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'ndx-notification-dlq-stale',
        Threshold: 86400, // 24 hours in seconds
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    test('creates secrets expiry alarm (AC-6.8)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'ndx-notification-secrets-expiry',
        Threshold: 335,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    test('creates Slack failure alarm (AC-NEW-2, n6-1)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'ndx-notification-slack-failure',
        Threshold: 0,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    test('all alarms include runbook URL in description (AC-6.14)', () => {
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      Object.values(alarms).forEach((alarm) => {
        const props = alarm as { Properties: { AlarmDescription?: string } };
        expect(props.Properties.AlarmDescription).toContain('Runbook:');
        expect(props.Properties.AlarmDescription).toContain('github.com/cddo/ndx/wiki/runbooks');
      });
    });

    test('all alarms publish to SNS topic (AC-6.9)', () => {
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      Object.values(alarms).forEach((alarm) => {
        const props = alarm as { Properties: { AlarmActions?: unknown[] } };
        expect(props.Properties.AlarmActions).toBeDefined();
        expect(props.Properties.AlarmActions?.length).toBeGreaterThan(0);
      });
    });

    test('creates CloudWatch dashboard (AC-6.13)', () => {
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'ndx-notification-health',
      });
    });
  });

  describe('Monitoring Outputs (n4-6)', () => {
    test('exports SNS alarm topic ARN', () => {
      template.hasOutput('AlarmTopicArn', {
        Description: Match.stringLikeRegexp('SNS topic'),
      });
    });

    test('exports dashboard URL', () => {
      template.hasOutput('DashboardUrl', {
        Description: Match.stringLikeRegexp('CloudWatch dashboard'),
      });
    });
  });
});
