import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll } from "@/lib/aws/list";
import { fromAwsJson } from "@/lib/aws/map";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile } from "@/features/profiles/api";
import type { NotificationRow } from "@/lib/types/database.types";

export type AppNotification = NotificationRow;

function mapNotification(n: AwsItem<"Notification">): NotificationRow {
  return {
    id: n.id,
    user_id: n.userId,
    type: n.type ?? "",
    title: n.title,
    body: n.body ?? null,
    data: fromAwsJson<NotificationRow["data"]>(n.data, {}),
    read_at: n.readAt ?? null,
    created_at: n.createdAt,
  };
}

/** The signed-in user's notifications, newest first. */
export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.notifications,
    enabled: isAuthenticated,
    queryFn: async (): Promise<AppNotification[]> => {
      const client = getAwsDataClient();
      // Owner-scoped by the model's `allow.owner()` rule.
      const rows = await collectAll((nextToken) =>
        client.models.Notification.list({ nextToken }),
      );
      return rows
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 60)
        .map(mapNotification);
    },
  });
}

/** Unread count — drives the TopBar bell badge + the lit burger. */
export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.unreadCount,
    enabled: isAuthenticated,
    queryFn: async (): Promise<number> => {
      const client = getAwsDataClient();
      const rows = await collectAll((nextToken) =>
        client.models.Notification.list({
          filter: { readAt: { attributeExists: false } },
          nextToken,
        }),
      );
      return rows.length;
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const client = getAwsDataClient();
      const { errors } = await client.models.Notification.update({
        id,
        readAt: new Date().toISOString(),
      });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unreadCount });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const client = getAwsDataClient();
      const unread = await collectAll((nextToken) =>
        client.models.Notification.list({
          filter: { readAt: { attributeExists: false } },
          nextToken,
        }),
      );
      const now = new Date().toISOString();
      await Promise.all(
        unread.map((n) => client.models.Notification.update({ id: n.id, readAt: now })),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unreadCount });
    },
  });
}

/**
 * Subscribe to the signed-in user's new notifications over AppSync subscriptions
 * and refresh the list + unread count as they arrive. Mounted once near the app root.
 */
export function useNotificationsRealtime() {
  const qc = useQueryClient();
  const { data: profile } = useMyProfile();
  const profileId = profile?.id;

  useEffect(() => {
    if (!profileId) return;

    const refresh = () => {
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unreadCount });
    };

    // AppSync subscriptions; owner-scoped, so no explicit user filter needed.
    const client = getAwsDataClient();
    const onCreate = client.models.Notification.onCreate().subscribe({ next: refresh });
    const onUpdate = client.models.Notification.onUpdate().subscribe({ next: refresh });
    return () => {
      onCreate.unsubscribe();
      onUpdate.unsubscribe();
    };
  }, [profileId, qc]);
}
