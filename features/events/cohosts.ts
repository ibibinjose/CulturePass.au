import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll } from "@/lib/aws/list";
import { fromAwsJson } from "@/lib/aws/map";
import { qk } from "@/lib/query";
import { getCurrentProfileId } from "@/features/auth/api";
import {
  HUB_TYPE_LABELS,
  PROFESSIONAL_CATEGORY_LABELS,
  type HubType,
  type ProfessionalCategory,
} from "@/lib/constants";
import type { Database, HubImage } from "@/lib/types/database.types";

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

/** Flatten an AppSync cohost row + its target account into the UI `EventCohost`. */
function buildAwsCohost(
  row: AwsItem<"EventCohost">,
  hub: AwsItem<"Hub"> | null,
  profile: AwsItem<"Profile"> | null,
  eventExtra?: Pick<EventCohost, "eventTitle" | "eventHostName" | "eventImageUrl" | "eventId">,
): EventCohost {
  const base = {
    id: row.id,
    role: (row.role ?? "cohost") as CohostRole,
    status: (row.status ?? "pending") as CohostStatus,
    ...eventExtra,
  };
  if (hub) {
    return {
      ...base,
      kind: "hub",
      hubId: row.hubId ?? null,
      profileId: null,
      name: hub.name,
      subtitle: HUB_TYPE_LABELS[(hub.type ?? "") as HubType] ?? "Hub",
      avatarUrl: hubLogo(fromAwsJson<HubImage[]>(hub.images, [])),
      slug: hub.slug,
      indigenousLed: hub.indigenousLed ?? false,
    };
  }
  return {
    ...base,
    kind: "profile",
    hubId: null,
    profileId: row.profileId ?? null,
    name: profile?.fullName || "Member",
    subtitle: profile?.professionalCategory
      ? PROFESSIONAL_CATEGORY_LABELS[profile.professionalCategory as ProfessionalCategory]
      : "Member",
    avatarUrl: profile?.avatarUrl ?? null,
  };
}

/**
 * Search existing accounts (hubs + profiles) by name to invite as co-hosts.
 * Enabled once the query has ≥2 chars.
 */
export function useSearchAccounts(query: string, opts: { excludeHubId?: string } = {}) {
  const q = query.trim();
  return useQuery({
    queryKey: qk.accountSearch(q),
    enabled: q.length >= 2,
    queryFn: async (): Promise<AccountResult[]> => {
      const client = getAwsDataClient();
      // `limit` + `filter` truncates before filtering (see lib/aws/list.ts) —
      // drain the filtered scan, then cap the mapped results.
      const [hubRows, profileRows] = await Promise.all([
        collectAll((nextToken) =>
          client.models.Hub.list({ filter: { name: { contains: q } }, nextToken }),
        ),
        collectAll((nextToken) =>
          client.models.Profile.list({ filter: { fullName: { contains: q } }, nextToken }),
        ),
      ]);
      const hubs: AccountResult[] = hubRows
        .slice(0, 8)
        .filter((h) => h.id !== opts.excludeHubId)
        .map((h) => ({
          kind: "hub" as const,
          id: h.id,
          name: h.name,
          subtitle: HUB_TYPE_LABELS[(h.type ?? "") as HubType] ?? "Hub",
          avatarUrl: hubLogo(fromAwsJson<HubImage[]>(h.images, [])),
          slug: h.slug,
          indigenousLed: h.indigenousLed ?? false,
        }));
      const profiles: AccountResult[] = profileRows
        .slice(0, 8)
        .filter((p) => (p.fullName ?? "").trim().length > 0)
        .map((p) => ({
          kind: "profile" as const,
          id: p.id,
          name: p.fullName ?? "",
          subtitle: p.professionalCategory
            ? PROFESSIONAL_CATEGORY_LABELS[p.professionalCategory as ProfessionalCategory]
            : "Member",
          avatarUrl: p.avatarUrl ?? null,
        }));
      return [...hubs, ...profiles];
    },
  });
}

/** All co-host rows for an event that the caller is allowed to see. */
export function useEventCohosts(eventId: string) {
  return useQuery({
    queryKey: qk.eventCohosts(eventId),
    enabled: !!eventId,
    queryFn: async (): Promise<EventCohost[]> => {
      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.EventCohost.list({ filter: { eventId: { eq: eventId } }, nextToken }),
      );
      rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return Promise.all(
        rows.map(async (row) => {
          const [hub, profile] = await Promise.all([
            row.hubId ? client.models.Hub.get({ id: row.hubId }).then((r) => r.data) : null,
            row.profileId
              ? client.models.Profile.get({ id: row.profileId }).then((r) => r.data)
              : null,
          ]);
          return buildAwsCohost(row, hub, profile);
        }),
      );
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
      const client = getAwsDataClient();
      const { errors } = await client.models.EventCohost.create({
        eventId,
        hubId: account.kind === "hub" ? account.id : null,
        profileId: account.kind === "profile" ? account.id : null,
        role,
        invitedBy: profileId,
      });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
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
      const client = getAwsDataClient();
      const { errors } = await client.models.EventCohost.update({
        id,
        status,
        respondedAt: new Date().toISOString(),
      });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
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
      const client = getAwsDataClient();
      const { errors } = await client.models.EventCohost.delete({ id });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
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

      const client = getAwsDataClient();
      // Hubs the caller owns/edits → to match hub-targeted invitations.
      const memberships = await collectAll((nextToken) =>
        client.models.HubMember.list({
          filter: {
            profileId: { eq: profileId },
            or: [{ role: { eq: "owner" } }, { role: { eq: "editor" } }],
          },
          nextToken,
        }),
      );
      const managedHubIds = new Set(memberships.map((m) => m.hubId));

      const pending = await collectAll((nextToken) =>
        client.models.EventCohost.list({ filter: { status: { eq: "pending" } }, nextToken }),
      );
      const filtered = pending.filter(
        (row) =>
          row.profileId === profileId || (!!row.hubId && managedHubIds.has(row.hubId)),
      );

      return Promise.all(
        filtered.map(async (row) => {
          const event = (await client.models.Event.get({ id: row.eventId })).data;
          const [eventHub, hub, profile] = await Promise.all([
            event?.hubId ? client.models.Hub.get({ id: event.hubId }).then((r) => r.data) : null,
            row.hubId ? client.models.Hub.get({ id: row.hubId }).then((r) => r.data) : null,
            row.profileId
              ? client.models.Profile.get({ id: row.profileId }).then((r) => r.data)
              : null,
          ]);
          const eventImages = fromAwsJson<HubImage[]>(event?.images, []);
          return buildAwsCohost(row, hub, profile, {
            eventTitle: event?.title || "Untitled Event",
            eventHostName: eventHub?.name || "Independent",
            eventImageUrl: eventImages[0]?.url ?? null,
            eventId: row.eventId,
          });
        }),
      );
    },
  });
}

/** Respond to a co-host invitation generically (from dashboard or notification feed). */
export function useRespondToInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Exclude<CohostStatus, "pending"> }) => {
      const client = getAwsDataClient();
      const { errors } = await client.models.EventCohost.update({
        id,
        status,
        respondedAt: new Date().toISOString(),
      });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
    },
    onSuccess: () => {
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
