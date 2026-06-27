import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, Button, BackButton, Card, Avatar, Divider, Icon } from "@/components/ui";
import { colors } from "@/lib/theme";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useMyProfile } from "@/features/profiles/api";
import { useConversations, type ConversationListItem } from "@/features/chat/api";
import { timeAgo } from "@/lib/utils/time";

export default function MessagesScreen() {
  return (
    <RequireAuth>
      <Inbox />
    </RequireAuth>
  );
}

function Inbox() {
  const router = useRouter();
  const { data: me } = useMyProfile();
  const { data: conversations, isLoading, isError } = useConversations();

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/" className="mb-5" />

      <View className="gap-1">
        <Text variant="overline" tone="pink">
          Inbox
        </Text>
        <Text variant="title">Messages</Text>
      </View>

      {isLoading ? (
        <Text variant="caption" tone="faint" className="mt-8">
          Loading…
        </Text>
      ) : isError ? (
        <Card className="mt-8">
          <Text variant="caption" tone="muted">
            Couldn’t load your messages right now.
          </Text>
        </Card>
      ) : conversations && conversations.length > 0 ? (
        <Card padded={false} className="mt-8 px-5">
          {conversations.map((c, i) => (
            <View key={c.id}>
              {i > 0 ? <Divider /> : null}
              <ConversationRow
                conversation={c}
                myProfileId={me?.id}
                onPress={() => router.push(`/messages/${c.id}`)}
              />
            </View>
          ))}
        </Card>
      ) : (
        <Card className="mt-8 items-start gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sand">
            <Icon name="chat" size={22} color={colors.inkMuted} />
          </View>
          <Text variant="subheading">No messages yet</Text>
          <Text variant="caption" tone="muted">
            Open a hub and tap “Message organiser” to start a conversation.
          </Text>
          <Button label="Explore hubs" variant="secondary" size="sm" onPress={() => router.push("/explore")} />
        </Card>
      )}
    </Screen>
  );
}

function ConversationRow({
  conversation,
  myProfileId,
  onPress,
}: {
  conversation: ConversationListItem;
  myProfileId?: string;
  onPress: () => void;
}) {
  // If I'm the member, the other party is the hub; otherwise I'm the organiser.
  const iAmMember = conversation.member_id === myProfileId;
  const hubLogo =
    conversation.hub?.images?.find((img) => img.type === "logo")?.url ??
    conversation.hub?.images?.[0]?.url ??
    null;

  const name = iAmMember ? conversation.hub?.name ?? "Hub" : conversation.member?.full_name || "Member";
  const role = iAmMember ? "Organiser" : "Member";
  const uri = iAmMember ? hubLogo : conversation.member?.avatar_url ?? null;

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3.5 py-4 active:opacity-60">
      <Avatar name={name} uri={uri} size={48} />
      <View className="flex-1">
        <Text variant="label" className="text-base" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" tone="faint">
          {role}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text variant="overline" tone="faint">
          {timeAgo(conversation.last_message_at)}
        </Text>
        <Icon name="chevron-right" size={16} color={colors.inkFaint} />
      </View>
    </Pressable>
  );
}
