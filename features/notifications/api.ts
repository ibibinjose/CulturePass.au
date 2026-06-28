import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile } from "@/features/profiles/api";
import type { NotificationRow } from "@/lib/supabase/database.types";

export type AppNotification = NotificationRow;

/** The signed-in user's notifications, newest first. */
export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.notifications,
    enabled: isAuthenticated,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
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
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .is("read_at", null);
      if (error) throw error;
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
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unreadCount });
    },
  });
}

/**
 * Subscribe to the signed-in user's new notifications over Realtime and refresh
 * the list + unread count as they arrive. Mounted once near the app root.
 */
export function useNotificationsRealtime() {
  const qc = useQueryClient();
  const { data: profile } = useMyProfile();
  const profileId = profile?.id;

  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${profileId}` },
        () => {
          qc.invalidateQueries({ queryKey: qk.notifications });
          qc.invalidateQueries({ queryKey: qk.unreadCount });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, qc]);
}
