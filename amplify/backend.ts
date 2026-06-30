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

// Stripe POSTs webhook events directly, so expose the webhook Lambda via a public
// Function URL (no Cognito). The handler verifies the Stripe signature instead.
const webhookUrl = backend.stripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: { allowedOrigins: ["*"], allowedMethods: [HttpMethod.POST] },
});
backend.addOutput({ custom: { stripeWebhookUrl: webhookUrl.url } });
