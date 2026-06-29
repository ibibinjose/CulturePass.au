import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import { getCurrentProfileId } from "@/features/auth/api";
import {
  HUB_TYPE_LABELS,
  PROFESSIONAL_CATEGORY_LABELS,
  type HubType,
  type ProfessionalCategory,
} from "@/lib/constants";
import type { Database, HubImage } from "@/lib/supabase/database.types";

export type CohostRole = Database["public"]["Enums"]["cohost_role"];
export type CohostStatus = Database["public"]["Enums"]["cohost_status"];
export type AccountKind = "hub" | "profile";

export const COHOST_ROLE_LABELS: Record<CohostRole, string> = {
  cohost: "Co-host",
  venue: "Venue",
  partner: "Partner",
  sponsor: "Sponsor",
};

/** A normalized search hit — either a hub or a profile account. */
export interface AccountResult {
  kind: AccountKind;
  id: string;
  name: string;
  subtitle: string;
  avatarUrl: string | null;
  slug?: string;
  indigenousLed?: boolean;
}

/** A co-host row joined with its target account, flattened for the UI. */
export interface EventCohost {
  id: string;
  role: CohostRole;
  status: CohostStatus;
  kind: AccountKind;
  hubId: string | null;
  profileId: string | null;
  name: string;
  subtitle: string;
  avatarUrl: string | null;
  slug?: string;
  indigenousLed?: boolean;
  
  // Optional event details for invitations dashboard
  eventTitle?: string;
  eventHostName?: string;
  eventImageUrl?: string | null;
  eventId?: string;
}

function hubLogo(images: HubImage[] | null | undefined): string | null {
  return (images ?? []).find((i) => i?.type === "logo")?.url ?? null;
}

/**
 * Search existing accounts (hubs + profiles) by name to invite as co-hosts.
 * RLS already allows reading visible hubs and all profiles, so two simple
 * client queries are merged here. Enabled once the query has ≥2 chars.
 */
export function useSearchAccounts(query: string, opts: { excludeHubId?: string } = {}) {
  const q = query.trim();
  return useQuery({
    queryKey: qk.accountSearch(q),
    enabled: q.length >= 2,
    queryFn: async (): Promise<AccountResult[]> => {
      const like = `%${q}%`;
      const [hubsRes, profilesRes] = await Promise.all([
        supabase
          .from("hubs")
          .select("id, name, slug, type, images, indigenous_led")
          .ilike("name", like)
          .limit(8),
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, professional_category, is_public_professional")
          .ilike("full_name", like)
          .limit(8),
      ]);
      if (hubsRes.error) throw hubsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const hubs: AccountResult[] = (hubsRes.data ?? [])
        .filter((h) => h.id !== opts.excludeHubId)
        .map((h) => ({
          kind: "hub" as const,
          id: h.id,
          name: h.name,
          subtitle: HUB_TYPE_LABELS[h.type as HubType] ?? "Hub",
          avatarUrl: hubLogo(h.images),
          slug: h.slug,
          indigenousLed: h.indigenous_led,
        }));

      const profiles: AccountResult[] = (profilesRes.data ?? [])
        .filter((p) => p.full_name.trim().length > 0)
        .map((p) => ({
          kind: "profile" as const,
          id: p.id,
          name: p.full_name,
          subtitle: p.professional_category
            ? PROFESSIONAL_CATEGORY_LABELS[p.professional_category as ProfessionalCategory]
            : "Member",
          avatarUrl: p.avatar_url,
        }));

      return [...hubs, ...profiles];
    },
  });
}

const COHOST_SELECT =
  "*, hub:hubs(id, name, slug, type, images, indigenous_led), profile:profiles(id, full_name, avatar_url, professional_category)";

/** All co-host rows for an event that the caller is allowed to see (RLS-scoped). */
export function useEventCohosts(eventId: string) {
  return useQuery({
    queryKey: qk.eventCohosts(eventId),
    enabled: !!eventId,
    queryFn: async (): Promise<EventCohost[]> => {
      const { data, error } = await supabase
        .from("event_cohosts")
        .select(COHOST_SELECT)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      return (data ?? []).map((row): EventCohost => {
        const hub = row.hub as
          | { id: string; name: string; slug: string; type: string; images: HubImage[]; indigenous_led: boolean }
          | null;
        const prof = row.profile as
          | { id: string; full_name: string; avatar_url: string | null; professional_category: string | null }
          | null;
        if (hub) {
          return {
            id: row.id,
            role: row.role,
            status: row.status,
            kind: "hub",
            hubId: row.hub_id,
            profileId: null,
            name: hub.name,
            subtitle: HUB_TYPE_LABELS[hub.type as HubType] ?? "Hub",
            avatarUrl: hubLogo(hub.images),
            slug: hub.slug,
            indigenousLed: hub.indigenous_led,
          };
        }
        return {
          id: row.id,
          role: row.role,
          status: row.status,
          kind: "profile",
          hubId: null,
          profileId: row.profile_id,
          name: prof?.full_name || "Member",
          subtitle: prof?.professional_category
            ? PROFESSIONAL_CATEGORY_LABELS[prof.professional_category as ProfessionalCategory]
            : "Member",
          avatarUrl: prof?.avatar_url ?? null,
        };
      });
    },
  });
}

/** Invite an account (hub or profile) to co-host an event. Host/editor only. */
export function useInviteCohost(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      account,
      role,
    }: {
      account: Pick<AccountResult, "kind" | "id">;
      role: CohostRole;
    }) => {
      const profileId = await getCurrentProfileId();
      if (!profileId) throw new Error("You must be signed in to invite co-hosts.");
      const { error } = await supabase.from("event_cohosts").insert({
        event_id: eventId,
        hub_id: account.kind === "hub" ? account.id : null,
        profile_id: account.kind === "profile" ? account.id : null,
        role,
        invited_by: profileId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.eventCohosts(eventId) });
    },
  });
}

/** Accept or decline a co-host invitation. Invited party only. */
export function useRespondToCohost(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Exclude<CohostStatus, "pending"> }) => {
      const { error } = await supabase.from("event_cohosts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.eventCohosts(eventId) });
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unreadCount });
    },
  });
}

/** Remove a co-host invitation. Host or the invited party. */
export function useRemoveCohost(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("event_cohosts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.eventCohosts(eventId) });
    },
  });
}

/** Fetch pending invitations where the current user or their managed hubs are targeted. */
export function useMyCohostInvitations() {
  return useQuery({
    queryKey: qk.myCohostInvitations,
    queryFn: async (): Promise<EventCohost[]> => {
      const profileId = await getCurrentProfileId();
      if (!profileId) return [];

      // Fetch editable/owned hubs to match target hub invitations
      const { data: memberships, error: memError } = await supabase
        .from("hub_members")
        .select("hub_id")
        .eq("profile_id", profileId)
        .in("role", ["owner", "editor"]);

      if (memError) throw memError;
      const managedHubIds = new Set((memberships ?? []).map((m) => m.hub_id));

      // Fetch pending invitations
      const { data, error } = await supabase
        .from("event_cohosts")
        .select(`
          *,
          event:events(id, title, status, images, hub_id, hub:hubs(name)),
          hub:hubs(id, name, slug, type, images, indigenous_led),
          profile:profiles!event_cohosts_profile_id_fkey(id, full_name, avatar_url, professional_category)
        `)
        .eq("status", "pending");

      if (error) throw error;

      // Filter in memory for security & accuracy
      const filtered = (data ?? []).filter((row) => {
        if (row.profile_id === profileId) return true;
        if (row.hub_id && managedHubIds.has(row.hub_id)) return true;
        return false;
      });

      return filtered.map((row): EventCohost => {
        const event = row.event as any;
        const hub = row.hub as any;
        const prof = row.profile as any;
        
        if (hub) {
          return {
            id: row.id,
            role: row.role,
            status: row.status,
            kind: "hub",
            hubId: row.hub_id,
            profileId: null,
            name: hub.name,
            subtitle: HUB_TYPE_LABELS[hub.type as HubType] ?? "Hub",
            avatarUrl: hubLogo(hub.images),
            slug: hub.slug,
            indigenousLed: hub.indigenous_led,
            eventTitle: event?.title || "Untitled Event",
            eventHostName: event?.hub?.name || "Independent",
            eventImageUrl: event?.images?.[0]?.url || null,
            eventId: row.event_id,
          };
        }
        return {
          id: row.id,
          role: row.role,
          status: row.status,
          kind: "profile",
          hubId: null,
          profileId: row.profile_id,
          name: prof?.full_name || "Member",
          subtitle: prof?.professional_category
            ? PROFESSIONAL_CATEGORY_LABELS[prof.professional_category as ProfessionalCategory]
            : "Member",
          avatarUrl: prof?.avatar_url ?? null,
          eventTitle: event?.title || "Untitled Event",
          eventHostName: event?.hub?.name || "Independent",
          eventImageUrl: event?.images?.[0]?.url || null,
          eventId: row.event_id,
        };
      });
    },
  });
}

/** Respond to a co-host invitation generically (from dashboard or notification feed). */
export function useRespondToInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Exclude<CohostStatus, "pending"> }) => {
      const { error } = await supabase.from("event_cohosts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: qk.myCohostInvitations });
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unreadCount });
      qc.invalidateQueries({ queryKey: ["event-cohosts"] });
      qc.invalidateQueries({ queryKey: qk.myHubs });
      qc.invalidateQueries({ queryKey: ["my-hub-events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
