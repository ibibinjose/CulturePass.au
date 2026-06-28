import { useState } from "react";
import { View } from "react-native";

import { Screen, Text, BackButton, Card, ListRow, Toggle, Divider } from "@/components/ui";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useMyProfile, useUpdateMyProfile, type Profile } from "@/features/profiles/api";
import { parsePreferences, type ProfilePreferences } from "@/lib/validation/profile";

export default function NotificationsScreen() {
  return (
    <RequireAuth>
      <NotificationsLoader />
    </RequireAuth>
  );
}

function NotificationsLoader() {
  const { data: profile, isLoading } = useMyProfile();
  if (isLoading || !profile) {
    return (
      <Screen maxWidth="form" contentClassName="pt-section">
        <Text variant="caption" tone="faint">
          Loading…
        </Text>
      </Screen>
    );
  }
  return <Notifications key={profile.id} profile={profile} />;
}

type NotificationKey = keyof ProfilePreferences["notifications"];

const ROWS: { key: NotificationKey; title: string; subtitle: string }[] = [
  {
    key: "email_event_reminders",
    title: "Event reminders",
    subtitle: "Emails before events you’re going to",
  },
  {
    key: "email_hub_updates",
    title: "Hub updates",
    subtitle: "News from hubs you follow or run",
  },
  {
    key: "email_announcements",
    title: "Announcements",
    subtitle: "Occasional product news from CulturePass",
  },
  {
    key: "weekly_digest",
    title: "Weekly digest",
    subtitle: "A weekly roundup of what’s on near you",
  },
];

function Notifications({ profile }: { profile: Profile }) {
  const update = useUpdateMyProfile();
  const [prefs, setPrefs] = useState<ProfilePreferences>(() => parsePreferences(profile.preferences));
  const [banner, setBanner] = useState<string | null>(null);

  function setNotification(key: NotificationKey, value: boolean) {
    setBanner(null);
    const next = { ...prefs, notifications: { ...prefs.notifications, [key]: value } };
    setPrefs(next);
    update.mutate(
      { preferences: next },
      { onError: () => setBanner("Couldn’t save that change. Please try again.") },
    );
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/settings" className="mb-5" />

      <Text variant="overline" tone="pink">
        Notifications
      </Text>
      <Text variant="title" className="mt-2">
        Notifications
      </Text>
      <Text variant="lead" className="mt-3">
        Choose which emails you’d like to receive.
      </Text>

      <Text variant="overline" tone="pink" className="mb-1 mt-8">
        Email
      </Text>
      <Card className="px-5 py-1">
        {ROWS.map((row, i) => (
          <View key={row.key}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              title={row.title}
              subtitle={row.subtitle}
              right={
                <Toggle
                  value={prefs.notifications[row.key]}
                  onValueChange={(v) => setNotification(row.key, v)}
                />
              }
            />
          </View>
        ))}
      </Card>

      {banner ? (
        <Card className="mt-6 border-danger/30 bg-terracotta-50">
          <Text variant="caption" className="text-terracotta-600">
            {banner}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
