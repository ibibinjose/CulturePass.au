import { defineFunction, secret } from "@aws-amplify/backend";

/**
 * stripe-webhook — the fulfilment source of truth. Stripe POSTs raw events to
 * this Lambda's Function URL (wired in amplify/backend.ts, no Cognito auth); we
 * verify the Stripe signature and flip TicketOrders to paid/cancelled/refunded.
 * Never trust the browser success redirect. Mirrors supabase/functions/stripe-webhook.
 *
 * Secrets:
 *   STRIPE_SECRET_KEY     — sk_test_… / sk_live_…
 *   STRIPE_WEBHOOK_SECRET — whsec_… (from the Stripe webhook endpoint)
 */
export const stripeWebhook = defineFunction({
  name: "stripe-webhook",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  environment: {
    STRIPE_SECRET_KEY: secret("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: secret("STRIPE_WEBHOOK_SECRET"),
  },
});
