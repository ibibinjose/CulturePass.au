import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, Button, Card, Avatar, ListRow, Divider } from "@/components/ui";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSignOut } from "@/features/auth/api";
import { useMyProfile } from "@/features/profiles/api";

export default function SettingsScreen() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}

function Settings() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const signOut = useSignOut();
  const [banner, setBanner] = useState<string | null>(null);

  async function handleSignOut() {
    setBanner(null);
    try {
      await signOut.mutateAsync();
      router.replace("/");
    } catch {
      setBanner("Couldn’t sign out. Please try again.");
    }
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-10">
      <Button
        label="← Back"
        variant="ghost"
        size="sm"
        className="mb-6 self-start"
        onPress={() => router.back()}
      />

      <Text variant="overline" tone="ochre">
        Account
      </Text>
      <Text variant="title" className="mt-2">
        Settings
      </Text>

      {/* Identity card */}
      <Card
        className="mt-8"
        onPress={() => profile && router.push(`/profile/${profile.id}`)}
      >
        <View className="flex-row items-center gap-4">
          <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={56} />
          <View className="flex-1">
            <Text variant="subheading">{profile?.full_name || "Your profile"}</Text>
            <Text variant="caption" tone="faint" numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
          <Text className="font-sans text-lg text-ink-faint">›</Text>
        </View>
      </Card>

      {/* Profile */}
      <Text variant="overline" tone="faint" className="mb-1 mt-8">
        Profile
      </Text>
      <Card className="px-5 py-1">
        <ListRow
          title="Edit profile"
          subtitle="Name, bio, interests and more"
          onPress={() => router.push("/profile/edit")}
        />
        <Divider />
        <ListRow
          title="Public professional profile"
          subtitle="Set up or manage your public page"
          onPress={() => router.push("/create/professional")}
        />
      </Card>

      {/* Preferences */}
      <Text variant="overline" tone="faint" className="mb-1 mt-8">
        Preferences
      </Text>
      <Card className="px-5 py-1">
        <ListRow title="Account" subtitle="Email, password" onPress={() => router.push("/settings/account")} />
        <Divider />
        <ListRow title="Privacy" subtitle="Visibility and discovery" onPress={() => router.push("/settings/privacy")} />
        <Divider />
        <ListRow
          title="Notifications"
          subtitle="Email updates and reminders"
          onPress={() => router.push("/settings/notifications")}
        />
        <Divider />
        <ListRow title="About" subtitle="Acknowledgement, legal, version" onPress={() => router.push("/settings/about")} />
      </Card>

      {banner ? (
        <Card className="mt-6 border-danger/30 bg-terracotta-50">
          <Text variant="caption" className="text-terracotta-600">
            {banner}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Sign out"
        variant="outline"
        className="mt-8"
        loading={signOut.isPending}
        onPress={handleSignOut}
      />
    </Screen>
  );
}
