// =============================================================================
// tickets-checkout — create a Stripe Checkout Session for a paid event ticket.
// =============================================================================
// Flow: the signed-in buyer calls this function with either
//   { eventId, items: [{ ticketTypeId, quantity }], selectedDate?, seatNumbers? }
//     → multi-type cart. Capacity, seats and prices are resolved + reserved
//       atomically by the `create_pending_ticket_order` RPC (the price source
//       of truth — client-sent amounts are never trusted).
//   { eventId, quantity }
//     → legacy single-price events that have no event_ticket_types.
// In both cases a `pending` ticket_orders row is created here, then a Stripe
// Checkout Session, and its URL is returned. Fulfilment happens in
// `stripe-webhook`; abandoned/expired sessions release the hold via trigger.
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

// Reservations are held for 30 minutes (Stripe's minimum session lifetime);
// when the session expires the webhook flips the order to `cancelled`, which
// releases the held capacity/seats.
const HOLD_SECONDS = 30 * 60;

type CartItem = { ticket_type_id: string; quantity: number };
type OrderLineItem = { ticket_type_id: string; name: string; unit_amount: number; quantity: number };

/** Map the RPC's raise-exception codes to a friendly buyer-facing message. */
function reservationError(message: string): string {
  const [code, detail] = message.split(":");
  switch (code) {
    case "SOLD_OUT":
      return detail ? `Sorry, “${detail}” is sold out.` : "Sorry, this event is sold out.";
    case "SEAT_TAKEN":
      return detail
        ? `Seat ${detail} was just taken — please pick another.`
        : "One of your seats was just taken — please pick another.";
    case "SEAT_COUNT_MISMATCH":
      return "Please select exactly one seat per ticket.";
    case "INVALID_DATE":
      return "Please choose a valid show date.";
    case "INVALID_TICKET_TYPE":
      return "That ticket type isn’t available for this event.";
    case "NO_TICKETS":
      return "Please select at least one ticket.";
    case "EVENT_UNAVAILABLE":
      return "This event isn’t available.";
    default:
      return "Couldn’t start checkout. Please try again.";
  }
}

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

    const body = await req.json().catch(() => ({}));
    const eventId = body?.eventId;
    if (!eventId || typeof eventId !== "string") {
      return json({ error: "Missing eventId." }, 400);
    }

    const selectedDate: string | null =
      typeof body?.selectedDate === "string" && body.selectedDate ? body.selectedDate : null;
    const seatNumbers: string[] = Array.isArray(body?.seatNumbers)
      ? body.seatNumbers.filter((s: unknown) => typeof s === "string").slice(0, 50)
      : [];

    // Normalise a multi-type cart, dropping empties and clamping quantities.
    const items: CartItem[] = Array.isArray(body?.items)
      ? body.items
          .map((it: { ticketTypeId?: string; quantity?: number }) => ({
            ticket_type_id: String(it?.ticketTypeId ?? ""),
            quantity: Math.max(0, Math.min(20, Number(it?.quantity) || 0)),
          }))
          .filter((it: CartItem) => it.ticket_type_id && it.quantity > 0)
      : [];

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

    let orderId: string;
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (items.length > 0) {
      // ---- Multi-type cart: reserve + price atomically in the database. ----
      const { data: order, error: rpcError } = await admin.rpc("create_pending_ticket_order", {
        p_event_id: event.id,
        p_buyer_id: profile.id,
        p_selected_date: selectedDate,
        p_items: items,
        p_seat_numbers: seatNumbers,
        p_customer_email: user.email ?? null,
      });

      if (rpcError || !order) {
        const status = rpcError?.message?.startsWith("SOLD_OUT") || rpcError?.message?.startsWith("SEAT_TAKEN")
          ? 409
          : 400;
        return json({ error: reservationError(rpcError?.message ?? "") }, status);
      }

      orderId = (order as { id: string }).id;
      const orderLines = ((order as { line_items?: OrderLineItem[] }).line_items ?? []);
      lineItems = orderLines.map((li) => ({
        quantity: li.quantity,
        price_data: {
          currency: "aud",
          unit_amount: li.unit_amount,
          product_data: {
            name: `${event.title || "Event ticket"} — ${li.name}`,
            ...(selectedDate ? { description: `Show date: ${selectedDate}` } : {}),
          },
        },
      }));
    } else {
      // ---- Legacy single-price path (events without ticket types). ----
      if (event.is_free || !event.price || Number(event.price) <= 0) {
        return json({ error: "This is a free event — no purchase needed." }, 400);
      }

      const quantity = Math.max(1, Math.min(20, Number(body?.quantity) || 1));

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
          selected_date: selectedDate,
        })
        .select("id")
        .single();
      if (orderError || !order) {
        return json({ error: "Couldn’t start checkout. Please try again." }, 500);
      }

      orderId = order.id;
      lineItems = [
        {
          quantity,
          price_data: {
            currency: "aud",
            unit_amount: unitAmount,
            product_data: { name: event.title || "Event ticket" },
          },
        },
      ];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      expires_at: Math.floor(Date.now() / 1000) + HOLD_SECONDS,
      line_items: lineItems,
      success_url: `${SITE_URL}/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/tickets/cancel`,
      client_reference_id: orderId,
      customer_email: user.email ?? undefined,
      metadata: {
        order_id: orderId,
        event_id: event.id,
        buyer_id: profile.id,
        selected_date: selectedDate ?? "",
        seat_numbers: seatNumbers.join(", ").slice(0, 480),
      },
    });

    await admin
      .from("ticket_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId);

    return json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("tickets-checkout error", error);
    return json({ error: "Unexpected error creating checkout." }, 500);
  }
});
