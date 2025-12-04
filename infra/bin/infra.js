#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const ndx_stack_1 = require("../lib/ndx-stack");
const notification_stack_1 = require("../lib/notification-stack");
const github_actions_stack_1 = require("../lib/github-actions-stack");
const app = new cdk.App();
// Environment configuration shared by all stacks
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT || '568672915267',
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
};
// Static site infrastructure (S3, CloudFront, Cookie Router)
new ndx_stack_1.NdxStaticStack(app, 'NdxStatic', {
    /* Use environment from AWS CLI configuration (NDX/InnovationSandboxHub profile)
     * Account: 568672915267
     * Region: us-west-2
     * Profile is specified via --profile flag during cdk deploy/synth */
    env,
});
// Notification infrastructure (Lambda, EventBridge, DLQ, Alarms)
// Separate stack for independent lifecycle and isolated blast radius
new notification_stack_1.NdxNotificationStack(app, 'NdxNotification', {
    env,
    description: 'NDX Notification System - EventBridge integration with GOV.UK Notify and Slack',
});
// GitHub Actions OIDC integration for CI/CD
// Creates IAM roles for content deployment (S3) and infrastructure deployment (CDK)
new github_actions_stack_1.GitHubActionsStack(app, 'NdxGitHubActions', {
    env,
    github: {
        owner: 'co-cddo',
        repo: 'ndx',
        branch: 'try/aws', // Change to 'main' after testing
    },
    contentBucketName: 'ndx-static-prod',
    distributionId: 'E3THG4UHYDHVWP',
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxpREFBbUM7QUFDbkMsZ0RBQWtEO0FBQ2xELGtFQUFpRTtBQUNqRSxzRUFBaUU7QUFFakUsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsaURBQWlEO0FBQ2pELE1BQU0sR0FBRyxHQUFHO0lBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksY0FBYztJQUMxRCxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO0NBQ3RELENBQUM7QUFFRiw2REFBNkQ7QUFDN0QsSUFBSSwwQkFBYyxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUU7SUFDbkM7Ozt5RUFHcUU7SUFDckUsR0FBRztDQUNKLENBQUMsQ0FBQztBQUVILGlFQUFpRTtBQUNqRSxxRUFBcUU7QUFDckUsSUFBSSx5Q0FBb0IsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLEVBQUU7SUFDL0MsR0FBRztJQUNILFdBQVcsRUFBRSxnRkFBZ0Y7Q0FDOUYsQ0FBQyxDQUFDO0FBRUgsNENBQTRDO0FBQzVDLG9GQUFvRjtBQUNwRixJQUFJLHlDQUFrQixDQUFDLEdBQUcsRUFBRSxrQkFBa0IsRUFBRTtJQUM5QyxHQUFHO0lBQ0gsTUFBTSxFQUFFO1FBQ04sS0FBSyxFQUFFLFNBQVM7UUFDaEIsSUFBSSxFQUFFLEtBQUs7UUFDWCxNQUFNLEVBQUUsU0FBUyxFQUFFLGlDQUFpQztLQUNyRDtJQUNELGlCQUFpQixFQUFFLGlCQUFpQjtJQUNwQyxjQUFjLEVBQUUsZ0JBQWdCO0NBQ2pDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBOZHhTdGF0aWNTdGFjayB9IGZyb20gJy4uL2xpYi9uZHgtc3RhY2snO1xuaW1wb3J0IHsgTmR4Tm90aWZpY2F0aW9uU3RhY2sgfSBmcm9tICcuLi9saWIvbm90aWZpY2F0aW9uLXN0YWNrJztcbmltcG9ydCB7IEdpdEh1YkFjdGlvbnNTdGFjayB9IGZyb20gJy4uL2xpYi9naXRodWItYWN0aW9ucy1zdGFjayc7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbi8vIEVudmlyb25tZW50IGNvbmZpZ3VyYXRpb24gc2hhcmVkIGJ5IGFsbCBzdGFja3NcbmNvbnN0IGVudiA9IHtcbiAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCB8fCAnNTY4NjcyOTE1MjY3JyxcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgJ3VzLXdlc3QtMicsXG59O1xuXG4vLyBTdGF0aWMgc2l0ZSBpbmZyYXN0cnVjdHVyZSAoUzMsIENsb3VkRnJvbnQsIENvb2tpZSBSb3V0ZXIpXG5uZXcgTmR4U3RhdGljU3RhY2soYXBwLCAnTmR4U3RhdGljJywge1xuICAvKiBVc2UgZW52aXJvbm1lbnQgZnJvbSBBV1MgQ0xJIGNvbmZpZ3VyYXRpb24gKE5EWC9Jbm5vdmF0aW9uU2FuZGJveEh1YiBwcm9maWxlKVxuICAgKiBBY2NvdW50OiA1Njg2NzI5MTUyNjdcbiAgICogUmVnaW9uOiB1cy13ZXN0LTJcbiAgICogUHJvZmlsZSBpcyBzcGVjaWZpZWQgdmlhIC0tcHJvZmlsZSBmbGFnIGR1cmluZyBjZGsgZGVwbG95L3N5bnRoICovXG4gIGVudixcbn0pO1xuXG4vLyBOb3RpZmljYXRpb24gaW5mcmFzdHJ1Y3R1cmUgKExhbWJkYSwgRXZlbnRCcmlkZ2UsIERMUSwgQWxhcm1zKVxuLy8gU2VwYXJhdGUgc3RhY2sgZm9yIGluZGVwZW5kZW50IGxpZmVjeWNsZSBhbmQgaXNvbGF0ZWQgYmxhc3QgcmFkaXVzXG5uZXcgTmR4Tm90aWZpY2F0aW9uU3RhY2soYXBwLCAnTmR4Tm90aWZpY2F0aW9uJywge1xuICBlbnYsXG4gIGRlc2NyaXB0aW9uOiAnTkRYIE5vdGlmaWNhdGlvbiBTeXN0ZW0gLSBFdmVudEJyaWRnZSBpbnRlZ3JhdGlvbiB3aXRoIEdPVi5VSyBOb3RpZnkgYW5kIFNsYWNrJyxcbn0pO1xuXG4vLyBHaXRIdWIgQWN0aW9ucyBPSURDIGludGVncmF0aW9uIGZvciBDSS9DRFxuLy8gQ3JlYXRlcyBJQU0gcm9sZXMgZm9yIGNvbnRlbnQgZGVwbG95bWVudCAoUzMpIGFuZCBpbmZyYXN0cnVjdHVyZSBkZXBsb3ltZW50IChDREspXG5uZXcgR2l0SHViQWN0aW9uc1N0YWNrKGFwcCwgJ05keEdpdEh1YkFjdGlvbnMnLCB7XG4gIGVudixcbiAgZ2l0aHViOiB7XG4gICAgb3duZXI6ICdjby1jZGRvJyxcbiAgICByZXBvOiAnbmR4JyxcbiAgICBicmFuY2g6ICd0cnkvYXdzJywgLy8gQ2hhbmdlIHRvICdtYWluJyBhZnRlciB0ZXN0aW5nXG4gIH0sXG4gIGNvbnRlbnRCdWNrZXROYW1lOiAnbmR4LXN0YXRpYy1wcm9kJyxcbiAgZGlzdHJpYnV0aW9uSWQ6ICdFM1RIRzRVSFlESFZXUCcsXG59KTtcbiJdfQ==