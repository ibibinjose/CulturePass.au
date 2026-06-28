import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, Button, BackButton, Card, Avatar, ListRow, Divider, Icon, type IconName } from "@/components/ui";
import { colors } from "@/lib/theme";
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
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton className="mb-5" />

      <Text variant="overline" tone="pink">
        Account
      </Text>
      <Text variant="title" className="mt-2">
        Settings
      </Text>

      {/* Identity card */}
      <Card className="mt-8" onPress={() => profile && router.push(`/profile/${profile.id}`)}>
        <View className="flex-row items-center gap-4">
          <Avatar
            name={profile?.full_name}
            uri={profile?.avatar_url}
            size={56}
            hubLogoUri={profile?.hubs?.[0]?.images?.find((img: any) => img?.type === "logo")?.url}
          />
          <View className="flex-1">
            <Text variant="subheading">{profile?.full_name || "Your profile"}</Text>
            <Text variant="caption" tone="faint" numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.inkFaint} />
        </View>
      </Card>

      {/* Profile */}
      <Text variant="overline" tone="pink" className="mb-2 mt-8">
        Profile
      </Text>
      <Card padded={false} className="px-5">
        <SettingsRow icon="user" title="Edit profile" subtitle="Name, bio, interests and more" onPress={() => router.push("/profile/edit")} />
        <Divider />
        <SettingsRow icon="sparkle" title="Public professional profile" subtitle="Set up or manage your public page" onPress={() => router.push("/create/professional")} />
      </Card>

      {/* Preferences */}
      <Text variant="overline" tone="pink" className="mb-2 mt-8">
        Preferences
      </Text>
      <Card padded={false} className="px-5">
        <SettingsRow icon="lock" title="Account" subtitle="Email, password" onPress={() => router.push("/settings/account")} />
        <Divider />
        <SettingsRow icon="eye" title="Privacy" subtitle="Visibility and discovery" onPress={() => router.push("/settings/privacy")} />
        <Divider />
        <SettingsRow icon="bell" title="Notifications" subtitle="Email updates and reminders" onPress={() => router.push("/settings/notifications")} />
        <Divider />
        <SettingsRow icon="info" title="About" subtitle="Acknowledgement, legal, version" onPress={() => router.push("/settings/about")} />
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
        leftIcon={<Icon name="logout" size={17} color={colors.ink} />}
        onPress={handleSignOut}
      />
    </Screen>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      left={
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-sand">
          <Icon name={icon} size={17} color={colors.inkMuted} />
        </View>
      }
    />
  );
}
