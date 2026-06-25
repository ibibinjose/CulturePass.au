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
  hub: (slug: string) => ["hub", slug] as const,
  myHubs: ["my-hubs"] as const,
  hubEvents: (hubId: string) => ["hub-events", hubId] as const,
  events: (filters?: object) => ["events", filters ?? {}] as const,
  event: (id: string) => ["event", id] as const,
  profile: (id: string) => ["profile", id] as const,
  myProfile: ["my-profile"] as const,
  session: ["session"] as const,
};