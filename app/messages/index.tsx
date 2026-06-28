import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, BackButton, Card, Avatar, Divider, Icon, EmptyCard, Badge } from "@/components/ui";
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

      <View className="gap-1 mb-6">
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
        <Card padded={false} className="px-4 border border-linen rounded-2xl bg-card">
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
        <EmptyCard
          title="No messages yet"
          body="Open a page and tap “Message organiser” to start a conversation."
          action="Discover pages"
          onPress={() => router.push("/")}
        />
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

  const name = iAmMember ? conversation.hub?.name ?? "Page" : conversation.member?.full_name || "Member";
  const role = iAmMember ? "Organiser" : "Member";
  const uri = iAmMember ? hubLogo : conversation.member?.avatar_url ?? null;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3.5 py-4 active:bg-sand/35 rounded-xl px-2 -mx-2 transition-colors duration-150"
    >
      <Avatar name={name} uri={uri} size={48} />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2">
          <Text variant="label" className="text-base font-heading text-ink" numberOfLines={1}>
            {name}
          </Text>
          <Badge
            label={role}
            variant={iAmMember ? "ochre" : "neutral"}
          />
        </View>
        <Text variant="caption" tone="faint" className="mt-1 text-xs" numberOfLines={1}>
          {conversation.last_message?.body || "No messages yet"}
        </Text>
      </View>
      <View className="items-end gap-1.5 justify-center">
        <Text variant="overline" tone="faint" className="text-[10px]">
          {timeAgo(conversation.last_message_at)}
        </Text>
        <Icon name="chevron-right" size={16} color={colors.inkFaint} />
      </View>
    </Pressable>
  );
}
