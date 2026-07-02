import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, BackButton, Card, ListRow, Toggle, Divider, Avatar, Icon } from "@/components/ui";
import { colors } from "@/lib/theme";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/AuthProvider";
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
  const { user } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <Screen maxWidth="form" contentClassName="pt-6">
        <BackButton fallbackHref="/settings" className="mb-5" />
        <Text variant="overline" tone="pink">Notifications</Text>
        <Text variant="title" className="mt-2">Notifications</Text>
        <Card className="mt-8 h-16" />
        <Card className="mt-6 h-32" />
        <Card className="mt-6 h-40" />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen maxWidth="form" contentClassName="pt-6">
        <BackButton fallbackHref="/settings" className="mb-5" />
        <Text variant="overline" tone="pink">Notifications</Text>
        <Text variant="title" className="mt-2">Notifications</Text>
        <Card className="mt-8">
          <Text variant="subheading">Complete your profile</Text>
          <Text variant="caption" tone="faint" className="mt-1">
            Finish your profile to receive personalized notifications.
          </Text>
          <View className="mt-4">
            <ListRow
              title="Edit profile"
              subtitle="Name, bio, interests and more"
              onPress={() => router.push("/profile/edit")}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  return <Notifications key={profile.id} profile={profile} userEmail={user?.email} />;
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

function Notifications({ profile, userEmail }: { profile: Profile; userEmail?: string }) {
  const router = useRouter();
  const update = useUpdateMyProfile();
  const [prefs, setPrefs] = useState<ProfilePreferences>(() => parsePreferences(profile.preferences));
  const [banner, setBanner] = useState<string | null>(null);

  const onboardingComplete = !!parsePreferences(profile.preferences).onboarding?.completed;

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

      <Text variant="overline" tone="pink">Notifications</Text>
      <Text variant="title" className="mt-2">Notifications</Text>
      <Text variant="lead" className="mt-3">
        Choose which emails you’d like to receive.
      </Text>

      {/* Mini profile header + complete profile nudge (full rebuild) */}
      <Card className="mt-6" onPress={() => router.push(`/profile/${profile.id}`)}>
        <View className="flex-row items-center gap-3">
          <Avatar name={profile.full_name} uri={profile.avatar_url} size={40} />
          <View className="flex-1">
            <Text variant="subheading">Your profile</Text>
            <Text variant="caption" tone="faint" numberOfLines={1}>
              {userEmail || profile.full_name}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.inkFaint} />
        </View>
      </Card>

      {(!profile.full_name || !onboardingComplete) && (
        <Card className="mt-4 border-gold-200 bg-gold-50">
          <Text variant="label">Complete your profile &amp; onboarding</Text>
          <Text variant="caption" tone="muted" className="mt-1">
            Personalized notifications work best once your profile and interests are set.
          </Text>
          <View className="mt-3">
            <ListRow
              title="Edit profile"
              subtitle="Name, bio, interests and more"
              onPress={() => router.push("/profile/edit")}
            />
          </View>
          {!onboardingComplete && (
            <View className="mt-1">
              <ListRow
                title="Complete onboarding"
                subtitle="Pick interests to get relevant updates"
                onPress={() => router.push("/onboarding")}
              />
            </View>
          )}
        </Card>
      )}

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
