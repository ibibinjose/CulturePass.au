// =============================================================================
// tickets-checkout handler — create a Stripe Checkout Session for a paid ticket.
// =============================================================================
// AppSync custom-mutation Lambda. Resolves prices server-side (never trusts the
// client), writes a `pending` TicketOrder, creates a Stripe Checkout Session and
// returns its URL. Fulfilment happens in stripe-webhook.
//
// NOTE: the Supabase version reserved capacity/seats atomically in a single
// Postgres function (`create_pending_ticket_order`). DynamoDB has no equivalent
// transaction here yet — this does a best-effort capacity check. Tightening this
// into a conditional/transactional reservation is tracked migration follow-up.
//
// Excluded from `amplify/tsconfig.json` typecheck: it imports the build-time
// generated `$amplify/env/*` module, so it is type-checked/bundled by `ampx`.
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/tickets-checkout";

import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: "iam" });

const STRIPE_API = "https://api.stripe.com/v1";
const HOLD_SECONDS = 30 * 60;

/** Flatten a nested object into Stripe's bracketed form-encoding. */
function encodeForm(obj: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const field = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item && typeof item === "object") {
          parts.push(...encodeForm(item as Record<string, unknown>, `${field}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${field}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(...encodeForm(value as Record<string, unknown>, field));
    } else {
      parts.push(`${encodeURIComponent(field)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

async function stripe(path: string, params: Record<string, unknown>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(params).join("&"),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? "Stripe request failed");
  return body;
}

type CartItem = { ticketTypeId: string; quantity: number };

type ActiveOrder = {
  quantity: number | null;
  selectedDate: string | null;
  seatNumbers: (string | null)[] | null;
  lineItems: unknown;
};

/** All pending + paid orders for an event (paginated — DynamoDB caps pages at 100). */
async function listActiveOrders(eventId: string): Promise<ActiveOrder[]> {
  const orders: ActiveOrder[] = [];
  let nextToken: string | null | undefined;
  do {
    const { data, nextToken: token } = await client.models.TicketOrder.list({
      filter: {
        eventId: { eq: eventId },
        or: [{ status: { eq: "pending" } }, { status: { eq: "paid" } }],
      },
      nextToken,
    });
    orders.push(...data);
    nextToken = token;
  } while (nextToken);
  return orders;
}

/** Sum quantities already ordered per ticket type from stored order lineItems. */
function soldByTicketType(orders: ActiveOrder[]): Map<string, number> {
  const sold = new Map<string, number>();
  for (const order of orders) {
    const raw = typeof order.lineItems === "string" ? JSON.parse(order.lineItems) : order.lineItems;
    if (!Array.isArray(raw)) continue;
    for (const line of raw as { ticket_type_id?: string; quantity?: number }[]) {
      if (!line?.ticket_type_id) continue;
      sold.set(line.ticket_type_id, (sold.get(line.ticket_type_id) ?? 0) + (Number(line.quantity) || 0));
    }
  }
  return sold;
}

export const handler: Schema["ticketsCheckout"]["functionHandler"] = async (event) => {
  const args = event.arguments;
  const sub = event.identity && "sub" in event.identity ? event.identity.sub : null;
  const claimEmail =
    event.identity && "claims" in event.identity
      ? ((event.identity.claims as Record<string, unknown>)?.email as string | undefined)
      : undefined;
  if (!sub) return { url: null, sessionId: null, error: "Sign in to buy tickets." };

  const eventId = args.eventId;
  const selectedDate = args.selectedDate || null;
  const seatNumbers = (args.seatNumbers ?? []).filter((s): s is string => !!s).slice(0, 50);
  const items: CartItem[] = args.items ? (JSON.parse(args.items) as CartItem[]) : [];

  // Resolve the buyer's profile.
  const { data: profiles } = await client.models.Profile.list({
    filter: { userId: { eq: sub } },
    limit: 1,
  });
  const profile = profiles[0];
  if (!profile) return { url: null, sessionId: null, error: "Complete your profile first." };

  const { data: ev } = await client.models.Event.get({ id: eventId });
  if (!ev || ev.status !== "published") {
    return { url: null, sessionId: null, error: "This event isn’t available." };
  }

  // One snapshot of active (pending-hold + paid) orders backs the capacity and
  // seat-conflict checks below. Best-effort — DynamoDB has no transaction here
  // (see NOTE at top); pending holds expire via checkout.session.expired.
  const activeOrders = await listActiveOrders(eventId);

  if (seatNumbers.length > 0) {
    const taken = new Set<string>();
    for (const order of activeOrders) {
      if (selectedDate && order.selectedDate && order.selectedDate !== selectedDate) continue;
      for (const seat of order.seatNumbers ?? []) {
        if (seat) taken.add(seat);
      }
    }
    const clash = seatNumbers.filter((s) => taken.has(s));
    if (clash.length > 0) {
      return {
        url: null,
        sessionId: null,
        error: `Seat${clash.length > 1 ? "s" : ""} ${clash.join(", ")} ${clash.length > 1 ? "are" : "is"} no longer available — please pick again.`,
      };
    }
  }

  let lineItems: Record<string, unknown>[] = [];
  let orderLineItems: { ticket_type_id: string; name: string; unit_amount: number; quantity: number }[] = [];
  let quantity = 0;
  let unitAmount = 0;

  if (items.length > 0) {
    // Multi-type cart — price each tier from the DB (trusted).
    const soldPerType = soldByTicketType(activeOrders);
    for (const item of items) {
      const qty = Math.max(0, Math.min(20, Number(item.quantity) || 0));
      if (qty <= 0) continue;
      const { data: tt } = await client.models.EventTicketType.get({ id: item.ticketTypeId });
      if (!tt || tt.eventId !== eventId) {
        return { url: null, sessionId: null, error: "That ticket type isn’t available." };
      }
      if (tt.capacity != null && (soldPerType.get(tt.id) ?? 0) + qty > tt.capacity) {
        return { url: null, sessionId: null, error: `Sorry, “${tt.name}” is sold out.` };
      }
      quantity += qty;
      orderLineItems.push({ ticket_type_id: tt.id, name: tt.name, unit_amount: tt.priceCents, quantity: qty });
      lineItems.push({
        quantity: qty,
        price_data: {
          currency: "aud",
          unit_amount: tt.priceCents,
          product_data: {
            name: `${ev.title || "Event ticket"} — ${tt.name}`,
            ...(selectedDate ? { description: `Show date: ${selectedDate}` } : {}),
          },
        },
      });
    }
    if (orderLineItems.length === 0) {
      return { url: null, sessionId: null, error: "Please select at least one ticket." };
    }
  } else {
    // Legacy single-price path.
    if (ev.isFree || !ev.price || Number(ev.price) <= 0) {
      return { url: null, sessionId: null, error: "This is a free event — no purchase needed." };
    }
    quantity = Math.max(1, Math.min(20, Number(args.quantity) || 1));
    unitAmount = Math.round(Number(ev.price) * 100);

    if (ev.capacity != null) {
      // Count pending holds too — they hold capacity until the session expires.
      const sold = activeOrders.reduce((s, r) => s + (r.quantity ?? 0), 0);
      if (sold + quantity > ev.capacity) {
        return { url: null, sessionId: null, error: "Sorry, this event is sold out." };
      }
    }
    lineItems = [
      {
        quantity,
        price_data: {
          currency: "aud",
          unit_amount: unitAmount,
          product_data: { name: ev.title || "Event ticket" },
        },
      },
    ];
  }

  // Create the pending order.
  const { data: order, errors } = await client.models.TicketOrder.create({
    eventId: ev.id,
    hubId: ev.hubId,
    buyerId: profile.id,
    eventTitle: ev.title || "Event ticket",
    quantity,
    unitAmount: items.length > 0 ? 0 : unitAmount,
    currency: "aud",
    status: "pending",
    customerEmail: claimEmail ?? null,
    selectedDate,
    seatNumbers,
    lineItems: orderLineItems,
    // IAM creates don't auto-populate the owner claim; without it the buyer
    // can't read their own order (My Tickets + the success screen both list
    // owner-scoped). Plain sub passes the owner check.
    owner: sub,
  });
  if (errors || !order) return { url: null, sessionId: null, error: "Couldn’t start checkout." };

  const session = await stripe("/checkout/sessions", {
    mode: "payment",
    expires_at: Math.floor(Date.now() / 1000) + HOLD_SECONDS,
    line_items: lineItems,
    success_url: `${env.SITE_URL}/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.SITE_URL}/tickets/cancel`,
    client_reference_id: order.id,
    customer_email: claimEmail ?? undefined,
    metadata: {
      order_id: order.id,
      event_id: ev.id,
      buyer_id: profile.id,
      selected_date: selectedDate ?? "",
      seat_numbers: seatNumbers.join(", ").slice(0, 480),
    },
  });

  await client.models.TicketOrder.update({ id: order.id, stripeCheckoutSessionId: session.id });

  return { url: session.url ?? null, sessionId: session.id ?? null, error: null };
};
