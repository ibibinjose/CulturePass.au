import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, BackButton, Card, ListRow, Toggle, Divider, Avatar, Icon } from "@/components/ui";
import { colors } from "@/lib/theme";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile, useUpdateMyProfile, type Profile } from "@/features/profiles/api";
import { parsePreferences, type ProfilePreferences } from "@/lib/validation/profile";

export default function PrivacyScreen() {
  return (
    <RequireAuth>
      <PrivacyLoader />
    </RequireAuth>
  );
}

function PrivacyLoader() {
  const { data: profile, isLoading } = useMyProfile();
  const { user } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <Screen maxWidth="form" contentClassName="pt-6">
        <BackButton fallbackHref="/settings" className="mb-5" />
        <Text variant="overline" tone="pink">Privacy</Text>
        <Text variant="title" className="mt-2">Privacy</Text>
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
        <Text variant="overline" tone="pink">Privacy</Text>
        <Text variant="title" className="mt-2">Privacy</Text>

        <Card className="mt-8">
          <Text variant="subheading">Complete your profile first</Text>
          <Text variant="caption" tone="faint" className="mt-1">
            Finish setting up your profile to manage privacy and visibility.
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

  return <Privacy key={profile.id} profile={profile} userEmail={user?.email} />;
}

function Privacy({ profile, userEmail }: { profile: Profile; userEmail?: string }) {
  const router = useRouter();
  const update = useUpdateMyProfile();
  const [prefs, setPrefs] = useState<ProfilePreferences>(() => parsePreferences(profile.preferences));
  const [isPublic, setIsPublic] = useState(profile.is_public_professional);
  const [banner, setBanner] = useState<string | null>(null);

  const onboardingComplete = !!parsePreferences(profile.preferences).onboarding?.completed;

  function fail() {
    setBanner("Couldn’t save that change. Please try again.");
  }

  function setPrivacy(key: keyof ProfilePreferences["privacy"], value: boolean) {
    setBanner(null);
    const next = { ...prefs, privacy: { ...prefs.privacy, [key]: value } };
    setPrefs(next);
    update.mutate({ preferences: next }, { onError: fail });
  }

  function togglePublic(value: boolean) {
    setBanner(null);
    // Going public requires a professional category (enforced by a DB check),
    // so send them to the professional setup to choose one first.
    if (value && !profile.professional_category) {
      router.push("/create/professional");
      return;
    }
    setIsPublic(value);
    update.mutate({ is_public_professional: value }, { onError: fail });
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/settings" className="mb-5" />

      <Text variant="overline" tone="pink">Privacy</Text>
      <Text variant="title" className="mt-2">Privacy</Text>
      <Text variant="lead" className="mt-3">
        Control what you share and how people can find you.
      </Text>

      {/* Mini profile header (consistent with main settings) */}
      <Card className="mt-6" onPress={() => router.push(`/profile/${profile.id}`)}>
        <View className="flex-row items-center gap-3">
          <Avatar
            name={profile.full_name}
            uri={profile.avatar_url}
            size={40}
          />
          <View className="flex-1">
            <Text variant="subheading">Your profile</Text>
            <Text variant="caption" tone="faint" numberOfLines={1}>
              {userEmail || profile.full_name}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.inkFaint} />
        </View>
      </Card>

      {/* Recommend completing profile / onboarding */}
      {(!profile.full_name || !onboardingComplete) && (
        <Card className="mt-4 border-gold-200 bg-gold-50">
          <Text variant="label">Complete your profile</Text>
          <Text variant="caption" tone="muted" className="mt-1">
            Add your name, bio, interests and more for full privacy controls and discovery.
          </Text>
          <View className="mt-3 flex-row gap-2">
            <ListRow
              title="Edit profile"
              subtitle="Name, bio, interests and more"
              onPress={() => router.push("/profile/edit")}
            />
          </View>
          {!onboardingComplete && (
            <View className="mt-2">
              <ListRow
                title="Complete onboarding"
                subtitle="Pick interests for tailored experience"
                onPress={() => router.push("/onboarding")}
              />
            </View>
          )}
        </Card>
      )}

      <Text variant="overline" tone="faint" className="mb-1 mt-8">
        Public profile
      </Text>
      <Card className="px-5 py-1">
        <ListRow
          title="Public professional profile"
          subtitle={
            isPublic
              ? "Anyone can view your professional page."
              : "Make a public page for your work."
          }
          right={<Toggle value={isPublic} onValueChange={togglePublic} />}
        />
        {isPublic ? (
          <>
            <Divider />
            <ListRow
              title="Edit public profile"
              onPress={() => router.push("/create/professional")}
            />
          </>
        ) : null}
      </Card>

      <Text variant="overline" tone="faint" className="mb-1 mt-8">
        Discovery
      </Text>
      <Card className="px-5 py-1">
        <ListRow
          title="Discoverable"
          subtitle="Let your profile appear in search and suggestions"
          right={
            <Toggle
              value={prefs.privacy.discoverable}
              onValueChange={(v) => setPrivacy("discoverable", v)}
            />
          }
        />
        <Divider />
        <ListRow
          title="Show my location"
          subtitle="Display your location on your profile"
          right={
            <Toggle
              value={prefs.privacy.show_location}
              onValueChange={(v) => setPrivacy("show_location", v)}
            />
          }
        />
        <Divider />
        <ListRow
          title="Show my interests"
          subtitle="Display your interests on your profile"
          right={
            <Toggle
              value={prefs.privacy.show_interests}
              onValueChange={(v) => setPrivacy("show_interests", v)}
            />
          }
        />
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
