import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min — discovery data doesn't need to be realtime
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Centralised query keys — keeps cache invalidation consistent.
export const qk = {
  states: ["states"] as const,
  councils: (state?: string) => ["councils", state ?? "all"] as const,
  hubs: (filters?: object) => ["hubs", filters ?? {}] as const,
  hubStateCounts: ["hub-state-counts"] as const,
  hub: (slug: string) => ["hub", slug] as const,
  myHubs: ["my-hubs"] as const,
  hubEvents: (hubId: string) => ["hub-events", hubId] as const,
  myHubEvents: (hubId: string) => ["my-hub-events", hubId] as const,
  events: (filters?: object) => ["events", filters ?? {}] as const,
  eventStateCounts: ["event-state-counts"] as const,
  event: (id: string) => ["event", id] as const,
  profile: (id: string) => ["profile", id] as const,
  myProfile: ["my-profile"] as const,
  session: ["session"] as const,
  myTickets: ["my-tickets"] as const,
  notifications: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  hubLikes: (hubId: string) => ["hub-likes", hubId] as const,
  hubFollows: (hubId: string) => ["hub-follows", hubId] as const,
  eventLikes: (eventId: string) => ["event-likes", eventId] as const,
  eventSaves: (eventId: string) => ["event-saves", eventId] as const,
  eventRsvps: (eventId: string) => ["event-rsvps", eventId] as const,
  eventCohosts: (eventId: string) => ["event-cohosts", eventId] as const,
  accountSearch: (q: string) => ["account-search", q] as const,
};
