import { defineFunction, secret } from "@aws-amplify/backend";

/**
 * tickets-checkout — AppSync custom-mutation handler (Lambda).
 *
 * The Cognito-authenticated buyer calls the `ticketsCheckout` mutation; this
 * Lambda resolves prices server-side (never trusting the client), writes a
 * `pending` TicketOrder, creates a Stripe Checkout Session and returns its URL.
 * Fulfilment is the webhook's job. Mirrors supabase/functions/tickets-checkout.
 *
 * Secret (set with `npx ampx sandbox secret set STRIPE_SECRET_KEY`):
 *   STRIPE_SECRET_KEY — sk_test_… / sk_live_…
 */
export const ticketsCheckout = defineFunction({
  name: "tickets-checkout",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  environment: {
    STRIPE_SECRET_KEY: secret("STRIPE_SECRET_KEY"),
    // Production default is the live domain; override locally with
    // SITE_URL=http://localhost:8081 before `ampx sandbox` for dev redirects.
    SITE_URL: process.env.SITE_URL ?? "https://culturepass.au",
  },
});
