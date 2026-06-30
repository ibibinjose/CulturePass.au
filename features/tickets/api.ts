import { Linking, Platform } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { isAwsBackend } from "@/lib/backend";
import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll } from "@/lib/aws/list";
import { compact, nullableList } from "@/lib/aws/map";
import { getAwsCurrentUserId } from "@/lib/aws/auth";
import { qk } from "@/lib/query";
import type { Database, HubImage } from "@/lib/supabase/database.types";

type TicketOrderRow = Database["public"]["Tables"]["ticket_orders"]["Row"];

export type TicketOrder = TicketOrderRow & {
  event: {
    id: string;
    title: string;
    start_time: string | null;
    images: HubImage[];
    location_city: string | null;
    location_state: string | null;
  } | null;
};

// ---- AppSync → row mappers -------------------------------------------------

function mapTicketOrder(o: AwsItem<"TicketOrder">): TicketOrderRow {
  return {
    id: o.id,
    event_id: o.eventId ?? null,
    hub_id: o.hubId ?? null,
    buyer_id: o.buyerId ?? null,
    event_title: o.eventTitle ?? "",
    quantity: o.quantity ?? 0,
    unit_amount: o.unitAmount ?? 0,
    amount_total: o.amountTotal ?? null,
    currency: o.currency ?? "aud",
    status: (o.status ?? "pending") as TicketOrderRow["status"],
    customer_email: o.customerEmail ?? null,
    stripe_checkout_session_id: o.stripeCheckoutSessionId ?? null,
    stripe_payment_intent_id: o.stripePaymentIntentId ?? null,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    paid_at: o.paidAt ?? null,
    ticket_type_id: o.ticketTypeId ?? null,
    selected_date: o.selectedDate ?? null,
    seat_numbers: nullableList(o.seatNumbers),
    line_items: (o.lineItems ?? []) as TicketOrderRow["line_items"],
  };
}

/** Attach the small event embed `TicketOrder.event` carries. */
async function withEventEmbed(order: TicketOrderRow): Promise<TicketOrder> {
  if (!order.event_id) return { ...order, event: null };
  const client = getAwsDataClient();
  const { data: e } = await client.models.Event.get({ id: order.event_id });
  return {
    ...order,
    event: e
      ? {
          id: e.id,
          title: e.title ?? "",
          start_time: e.startTime ?? null,
          images: (e.images ?? []) as HubImage[],
          location_city: e.locationCity ?? null,
          location_state: e.locationState ?? null,
        }
      : null,
  };
}

/** Open the Stripe Checkout URL: redirect on web, system browser on native. */
function openCheckout(url: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.location.assign(url);
  } else {
    void Linking.openURL(url);
  }
}

/** One line of a multi-type cart sent to the checkout function. */
export type CartItem = { ticketTypeId: string; quantity: number };

/**
 * Start a Stripe Checkout for a paid event ticket. On Supabase this calls the
 * `tickets-checkout` Edge Function; on AWS the `ticketsCheckout` AppSync custom
 * mutation (Lambda). Both hold the secret key server-side and return a URL.
 */
export function useBuyTicket() {
  return useMutation({
    mutationFn: async ({
      eventId,
      quantity,
      items,
      selectedDate,
      seatNumbers,
    }: {
      eventId: string;
      quantity?: number;
      items?: CartItem[];
      selectedDate?: string;
      seatNumbers?: string[];
    }) => {
      if (isAwsBackend) {
        const client = getAwsDataClient();
        const { data, errors } = await client.mutations.ticketsCheckout({
          eventId,
          quantity: quantity ?? null,
          items: items ? JSON.stringify(items) : null,
          selectedDate: selectedDate ?? null,
          seatNumbers: seatNumbers ?? null,
        });
        if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
        if (data?.error) throw new Error(data.error);
        if (!data?.url) throw new Error("Checkout is unavailable right now.");
        openCheckout(data.url);
        return data.url;
      }

      const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
        "tickets-checkout",
        { body: { eventId, quantity, items, selectedDate, seatNumbers } },
      );

      if (error) {
        // Surface the function's JSON error body when present.
        let message = "Couldn’t start checkout. Please try again.";
        const ctx = (error as { context?: Response }).context;
        try {
          const body = await ctx?.json();
          if (body?.error) message = body.error as string;
        } catch {
          // ignore — fall back to the generic message
        }
        throw new Error(message);
      }

      if (!data?.url) throw new Error(data?.error ?? "Checkout is unavailable right now.");
      openCheckout(data.url);
      return data.url;
    },
  });
}

/** The signed-in buyer's ticket orders (most recent first). */
export function useMyTickets() {
  return useQuery({
    queryKey: qk.myTickets,
    queryFn: async (): Promise<TicketOrder[]> => {
      if (isAwsBackend) {
        const userId = await getAwsCurrentUserId();
        if (!userId) return [];
        const client = getAwsDataClient();
        // Owner-scoped by the model's `allow.owner()` rule.
        const orders = await collectAll((nextToken) =>
          client.models.TicketOrder.list({ nextToken }),
        );
        orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return Promise.all(orders.map((o) => withEventEmbed(mapTicketOrder(o))));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("ticket_orders")
        .select(
          `*, event:events (id, title, start_time, images, location_city, location_state)`,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TicketOrder[];
    },
  });
}

/** Confirm a checkout session resolved to a paid order (used on the success screen). */
export function useTicketBySession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-session", sessionId ?? "none"],
    enabled: !!sessionId,
    refetchInterval: (query) =>
      (query.state.data as TicketOrder | null)?.status === "paid" ? false : 2000,
    queryFn: async (): Promise<TicketOrder | null> => {
      if (isAwsBackend) {
        const client = getAwsDataClient();
        const { data } = await client.models.TicketOrder.list({
          filter: { stripeCheckoutSessionId: { eq: sessionId! } },
          limit: 1,
        });
        const order = data[0];
        return order ? withEventEmbed(mapTicketOrder(order)) : null;
      }

      const { data, error } = await supabase
        .from("ticket_orders")
        .select(
          `*, event:events (id, title, start_time, images, location_city, location_state)`,
        )
        .eq("stripe_checkout_session_id", sessionId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as TicketOrder) ?? null;
    },
  });
}

export type EventTicketType = Database["public"]["Tables"]["event_ticket_types"]["Row"];

function mapTicketType(t: AwsItem<"EventTicketType">): EventTicketType {
  return {
    id: t.id,
    event_id: t.eventId,
    name: t.name,
    price_cents: t.priceCents,
    capacity: t.capacity ?? null,
    sold_count: t.soldCount ?? 0,
    description: t.description ?? null,
    created_at: t.createdAt,
  };
}

/** Fetch all ticket types for a specific event. */
export function useEventTicketTypes(eventId: string) {
  return useQuery({
    queryKey: ["event-ticket-types", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<EventTicketType[]> => {
      if (isAwsBackend) {
        const client = getAwsDataClient();
        const rows = await collectAll((nextToken) =>
          client.models.EventTicketType.list({ filter: { eventId: { eq: eventId } }, nextToken }),
        );
        return rows.map(mapTicketType).sort((a, b) => a.price_cents - b.price_cents);
      }

      const { data, error } = await supabase
        .from("event_ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("price_cents", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Seats already held or sold for an event + show date, for rendering occupancy
 * on the seat chart. On Supabase this is the `get_taken_seats` RPC; on AWS the
 * `getTakenSeats` AppSync custom query (Lambda) — both return only seat labels
 * (no buyer data) so any signed-in buyer can read occupancy.
 */
export function useTakenSeats(eventId: string, selectedDate?: string | null) {
  return useQuery({
    queryKey: ["taken-seats", eventId, selectedDate ?? "none"],
    enabled: !!eventId,
    // Refresh periodically so concurrent bookings surface while the buyer picks.
    refetchInterval: 15000,
    queryFn: async (): Promise<string[]> => {
      if (isAwsBackend) {
        const client = getAwsDataClient();
        const { data, errors } = await client.queries.getTakenSeats({
          eventId,
          selectedDate: selectedDate ?? null,
        });
        if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
        return compact(data);
      }

      const { data, error } = await supabase.rpc("get_taken_seats", {
        p_event_id: eventId,
        p_selected_date: selectedDate ?? null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}
