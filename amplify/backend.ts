import { defineBackend } from "@aws-amplify/backend";
import { FunctionUrlAuthType, HttpMethod } from "aws-cdk-lib/aws-lambda";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { ticketsCheckout } from "./functions/tickets-checkout/resource";
import { stripeWebhook } from "./functions/stripe-webhook/resource";
import { getTakenSeats } from "./functions/get-taken-seats/resource";
import { devSeed } from "./functions/dev-seed/resource";
import { rewardsTierRecompute } from "./functions/rewards-tier-recompute/resource";
import { rewardsJoin } from "./functions/rewards-join/resource";

/**
 * CulturePass AWS backend (Amplify Gen 2).
 * Auth → Cognito · Data → DynamoDB (AppSync) · Storage → S3 · Functions → Lambda.
 *
 * Deploy a personal cloud sandbox with:   npx ampx sandbox
 * Generates `amplify_outputs.json` at the repo root for the client to consume.
 * Set the Stripe secrets first:
 *   npx ampx sandbox secret set STRIPE_SECRET_KEY
 *   npx ampx sandbox secret set STRIPE_WEBHOOK_SECRET
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  ticketsCheckout,
  stripeWebhook,
  getTakenSeats,
  devSeed,
  rewardsTierRecompute,
  rewardsJoin,
});

// Email verification uses CODE style (see amplify/auth/resource.ts) to support
// in-app code entry + resend prompts for unverified users on sign-in and during
// sign-up. The hosted domain is still created (harmless for CODE flows; was
// required for prior LINK style). Prefix derived per-branch for uniqueness.
const domainPrefix = `culturepass-${(process.env.AWS_BRANCH ?? "sandbox")
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 40)}`;
backend.auth.resources.userPool.addDomain("HostedUiDomain", {
  cognitoDomain: { domainPrefix },
});

// Stripe POSTs webhook events directly, so expose the webhook Lambda via a public
// Function URL (no Cognito). The handler verifies the Stripe signature instead.
const webhookUrl = backend.stripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: { allowedOrigins: ["*"], allowedMethods: [HttpMethod.POST] },
});
backend.addOutput({ custom: { stripeWebhookUrl: webhookUrl.url } });

// CulturePass Plus tier recompute runs nightly — no EventBridge Scheduler
// existed in this backend yet, so this is wired via the CDK escape hatch
// (same `.resources.lambda` access as the webhook Function URL above).
new Rule(backend.rewardsTierRecompute.stack, "RewardsTierRecomputeSchedule", {
  schedule: Schedule.cron({ minute: "0", hour: "16" }), // ~02:00 AEST (UTC+10)
}).addTarget(new LambdaFunction(backend.rewardsTierRecompute.resources.lambda));
