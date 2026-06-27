import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { getCurrentProfileId } from "@/features/auth/api";
import type { HubImage, MessageRow } from "@/lib/supabase/database.types";

export interface ConversationListItem {
  id: string;
  hub_id: string;
  member_id: string;
  created_at: string;
  last_message_at: string;
  hub: { name: string; slug: string; images: HubImage[] | null; owner_id: string } | null;
  member: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

const CONVERSATION_SELECT = `
  id, hub_id, member_id, created_at, last_message_at,
  hub: hubs (name, slug, images, owner_id),
  member: profiles (id, full_name, avatar_url)
`;

/** Inbox — every conversation the signed-in user can see (member or hub editor). */
export function useConversations() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.conversations,
    enabled: isAuthenticated,
    queryFn: async (): Promise<ConversationListItem[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select(CONVERSATION_SELECT)
        .order("last_message_at", { ascending: false })
        .returns<ConversationListItem[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** A single conversation (for the thread header). */
export function useConversation(id: string) {
  return useQuery({
    queryKey: qk.conversation(id),
    enabled: id.length > 0,
    queryFn: async (): Promise<ConversationListItem | null> => {
      const { data, error } = await supabase
        .from("conversations")
        .select(CONVERSATION_SELECT)
        .eq("id", id)
        .limit(1)
        .returns<ConversationListItem[]>();
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

/** Messages in a thread, oldest first. */
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: qk.messages(conversationId),
    enabled: conversationId.length > 0,
    queryFn: async (): Promise<MessageRow[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const me = await getCurrentProfileId();
      if (!me) throw new Error("Sign in to send messages.");
      const trimmed = body.trim();
      if (!trimmed) return;
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: me, body: trimmed });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.messages(conversationId) });
      qc.invalidateQueries({ queryKey: qk.conversations });
    },
  });
}

/** Find-or-create the conversation between the current member and a hub. */
export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hubId: string): Promise<string> => {
      const me = await getCurrentProfileId();
      if (!me) throw new Error("Sign in to message the organiser.");

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("hub_id", hubId)
        .eq("member_id", me)
        .maybeSingle();
      if (existing) return existing.id;

      const { data, error } = await supabase
        .from("conversations")
        .insert({ hub_id: hubId, member_id: me })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations }),
  });
}

/** Live-update a thread + the inbox as new messages arrive. */
export function useMessagesRealtime(conversationId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: qk.messages(conversationId) });
          qc.invalidateQueries({ queryKey: qk.conversations });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);
}
