import { Linking, Platform } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import type { Database, HubImage } from "@/lib/supabase/database.types";

export type TicketOrder = Database["public"]["Tables"]["ticket_orders"]["Row"] & {
  event: {
    id: string;
    title: string;
    start_time: string | null;
    images: HubImage[];
    location_city: string | null;
    location_state: string | null;
  } | null;
};

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
 * Start a Stripe Checkout for a paid event ticket. Calls the `tickets-checkout`
 * Edge Function (which holds the secret key) and opens the returned URL.
 *
 * Pass `items` for events with ticket tiers (prices/seats are resolved and
 * reserved server-side). Pass `quantity` only for legacy single-price events
 * that have no ticket types.
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

/** Fetch all ticket types for a specific event. */
export function useEventTicketTypes(eventId: string) {
  return useQuery({
    queryKey: ["event-ticket-types", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<EventTicketType[]> => {
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
 * on the seat chart. Backed by the `get_taken_seats` RPC, which returns only
 * seat labels (no buyer data), so it works for any signed-in buyer.
 */
export function useTakenSeats(eventId: string, selectedDate?: string | null) {
  return useQuery({
    queryKey: ["taken-seats", eventId, selectedDate ?? "none"],
    enabled: !!eventId,
    // Refresh periodically so concurrent bookings surface while the buyer picks.
    refetchInterval: 15000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc("get_taken_seats", {
        p_event_id: eventId,
        p_selected_date: selectedDate ?? null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}
