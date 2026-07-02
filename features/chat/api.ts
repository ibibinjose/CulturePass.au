import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { type AwsItem, getAwsDataClient } from "@/lib/aws/data";
import { collectAll, findFirst } from "@/lib/aws/list";
import { fromAwsJson } from "@/lib/aws/map";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { getCurrentProfileId } from "@/features/auth/api";
import { getAwsCurrentUserId } from "@/lib/aws/auth";
import { encryptBody, decryptBody } from "@/lib/utils/crypto";
import type { HubImage, MessageRow } from "@/lib/types/database.types";

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
          images: fromAwsJson<HubImage[]>(hub.images, []),
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

      // The server already scopes this list to threads the caller participates
      // in (`ownersDefinedIn("participants")`); the filter below is kept as
      // defence-in-depth and to drop any legacy rows without participants.
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
    },
  });
}

/** A single conversation (for the thread header). */
export function useConversation(id: string) {
  return useQuery({
    queryKey: qk.conversation(id),
    enabled: id.length > 0,
    queryFn: async (): Promise<ConversationListItem | null> => {
      const client = getAwsDataClient();
      const { data } = await client.models.Conversation.get({ id });
      return data ? buildAwsConversation(data) : null;
    },
  });
}

/** Messages in a thread, oldest first. */
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: qk.messages(conversationId),
    enabled: conversationId.length > 0,
    queryFn: async (): Promise<MessageWithSender[]> => {
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

      const client = getAwsDataClient();
      // Messages carry the conversation's participants (Cognito subs) so the
      // `ownersDefinedIn("participants")` rule lets both parties read them.
      const { data: conversation } = await client.models.Conversation.get({ id: conversationId });
      if (!conversation) throw new Error("This conversation is no longer available.");
      const { errors } = await client.models.Message.create({
        conversationId,
        senderId: me,
        body: encrypted,
        participants: conversation.participants ?? [],
      });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      // No DB trigger on AWS — bump the conversation so the inbox re-sorts.
      await client.models.Conversation.update({
        id: conversationId,
        lastMessageAt: new Date().toISOString(),
      });
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

    const client = getAwsDataClient();
    const onConv = client.models.Conversation.onUpdate().subscribe({ next: refresh });
    const onConvNew = client.models.Conversation.onCreate().subscribe({ next: refresh });
    const onMsg = client.models.Message.onCreate().subscribe({ next: refresh });
    return () => {
      onConv.unsubscribe();
      onConvNew.unsubscribe();
      onMsg.unsubscribe();
    };
  }, [qc]);
}

/** Find-or-create the conversation between the current member and a hub. */
export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hubId: string): Promise<string> => {
      const me = await getCurrentProfileId();
      const mySub = await getAwsCurrentUserId();
      if (!me || !mySub) throw new Error("Sign in to message the organiser.");

      const client = getAwsDataClient();
      const existing = await findFirst((nextToken) =>
        client.models.Conversation.list({
          filter: { hubId: { eq: hubId }, memberId: { eq: me } },
          nextToken,
        }),
      );
      if (existing) return existing.id;

      // Access is participant-scoped (`ownersDefinedIn`): the thread belongs to
      // the member and the hub owner, identified by their Cognito subs.
      const { data: hub } = await client.models.Hub.get({ id: hubId });
      if (!hub) throw new Error("This hub is no longer available.");
      const { data: ownerProfile } = await client.models.Profile.get({ id: hub.ownerId });
      const participants = [...new Set([mySub, ownerProfile?.userId].filter((s): s is string => !!s))];

      const { data, errors } = await client.models.Conversation.create({
        hubId,
        memberId: me,
        lastMessageAt: new Date().toISOString(),
        participants,
      });
      if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));
      if (!data) throw new Error("Could not start conversation.");
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

    const client = getAwsDataClient();
    const sub = client.models.Message.onCreate({
      filter: { conversationId: { eq: conversationId } },
    }).subscribe({ next: refresh });
    return () => sub.unsubscribe();
  }, [conversationId, qc]);
}
