import { defineBackend } from "@aws-amplify/backend";
import { FunctionUrlAuthType, HttpMethod } from "aws-cdk-lib/aws-lambda";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { ticketsCheckout } from "./functions/tickets-checkout/resource";
import { stripeWebhook } from "./functions/stripe-webhook/resource";
import { getTakenSeats } from "./functions/get-taken-seats/resource";
import { devSeed } from "./functions/dev-seed/resource";

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
});

// Email verification uses LINK style (see amplify/auth/resource.ts), which
// requires the user pool to have a Cognito hosted domain — without it Cognito
// rejects sign-up with "there does not exist a valid user pool domain
// associated with the user pool". The prefix must be globally unique per AWS
// region, so derive it from the branch to keep per-branch fullstack deploys
// (main, PR previews, sandboxes) from colliding.
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
