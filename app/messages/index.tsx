import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, BackButton, Card, Avatar, Divider, Icon, EmptyCard, Badge } from "@/components/ui";
import { colors } from "@/lib/theme";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile } from "@/features/profiles/api";
import { useConversations, useConversationsRealtime, type ConversationListItem } from "@/features/chat/api";
import { timeAgo } from "@/lib/utils/time";
import { parsePreferences } from "@/lib/validation/profile";

export default function MessagesScreen() {
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return (
      <Screen maxWidth="form" contentClassName="pt-6">
        <BackButton fallbackHref="/" className="mb-5" />
        <View className="gap-1 mb-6">
          <Text variant="overline" tone="pink">Inbox</Text>
          <Text variant="title">Messages</Text>
        </View>
        <Card className="h-20" />
        <Card className="mt-3 h-20" />
        <Card className="mt-3 h-20" />
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return <UnauthenticatedMessages />;
  }

  return <Inbox />;
}

function UnauthenticatedMessages() {
  const router = useRouter();
  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/" className="mb-5" />
      <View className="gap-1 mb-6">
        <Text variant="overline" tone="pink">Inbox</Text>
        <Text variant="title">Messages</Text>
      </View>

      <Card>
        <Text variant="subheading">Your messages</Text>
        <Text variant="caption" tone="faint" className="mt-1">
          Sign in to view and send messages with hubs and organisers.
        </Text>
      </Card>

      <Text variant="overline" tone="pink" className="mb-2 mt-8">Get started</Text>
      <Card padded={false} className="px-5">
        <Pressable onPress={() => router.push("/sign-in")} className="py-3">
          <Text variant="label">Sign in</Text>
        </Pressable>
        <Divider />
        <Pressable onPress={() => router.push("/sign-up")} className="py-3">
          <Text variant="label">Create account</Text>
        </Pressable>
      </Card>

      <Text variant="overline" tone="pink" className="mb-2 mt-8">How it works</Text>
      <Card className="px-5 py-4">
        <Text variant="caption" tone="muted">
          Visit any hub page and tap “Message” to chat with the organiser. Conversations appear here.
        </Text>
      </Card>
    </Screen>
  );
}

function Inbox() {
  const router = useRouter();
  const { data: me } = useMyProfile();
  const { data: conversations, isLoading, isError } = useConversations();
  useConversationsRealtime();

  const prefs = me ? parsePreferences(me.preferences) : null;
  const onboardingComplete = !!prefs?.onboarding?.completed;
  const profileIncomplete = !me?.full_name || !me?.interests?.length;

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/" className="mb-5" />

      <View className="gap-1 mb-6">
        <Text variant="overline" tone="pink">Inbox</Text>
        <Text variant="title">Messages</Text>
      </View>

      {/* Profile header (consistent with settings) */}
      {me && (
        <Card className="mb-4" onPress={() => router.push(`/profile/${me.id}`)}>
          <View className="flex-row items-center gap-3">
            <Avatar name={me.full_name} uri={me.avatar_url} size={40} />
            <View className="flex-1">
              <Text variant="subheading">Your messages</Text>
              <Text variant="caption" tone="faint" numberOfLines={1}>
                {me.full_name || "Complete your profile"}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.inkFaint} />
          </View>
        </Card>
      )}

      {/* Recommend completing profile/onboarding */}
      {me && (profileIncomplete || !onboardingComplete) && (
        <Card className="mb-4 border-gold-200 bg-gold-50">
          <Text variant="label">Complete your profile</Text>
          <Text variant="caption" tone="muted" className="mt-1">
            Finish your details so organisers can recognise you in messages.
          </Text>
          <View className="mt-3 flex-row gap-2">
            <Pressable onPress={() => router.push("/profile/edit")} className="flex-1">
              <Card className="p-3">
                <Text variant="label" className="text-sm">Edit profile</Text>
              </Card>
            </Pressable>
            {!onboardingComplete && (
              <Pressable onPress={() => router.push("/onboarding")} className="flex-1">
                <Card className="p-3">
                  <Text variant="label" className="text-sm">Onboarding</Text>
                </Card>
              </Pressable>
            )}
          </View>
        </Card>
      )}

      {isLoading ? (
        <View className="gap-3">
          <Card className="h-16" />
          <Card className="h-16" />
          <Card className="h-16" />
        </View>
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
