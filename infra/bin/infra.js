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
const app = new cdk.App();
// Environment configuration shared by all stacks
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxpREFBbUM7QUFDbkMsZ0RBQWtEO0FBQ2xELGtFQUFpRTtBQUVqRSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixpREFBaUQ7QUFDakQsTUFBTSxHQUFHLEdBQUc7SUFDVixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7SUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksV0FBVztDQUN0RCxDQUFDO0FBRUYsNkRBQTZEO0FBQzdELElBQUksMEJBQWMsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFO0lBQ25DOzs7eUVBR3FFO0lBQ3JFLEdBQUc7Q0FDSixDQUFDLENBQUM7QUFFSCxpRUFBaUU7QUFDakUscUVBQXFFO0FBQ3JFLElBQUkseUNBQW9CLENBQUMsR0FBRyxFQUFFLGlCQUFpQixFQUFFO0lBQy9DLEdBQUc7SUFDSCxXQUFXLEVBQUUsZ0ZBQWdGO0NBQzlGLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBOZHhTdGF0aWNTdGFjayB9IGZyb20gJy4uL2xpYi9uZHgtc3RhY2snO1xuaW1wb3J0IHsgTmR4Tm90aWZpY2F0aW9uU3RhY2sgfSBmcm9tICcuLi9saWIvbm90aWZpY2F0aW9uLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gRW52aXJvbm1lbnQgY29uZmlndXJhdGlvbiBzaGFyZWQgYnkgYWxsIHN0YWNrc1xuY29uc3QgZW52ID0ge1xuICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB8fCAndXMtd2VzdC0yJyxcbn07XG5cbi8vIFN0YXRpYyBzaXRlIGluZnJhc3RydWN0dXJlIChTMywgQ2xvdWRGcm9udCwgQ29va2llIFJvdXRlcilcbm5ldyBOZHhTdGF0aWNTdGFjayhhcHAsICdOZHhTdGF0aWMnLCB7XG4gIC8qIFVzZSBlbnZpcm9ubWVudCBmcm9tIEFXUyBDTEkgY29uZmlndXJhdGlvbiAoTkRYL0lubm92YXRpb25TYW5kYm94SHViIHByb2ZpbGUpXG4gICAqIEFjY291bnQ6IDU2ODY3MjkxNTI2N1xuICAgKiBSZWdpb246IHVzLXdlc3QtMlxuICAgKiBQcm9maWxlIGlzIHNwZWNpZmllZCB2aWEgLS1wcm9maWxlIGZsYWcgZHVyaW5nIGNkayBkZXBsb3kvc3ludGggKi9cbiAgZW52LFxufSk7XG5cbi8vIE5vdGlmaWNhdGlvbiBpbmZyYXN0cnVjdHVyZSAoTGFtYmRhLCBFdmVudEJyaWRnZSwgRExRLCBBbGFybXMpXG4vLyBTZXBhcmF0ZSBzdGFjayBmb3IgaW5kZXBlbmRlbnQgbGlmZWN5Y2xlIGFuZCBpc29sYXRlZCBibGFzdCByYWRpdXNcbm5ldyBOZHhOb3RpZmljYXRpb25TdGFjayhhcHAsICdOZHhOb3RpZmljYXRpb24nLCB7XG4gIGVudixcbiAgZGVzY3JpcHRpb246ICdORFggTm90aWZpY2F0aW9uIFN5c3RlbSAtIEV2ZW50QnJpZGdlIGludGVncmF0aW9uIHdpdGggR09WLlVLIE5vdGlmeSBhbmQgU2xhY2snLFxufSk7XG4iXX0=