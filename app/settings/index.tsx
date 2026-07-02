import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, Button, BackButton, Card, Avatar, ListRow, Divider, Icon, type IconName } from "@/components/ui";
import { colors } from "@/lib/theme";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSignOut } from "@/features/auth/api";
import { useMyProfile } from "@/features/profiles/api";
import { parsePreferences } from "@/lib/validation/profile";

export default function SettingsScreen() {
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return (
      <Screen maxWidth="form" contentClassName="pt-6">
        <BackButton className="mb-5" />
        <Text variant="overline" tone="pink">Account</Text>
        <Text variant="title" className="mt-2">Settings</Text>
        <Card className="mt-8 h-20" />
        <Card className="mt-6 h-32" />
        <Card className="mt-6 h-40" />
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return <UnauthenticatedSettings />;
  }

  return <AuthenticatedSettings />;
}

function UnauthenticatedSettings() {
  const router = useRouter();
  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton className="mb-5" />

      <Text variant="overline" tone="pink">Account</Text>
      <Text variant="title" className="mt-2">Settings</Text>

      <Card className="mt-8">
        <Text variant="subheading">Your profile</Text>
        <Text variant="caption" tone="faint" className="mt-1">Sign in to view and manage your profile and settings.</Text>
      </Card>

      <Text variant="overline" tone="pink" className="mb-2 mt-8">Get started</Text>
      <Card padded={false} className="px-5">
        <ListRow
          title="Sign in"
          subtitle="Access your profile, hubs and preferences"
          onPress={() => router.push("/sign-in")}
          left={<View className="h-9 w-9 items-center justify-center rounded-xl bg-sand"><Icon name="user" size={17} color={colors.inkMuted} /></View>}
        />
        <Divider />
        <ListRow
          title="Create account"
          subtitle="Join to discover and create cultural experiences"
          onPress={() => router.push("/sign-up")}
          left={<View className="h-9 w-9 items-center justify-center rounded-xl bg-sand"><Icon name="plus" size={17} color={colors.inkMuted} /></View>}
        />
      </Card>

      <Text variant="overline" tone="pink" className="mb-2 mt-8">More</Text>
      <Card padded={false} className="px-5">
        <ListRow title="About CulturePass" subtitle="Acknowledgement, legal & version" onPress={() => router.push("/settings/about")} />
      </Card>
    </Screen>
  );
}

function AuthenticatedSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const signOut = useSignOut();
  const [banner, setBanner] = useState<string | null>(null);

  const prefs = profile ? parsePreferences(profile.preferences) : null;
  const onboardingComplete = !!prefs?.onboarding?.completed;

  async function handleSignOut() {
    setBanner(null);
    try {
      await signOut.mutateAsync();
      router.replace("/");
    } catch {
      setBanner("Couldn’t sign out. Please try again.");
    }
  }

  if (profileLoading) {
    return (
      <Screen maxWidth="form" contentClassName="pt-6">
        <BackButton className="mb-5" />
        <Text variant="overline" tone="pink">Account</Text>
        <Text variant="title" className="mt-2">Settings</Text>
        <Card className="mt-8 h-20" />
        <Card className="mt-6 h-32" />
        <Card className="mt-6 h-40" />
      </Screen>
    );
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

      {/* Identity / Your profile header */}
      <Card
        className="mt-8"
        onPress={() => profile && router.push(`/profile/${profile.id}`)}
      >
        <View className="flex-row items-center gap-4">
          <Avatar
            name={profile?.full_name}
            uri={profile?.avatar_url}
            size={56}
            hubLogoUri={profile?.hubs?.[0]?.images?.find((img: any) => img?.type === "logo")?.url}
          />
          <View className="flex-1">
            <Text variant="subheading">Your profile</Text>
            {profile?.username ? (
              <Text variant="caption" tone="pink">@{profile.username}</Text>
            ) : null}
            <Text variant="caption" tone="faint" numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.inkFaint} />
        </View>
      </Card>

      {/* Onboarding prompt (visible if reached settings before completing) */}
      {!onboardingComplete && (
        <Card className="mt-4 border-gold-200 bg-gold-50">
          <View className="flex-row items-start gap-3">
            <Icon name="star" size={18} color={colors.goldDeep} />
            <View className="flex-1">
              <Text variant="label">Finish setting up</Text>
              <Text variant="caption" tone="muted" className="mt-0.5">
                Pick your interests and local area for tailored recommendations.
              </Text>
              <Button
                label="Complete onboarding"
                variant="outline"
                className="mt-3 self-start border-gold-300"
                onPress={() => router.push("/onboarding")}
              />
            </View>
          </View>
        </Card>
      )}

      {/* Profile section — rebuilt to match the requested structure */}
      <Text variant="overline" tone="pink" className="mb-2 mt-8">
        Profile
      </Text>
      <Card padded={false} className="px-5">
        <SettingsRow
          icon="user"
          title="Edit profile"
          subtitle="Name, bio, interests and more"
          onPress={() => router.push("/profile/edit")}
        />
        <Divider />
        <SettingsRow
          icon="sparkle"
          title="Public professional profile"
          subtitle="Set up or manage your public page"
          onPress={() => router.push("/create/professional")}
        />
      </Card>

      {/* Profile not ready yet (post sign-up race or early state) */}
      {profile && !profile.full_name && (
        <Card className="mt-4">
          <Text variant="caption" tone="muted">
            Your basic profile was created on sign-up. Add your name, bio and interests to personalize it.
          </Text>
          <Button
            label="Edit profile now"
            variant="outline"
            className="mt-3"
            onPress={() => router.push("/profile/edit")}
          />
        </Card>
      )}

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
