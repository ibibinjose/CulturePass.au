// =============================================================================
// stripe-webhook — fulfil ticket orders from Stripe events (source of truth).
// =============================================================================
// Stripe calls this endpoint directly, so it must run WITHOUT JWT verification
// (see config.toml: verify_jwt = false). We verify the Stripe signature instead
// and update orders with the service_role key (bypasses RLS). Never trust the
// browser success redirect for fulfilment — only this webhook.
//
// Secrets (set with `supabase secrets set`):
//   STRIPE_SECRET_KEY      — sk_test_… / sk_live_…
//   STRIPE_WEBHOOK_SECRET  — whsec_… (from the Stripe webhook endpoint)
import "@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});
// Web Crypto async verification is required in the Edge (Deno) runtime.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  if (!signature || !secret) {
    return new Response("Missing signature/secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      secret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id ?? session.client_reference_id;
        if (orderId && session.payment_status === "paid") {
          await admin
            .from("ticket_orders")
            .update({
              status: "paid",
              stripe_payment_intent_id:
                typeof session.payment_intent === "string" ? session.payment_intent : null,
              amount_total: session.amount_total ?? null,
              customer_email: session.customer_details?.email ?? null,
              paid_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .eq("status", "pending");
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id ?? session.client_reference_id;
        if (orderId) {
          await admin
            .from("ticket_orders")
            .update({ status: "cancelled" })
            .eq("id", orderId)
            .eq("status", "pending");
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent =
          typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (paymentIntent) {
          await admin
            .from("ticket_orders")
            .update({ status: "refunded" })
            .eq("stripe_payment_intent_id", paymentIntent);
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    console.error("Webhook handler error", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
