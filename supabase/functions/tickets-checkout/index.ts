// =============================================================================
// tickets-checkout — create a Stripe Checkout Session for a paid event ticket.
// =============================================================================
// Flow: the signed-in buyer calls this function with { eventId, quantity }. We
// look up the event server-side (never trust a client-sent price), enforce
// capacity, create a `pending` ticket_orders row, then create a Stripe Checkout
// Session and return its URL. Fulfilment happens in `stripe-webhook`.
//
// Secrets (set with `supabase secrets set`):
//   STRIPE_SECRET_KEY   — sk_test_… / sk_live_…
//   SITE_URL            — base URL Stripe redirects back to (e.g. https://app.example.com)
// Auto-injected by the platform: SUPABASE_URL, SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY.
import "@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:8081";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    // Identify the caller from their JWT.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sign in to buy tickets." }, 401);

    const { eventId, quantity: rawQty } = await req.json().catch(() => ({}));
    const quantity = Math.max(1, Math.min(20, Number(rawQty) || 1));
    if (!eventId || typeof eventId !== "string") {
      return json({ error: "Missing eventId." }, 400);
    }

    // Privileged client for trusted reads/writes (bypasses RLS).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return json({ error: "Complete your profile first." }, 400);

    const { data: event } = await admin
      .from("events")
      .select("id, hub_id, title, price, is_free, status, capacity")
      .eq("id", eventId)
      .maybeSingle();

    if (!event || event.status !== "published") {
      return json({ error: "This event isn’t available." }, 404);
    }
    if (event.is_free || !event.price || Number(event.price) <= 0) {
      return json({ error: "This is a free event — no purchase needed." }, 400);
    }

    // Capacity check against already-paid tickets (best effort).
    if (event.capacity != null) {
      const { data: paid } = await admin
        .from("ticket_orders")
        .select("quantity")
        .eq("event_id", eventId)
        .eq("status", "paid");
      const sold = (paid ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
      if (sold + quantity > event.capacity) {
        return json({ error: "Sorry, this event is sold out." }, 409);
      }
    }

    const unitAmount = Math.round(Number(event.price) * 100);

    const { data: order, error: orderError } = await admin
      .from("ticket_orders")
      .insert({
        event_id: event.id,
        hub_id: event.hub_id,
        buyer_id: profile.id,
        event_title: event.title || "Event ticket",
        quantity,
        unit_amount: unitAmount,
        currency: "aud",
        status: "pending",
        customer_email: user.email ?? null,
      })
      .select("id")
      .single();
    if (orderError || !order) {
      return json({ error: "Couldn’t start checkout. Please try again." }, 500);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity,
          price_data: {
            currency: "aud",
            unit_amount: unitAmount,
            product_data: { name: event.title || "Event ticket" },
          },
        },
      ],
      success_url: `${SITE_URL}/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/tickets/cancel`,
      client_reference_id: order.id,
      customer_email: user.email ?? undefined,
      metadata: {
        order_id: order.id,
        event_id: event.id,
        buyer_id: profile.id,
        quantity: String(quantity),
      },
    });

    await admin
      .from("ticket_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);

    return json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("tickets-checkout error", error);
    return json({ error: "Unexpected error creating checkout." }, 500);
  }
});
