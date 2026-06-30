import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { isAwsBackend } from "@/lib/backend";
import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll } from "@/lib/aws/list";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { getCurrentProfileId } from "@/features/auth/api";
import { encryptBody, decryptBody } from "@/lib/utils/crypto";
import type { HubImage, MessageRow } from "@/lib/supabase/database.types";

export interface ChatProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ConversationListItem {
  id: string;
  hub_id: string;
  member_id: string;
  created_at: string;
  last_message_at: string;
  hub: { name: string; slug: string; images: HubImage[] | null; owner_id: string } | null;
  member: ChatProfile | null;
  last_message?: MessageRow | null;
}

export type MessageWithSender = MessageRow & {
  sender: ChatProfile | null;
};

const CONVERSATION_SELECT = `
  id, hub_id, member_id, created_at, last_message_at,
  hub: hubs (name, slug, images, owner_id),
  member: profiles (id, full_name, avatar_url)
`;

// ---- AppSync → row mappers -------------------------------------------------

function mapMessageRow(m: AwsItem<"Message">): MessageRow {
  return {
    id: m.id,
    conversation_id: m.conversationId,
    sender_id: m.senderId,
    body: m.body,
    created_at: m.createdAt,
  };
}

function mapChatProfile(p: AwsItem<"Profile">): ChatProfile {
  return { id: p.id, full_name: p.fullName ?? null, avatar_url: p.avatarUrl ?? null };
}

/** Build a conversation list item with its hub + member embeds (no last_message). */
async function buildAwsConversation(c: AwsItem<"Conversation">): Promise<ConversationListItem> {
  const client = getAwsDataClient();
  const [hubRes, memberRes] = await Promise.all([
    client.models.Hub.get({ id: c.hubId }),
    client.models.Profile.get({ id: c.memberId }),
  ]);
  const hub = hubRes.data;
  const member = memberRes.data;
  return {
    id: c.id,
    hub_id: c.hubId,
    member_id: c.memberId,
    created_at: c.createdAt,
    last_message_at: c.lastMessageAt ?? c.createdAt,
    hub: hub
      ? {
          name: hub.name,
          slug: hub.slug,
          images: (hub.images ?? []) as HubImage[],
          owner_id: hub.ownerId,
        }
      : null,
    member: member ? mapChatProfile(member) : null,
  };
}

/** Inbox — every conversation the signed-in user can see (member or hub editor). */
export function useConversations() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.conversations,
    enabled: isAuthenticated,
    queryFn: async (): Promise<ConversationListItem[]> => {
      if (isAwsBackend) {
        const client = getAwsDataClient();
        const me = await getCurrentProfileId();
        // Hubs the caller owns/edits → conversations they can see as organiser.
        const memberships = me
          ? await collectAll((nextToken) =>
              client.models.HubMember.list({
                filter: {
                  profileId: { eq: me },
                  or: [{ role: { eq: "owner" } }, { role: { eq: "editor" } }],
                },
                nextToken,
              }),
            )
          : [];
        const managedHubIds = new Set(memberships.map((m) => m.hubId));

        // The model grants authenticated read; scope in memory to the member +
        // hub-editor visibility Supabase RLS enforced.
        const all = await collectAll((nextToken) =>
          client.models.Conversation.list({ nextToken }),
        );
        const visible = all.filter(
          (c) => c.memberId === me || managedHubIds.has(c.hubId),
        );
        visible.sort((a, b) =>
          (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt),
        );

        return Promise.all(
          visible.map(async (c) => {
            const item = await buildAwsConversation(c);
            const messages = await collectAll((nextToken) =>
              client.models.Message.list({
                filter: { conversationId: { eq: c.id } },
                nextToken,
              }),
            );
            const latest = messages.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            return {
              ...item,
              last_message: latest
                ? { ...mapMessageRow(latest), body: decryptBody(latest.body, c.id) }
                : null,
            };
          }),
        );
      }

      const { data, error } = await supabase
        .from("conversations")
        .select(CONVERSATION_SELECT)
        .order("last_message_at", { ascending: false })
        .returns<ConversationListItem[]>();
      if (error) throw error;

      const conversations = data ?? [];
      const ids = conversations.map((conversation) => conversation.id);
      if (ids.length === 0) return conversations;

      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(250)
        .returns<MessageRow[]>();
      if (messagesError) throw messagesError;

      const latestByConversation = new Map<string, MessageRow>();
      for (const message of messages ?? []) {
        if (!latestByConversation.has(message.conversation_id)) {
          latestByConversation.set(message.conversation_id, {
            ...message,
            body: decryptBody(message.body, message.conversation_id),
          });
        }
      }

      return conversations.map((conversation) => ({
        ...conversation,
        last_message: latestByConversation.get(conversation.id) ?? null,
      }));
    },
  });
}

/** A single conversation (for the thread header). */
export function useConversation(id: string) {
  return useQuery({
    queryKey: qk.conversation(id),
    enabled: id.length > 0,
    queryFn: async (): Promise<ConversationListItem | null> => {
      if (isAwsBackend) {
        const client = getAwsDataClient();
        const { data } = await client.models.Conversation.get({ id });
        return data ? buildAwsConversation(data) : null;
      }

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
    queryFn: async (): Promise<MessageWithSender[]> => {
      if (isAwsBackend) {
        const client = getAwsDataClient();
        const rows = await collectAll((nextToken) =>
          client.models.Message.list({
            filter: { conversationId: { eq: conversationId } },
            nextToken,
          }),
        );
        rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        // Resolve each distinct sender once.
        const senderIds = [...new Set(rows.map((m) => m.senderId))];
        const senders = new Map<string, ChatProfile>();
        await Promise.all(
          senderIds.map(async (sid) => {
            const { data } = await client.models.Profile.get({ id: sid });
            if (data) senders.set(sid, mapChatProfile(data));
          }),
        );
        return rows.map((m) => ({
          ...mapMessageRow(m),
          body: decryptBody(m.body, conversationId),
          sender: senders.get(m.senderId) ?? null,
        }));
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*, sender: profiles (id, full_name, avatar_url)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .returns<MessageWithSender[]>();
      if (error) throw error;
      const messagesList = data ?? [];
      return messagesList.map((m) => ({
        ...m,
        body: decryptBody(m.body, conversationId),
      }));
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
      const encrypted = encryptBody(trimmed, conversationId);

      if (isAwsBackend) {
        const client = getAwsDataClient();
        const { errors } = await client.models.Message.create({
          conversationId,
          senderId: me,
          body: encrypted,
        });
        if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
        // No DB trigger on AWS — bump the conversation so the inbox re-sorts.
        await client.models.Conversation.update({
          id: conversationId,
          lastMessageAt: new Date().toISOString(),
        });
        return;
      }

      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: me, body: encrypted });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.messages(conversationId) });
      qc.invalidateQueries({ queryKey: qk.conversations });
    },
  });
}

export function useConversationsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: qk.conversations });

    if (isAwsBackend) {
      const client = getAwsDataClient();
      const onConv = client.models.Conversation.onUpdate().subscribe({ next: refresh });
      const onConvNew = client.models.Conversation.onCreate().subscribe({ next: refresh });
      const onMsg = client.models.Message.onCreate().subscribe({ next: refresh });
      return () => {
        onConv.unsubscribe();
        onConvNew.unsubscribe();
        onMsg.unsubscribe();
      };
    }

    const channel = supabase
      .channel("conversations:inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => qc.invalidateQueries({ queryKey: qk.conversations }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => qc.invalidateQueries({ queryKey: qk.conversations }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

/** Find-or-create the conversation between the current member and a hub. */
export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hubId: string): Promise<string> => {
      const me = await getCurrentProfileId();
      if (!me) throw new Error("Sign in to message the organiser.");

      if (isAwsBackend) {
        const client = getAwsDataClient();
        const { data: existing } = await client.models.Conversation.list({
          filter: { hubId: { eq: hubId }, memberId: { eq: me } },
          limit: 1,
        });
        if (existing[0]) return existing[0].id;
        const { data, errors } = await client.models.Conversation.create({
          hubId,
          memberId: me,
          lastMessageAt: new Date().toISOString(),
        });
        if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
        if (!data) throw new Error("Could not start conversation.");
        return data.id;
      }

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

    const refresh = () => {
      qc.invalidateQueries({ queryKey: qk.messages(conversationId) });
      qc.invalidateQueries({ queryKey: qk.conversations });
    };

    if (isAwsBackend) {
      const client = getAwsDataClient();
      const sub = client.models.Message.onCreate({
        filter: { conversationId: { eq: conversationId } },
      }).subscribe({ next: refresh });
      return () => sub.unsubscribe();
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);
}
