import { useState } from "react";
import { useRouter } from "expo-router";

import { Screen, Text, BackButton, Card, ListRow, Toggle, Divider } from "@/components/ui";
import { RequireAuth } from "@/features/auth/RequireAuth";
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
  if (isLoading || !profile) {
    return (
      <Screen maxWidth="form" contentClassName="pt-section">
        <Text variant="caption" tone="faint">
          Loading…
        </Text>
      </Screen>
    );
  }
  return <Privacy key={profile.id} profile={profile} />;
}

function Privacy({ profile }: { profile: Profile }) {
  const router = useRouter();
  const update = useUpdateMyProfile();
  const [prefs, setPrefs] = useState<ProfilePreferences>(() => parsePreferences(profile.preferences));
  const [isPublic, setIsPublic] = useState(profile.is_public_professional);
  const [banner, setBanner] = useState<string | null>(null);

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

      <Text variant="overline" tone="pink">
        Privacy
      </Text>
      <Text variant="title" className="mt-2">
        Privacy
      </Text>
      <Text variant="lead" className="mt-3">
        Control what you share and how people can find you.
      </Text>

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
