import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text, Input, Avatar, Icon } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useMyProfile } from "@/features/profiles/api";
import {
  useConversation,
  useMessages,
  useSendMessage,
  useMessagesRealtime,
} from "@/features/chat/api";

const timeFmt = new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });

export default function ThreadScreen() {
  return (
    <RequireAuth>
      <Thread />
    </RequireAuth>
  );
}

function Thread() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id ?? "";
  const { data: me } = useMyProfile();
  const { data: conversation } = useConversation(conversationId);
  const { data: messages } = useMessages(conversationId);
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

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    send.mutate(text);
  };

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
          onPress={() => conversation?.hub?.slug && iAmMember && router.push(`/hub/${conversation.hub.slug}`)}
          className="flex-1 flex-row items-center gap-3"
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
      </View>

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
          {!messages || messages.length === 0 ? (
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
