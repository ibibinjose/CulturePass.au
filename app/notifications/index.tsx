import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { Screen, Text, Button, BackButton, Card, Divider, Icon, type IconName } from "@/components/ui";
import { colors } from "@/lib/theme";
import { RequireAuth } from "@/features/auth/RequireAuth";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "@/features/notifications/api";
import { timeAgo } from "@/lib/utils/time";

export default function NotificationsScreen() {
  return (
    <RequireAuth>
      <Notifications />
    </RequireAuth>
  );
}

function iconFor(type: string): IconName {
  if (type === "message") return "chat";
  if (type === "event") return "calendar";
  if (type === "rsvp") return "users";
  if (type === "tier_upgrade") return "star";
  return "bell";
}

function hrefFor(n: AppNotification): Href | null {
  const data = (n.data ?? {}) as Record<string, unknown>;
  if (typeof data.conversation_id === "string") return `/messages/${data.conversation_id}`;
  if (typeof data.event_id === "string") return `/event/${data.event_id}`;
  return null;
}

function Notifications() {
  const router = useRouter();
  const { data: notifications, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = (notifications ?? []).filter((n) => !n.read_at).length;

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    const href = hrefFor(n);
    if (href) router.push(href);
  };

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/" className="mb-5" />

      <View className="flex-row items-end justify-between gap-3">
        <View className="gap-1">
          <Text variant="overline" tone="pink">
            Activity
          </Text>
          <Text variant="title">Notifications</Text>
        </View>
        {unread > 0 ? (
          <Button label="Mark all read" variant="outline" size="sm" loading={markAll.isPending} onPress={() => markAll.mutate()} />
        ) : null}
      </View>

      {isLoading ? (
        <Text variant="caption" tone="faint" className="mt-8">
          Loading…
        </Text>
      ) : isError ? (
        <Card className="mt-8">
          <Text variant="caption" tone="muted">
            Couldn’t load notifications right now.
          </Text>
        </Card>
      ) : notifications && notifications.length > 0 ? (
        <Card padded={false} className="mt-8 px-5">
          {notifications.map((n, i) => (
            <View key={n.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable onPress={() => open(n)} className="flex-row items-start gap-3.5 py-4 active:opacity-60">
                <View
                  className={`mt-0.5 h-10 w-10 items-center justify-center rounded-xl ${
                    n.read_at ? "bg-sand" : "bg-ochre-50"
                  }`}
                >
                  <Icon name={iconFor(n.type)} size={18} color={n.read_at ? colors.inkMuted : colors.ochre} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text variant="label" className={n.read_at ? "" : "font-heading"} numberOfLines={2}>
                    {n.title}
                  </Text>
                  {n.body ? (
                    <Text variant="caption" tone="muted" numberOfLines={2}>
                      {n.body}
                    </Text>
                  ) : null}
                  <Text variant="overline" tone="faint">
                    {timeAgo(n.created_at)}
                  </Text>
                </View>
                {!n.read_at ? <View className="mt-2 h-2 w-2 rounded-pill bg-ochre-500" /> : null}
              </Pressable>
            </View>
          ))}
        </Card>
      ) : (
        <Card className="mt-8 items-start gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sand">
            <Icon name="bell" size={22} color={colors.inkMuted} />
          </View>
          <Text variant="subheading">You’re all caught up</Text>
          <Text variant="caption" tone="muted">
            Replies from organisers and event updates will show up here.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
