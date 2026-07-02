import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text, Input, Avatar, Icon, Card, Button, BackButton, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";

import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile } from "@/features/profiles/api";
import {
  useConversation,
  useMessages,
  useSendMessage,
  useMessagesRealtime,
} from "@/features/chat/api";
import { parsePreferences } from "@/lib/validation/profile";

const timeFmt = new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });

export default function ThreadScreen() {
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return (
      <ScreenSkeleton />
    );
  }

  if (!isAuthenticated) {
    return <UnauthenticatedThread />;
  }

  return <Thread />;
}

function ScreenSkeleton() {
  return (
    <View className="flex-1 bg-paper">
      <View className="h-14 border-b border-linen px-gutter items-center flex-row">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="ml-3 h-6 w-32" />
      </View>
      <View className="flex-1 p-4 gap-3">
        <Skeleton className="h-10 w-3/4 self-start rounded-2xl" />
        <Skeleton className="h-10 w-2/3 self-end rounded-2xl" />
        <Skeleton className="h-10 w-4/5 self-start rounded-2xl" />
      </View>
    </View>
  );
}

function UnauthenticatedThread() {
  const router = useRouter();
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-paper">
      <View className="px-gutter pt-2">
        <BackButton fallbackHref="/messages" />
      </View>
      <View className="flex-1 items-center justify-center p-8">
        <Text variant="title" className="text-center">Messages</Text>
        <Text variant="caption" tone="muted" className="mt-3 text-center max-w-[280px]">
          Sign in to view and reply to messages.
        </Text>
        <Button label="Sign in" className="mt-6" onPress={() => router.push("/sign-in")} />
        <Button label="Create account" variant="outline" className="mt-3" onPress={() => router.push("/sign-up")} />
      </View>
    </SafeAreaView>
  );
}

function Thread() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id ?? "";
  const { data: me } = useMyProfile();
  const { data: conversation, isLoading: convLoading } = useConversation(conversationId);
  const { data: messages, isLoading: msgsLoading } = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  useMessagesRealtime(conversationId);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages?.length]);

  const iAmMember = conversation?.member_id === me?.id;
  const hubLogo =
    conversation?.hub?.images?.find((img) => img.type === "logo")?.url ??
    conversation?.hub?.images?.[0]?.url ??
    null;
  const otherName = iAmMember
    ? conversation?.hub?.name ?? "Page"
    : conversation?.member?.full_name || "Member";
  const otherUri = iAmMember ? hubLogo : conversation?.member?.avatar_url ?? null;

  // Profile nudge inside thread
  const prefs = me ? parsePreferences(me.preferences) : null;
  const showCompleteNudge = me && (!me.full_name || !prefs?.onboarding?.completed);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    send.mutate(text);
  };

  const isLoading = convLoading || msgsLoading;

  if (!conversationId) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-paper px-gutter pt-4">
        <BackButton fallbackHref="/messages" />
        <Card className="mt-6">
          <Text variant="caption" tone="muted">Conversation not found.</Text>
        </Card>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-paper">
      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-linen px-gutter py-3">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/messages"))}
          hitSlop={8}
          accessibilityLabel="Back"
          className="-ml-1 h-9 w-9 items-center justify-center rounded-pill active:bg-sand"
        >
          <Icon name="chevron-left" size={20} color={colors.ink} />
        </Pressable>
        <Pressable
          onPress={() => conversation?.hub?.slug && router.push(`/hub/${conversation.hub.slug}`)}
          className="flex-1 flex-row items-center gap-3"
          disabled={!conversation?.hub?.slug}
        >
          <Avatar name={otherName} uri={otherUri} size={38} />
          <View className="flex-1">
            <Text variant="label" className="text-base" numberOfLines={1}>
              {otherName}
            </Text>
            <Text variant="overline" tone="faint">
              {iAmMember ? "Organiser" : "Member"}
            </Text>
          </View>
        </Pressable>
        {conversation?.hub?.slug && (
          <Pressable onPress={() => router.push(`/hub/${conversation.hub!.slug}`)} className="pr-1">
            <Icon name="external" size={18} color={colors.inkMuted} />
          </Pressable>
        )}
      </View>

      {/* Nudge to complete profile */}
      {showCompleteNudge && (
        <View className="px-gutter pt-3">
          <Card className="border-gold-200 bg-gold-50 p-3">
            <Text variant="caption" tone="muted">
              Complete your profile so people know who they&apos;re chatting with.
            </Text>
            <View className="mt-2 flex-row gap-2">
              <Button label="Edit profile" size="sm" variant="outline" onPress={() => router.push("/profile/edit")} />
              <Button label="Onboarding" size="sm" variant="ghost" onPress={() => router.push("/onboarding")} />
            </View>
          </Card>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-form gap-2 px-gutter py-5"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {isLoading ? (
            <View className="gap-3 py-4">
              <Skeleton className="h-9 w-3/4 rounded-2xl self-start" />
              <Skeleton className="h-9 w-2/3 rounded-2xl self-end" />
              <Skeleton className="h-9 w-4/5 rounded-2xl self-start" />
            </View>
          ) : !messages || messages.length === 0 ? (
            <View className="items-center gap-2 py-12">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sand">
                <Icon name="chat" size={22} color={colors.inkMuted} />
              </View>
              <Text variant="caption" tone="faint" className="text-center">
                Say hello to {otherName}.
              </Text>
            </View>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === me?.id;
              return (
                <View key={m.id} className={cn("max-w-[82%]", mine ? "self-end" : "self-start")}>
                  <View
                    className={cn(
                      "rounded-2xl px-4 py-2.5",
                      mine ? "rounded-br-md bg-ink" : "rounded-bl-md border border-linen bg-card",
                    )}
                  >
                    <Text variant="body" className={mine ? "text-paper" : "text-ink"}>
                      {m.body}
                    </Text>
                  </View>
                  <Text variant="overline" tone="faint" className={cn("mt-1", mine ? "text-right" : "")}>
                    {timeFmt.format(new Date(m.created_at))}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Composer */}
        <View className="border-t border-linen px-gutter py-2.5">
          <View className="mx-auto w-full max-w-form flex-row items-end gap-2">
            <View className="flex-1">
              <Input
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message…"
                multiline
                returnKeyType="send"
                onSubmitEditing={submit}
                blurOnSubmit={false}
                className="min-h-[44px]"
              />
            </View>
            <Pressable
              onPress={submit}
              disabled={!draft.trim() || send.isPending}
              accessibilityRole="button"
              accessibilityLabel="Send"
              className={cn(
                "h-12 w-12 items-center justify-center rounded-xl border transition-all duration-150",
                draft.trim()
                  ? "bg-gold-500 border-ink active:bg-gold-600 active:scale-95"
                  : "bg-linen border-transparent opacity-50",
              )}
            >
              <Icon
                name="send"
                size={18}
                color={draft.trim() ? colors.ink : colors.inkFaint}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
