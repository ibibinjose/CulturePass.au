// =============================================================================
// stripe-webhook handler — fulfil ticket orders from Stripe (source of truth).
// =============================================================================
// Invoked via a Lambda Function URL (no Cognito auth — Stripe POSTs directly).
// We verify the Stripe signature with Node crypto (SDK-free), then update orders
// with the function's IAM role. Mirrors supabase/functions/stripe-webhook.
//
// Excluded from `amplify/tsconfig.json` typecheck (imports the build-time
// `$amplify/env/*` module); type-checked/bundled by `ampx`.
import { createHmac, timingSafeEqual } from "node:crypto";

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/stripe-webhook";
import type { LambdaFunctionURLHandler } from "aws-lambda";

import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: "iam" });

/** Reject events signed more than 5 minutes ago (Stripe's recommended replay window). */
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

/** Verify a Stripe `Stripe-Signature` header (t=…,v1=…) against the raw body. */
function verify(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")) as [string, string][]);
  const timestamp = parts["t"];
  const expected = parts["v1"];
  if (!timestamp || !expected) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > SIGNATURE_TOLERANCE_SECONDS) return false;
  const signed = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(signed);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const handler: LambdaFunctionURLHandler = async (event) => {
  const signature = event.headers?.["stripe-signature"];
  const body = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString("utf8") : event.body ?? "";
  const secret = env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret || !verify(body, signature, secret)) {
    return { statusCode: 400, body: "Invalid signature" };
  }

  let evt: { type: string; data: { object: Record<string, any> } };
  try {
    evt = JSON.parse(body);
  } catch {
    return { statusCode: 400, body: "Invalid payload" };
  }

  try {
    const obj = evt.data.object;
    switch (evt.type) {
      case "checkout.session.completed": {
        const orderId = obj.metadata?.order_id ?? obj.client_reference_id;
        if (orderId && obj.payment_status === "paid") {
          await client.models.TicketOrder.update({
            id: orderId,
            status: "paid",
            stripePaymentIntentId: typeof obj.payment_intent === "string" ? obj.payment_intent : null,
            amountTotal: obj.amount_total ?? null,
            customerEmail: obj.customer_details?.email ?? null,
            paidAt: new Date().toISOString(),
          });
        }
        break;
      }
      case "checkout.session.expired": {
        const orderId = obj.metadata?.order_id ?? obj.client_reference_id;
        if (orderId) {
          await client.models.TicketOrder.update({ id: orderId, status: "cancelled" });
        }
        break;
      }
      case "charge.refunded": {
        const paymentIntent = typeof obj.payment_intent === "string" ? obj.payment_intent : null;
        if (paymentIntent) {
          const { data: orders } = await client.models.TicketOrder.list({
            filter: { stripePaymentIntentId: { eq: paymentIntent } },
          });
          await Promise.all(
            orders.map((o) => client.models.TicketOrder.update({ id: o.id, status: "refunded" })),
          );
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error", err);
    return { statusCode: 500, body: "Handler error" };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
