import { buildBlockKitPayload } from './lib/lambda/notification/block-kit-builder';
import { SLACK_TEMPLATES } from './lib/lambda/notification/slack-templates';

const template = SLACK_TEMPLATES.AccountQuarantined;

const params = {
  alertType: 'AccountQuarantined',
  accountId: '111122223333',
  priority: template.priority as 'critical' | 'normal',
  details: {
    Reason: 'Budget exceeded by 50%',
    'Quarantined At': '2025-11-28 17:29:02 UTC',
    Severity: 'Critical',
    Guidance: template.escalationGuidance,
  },
  eventId: 'test-event-slack-1764350950',
  actionLinks: template.actionLinks,
};

const payload = buildBlockKitPayload(params);
console.log(JSON.stringify(payload, null, 2));
