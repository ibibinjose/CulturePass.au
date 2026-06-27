import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen, Text, Button, Avatar, Badge, LinkButtons, ShareBar, Icon } from "@/components/ui";
import { useProfile } from "@/features/profiles/api";
import { colors } from "@/lib/theme";
import { resolveLinks } from "@/lib/social";
import { parsePreferences } from "@/lib/validation/profile";
import { PROFESSIONAL_CATEGORY_LABELS, type ProfessionalCategory } from "@/lib/constants";

/** Link-in-bio (linktree-style) page for a member's public profile. */
export default function ProfileLinkInBio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: profile, isLoading } = useProfile(id);

  if (isLoading) {
    return (
      <Screen maxWidth="form" contentClassName="pt-section">
        <Text variant="caption" tone="faint">
          Loading…
        </Text>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen maxWidth="form" contentClassName="pt-section">
        <Text variant="title">Not available</Text>
        <Text variant="body" tone="muted" className="mt-3">
          This profile is private or doesn’t exist.
        </Text>
      </Screen>
    );
  }

  const prefs = parsePreferences(profile.preferences);
  const links = resolveLinks((profile.public_links ?? {}) as Record<string, string>);
  const bio = profile.is_public_professional
    ? profile.public_bio || profile.bio
    : profile.bio;

  return (
    <Screen maxWidth="form" contentClassName="pt-section">
      <View className="items-center gap-4">
        <Avatar
          name={profile.full_name}
          uri={profile.avatar_url}
          size={108}
          ring
          hubLogoUri={profile.hubs?.[0]?.images?.find((img: any) => img?.type === "logo")?.url}
        />
        <View className="items-center gap-2">
          <Text variant="title" className="text-center">
            {profile.full_name || "Member"}
          </Text>
          {profile.is_public_professional && profile.professional_title ? (
            <Text variant="body" tone="muted" className="text-center">
              {profile.professional_title}
            </Text>
          ) : null}
          {(() => {
            const showLocation = prefs.privacy.show_location && profile.location;
            if (!showLocation && !(profile.is_public_professional && profile.professional_category)) return null;
            return (
              <View className="flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1">
                {profile.is_public_professional && profile.professional_category ? (
                  <Badge
                    variant="ochre"
                    label={
                      PROFESSIONAL_CATEGORY_LABELS[
                        profile.professional_category as ProfessionalCategory
                      ]
                    }
                  />
                ) : null}
                {showLocation ? (
                  <View className="flex-row items-center gap-1.5">
                    <Icon name="map-pin" size={13} color={colors.inkFaint} />
                    <Text variant="caption" tone="faint">
                      {profile.location}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })()}
        </View>
      </View>

      {bio ? (
        <Text variant="body" className="mt-6 text-center leading-7">
          {bio}
        </Text>
      ) : null}

      {/* Link buttons */}
      <LinkButtons
        className="mt-8"
        items={links.map((l) => ({ label: l.label, href: l.href }))}
      />

      <Button
        label="View full profile"
        variant="outline"
        className="mt-3"
        onPress={() => router.push(`/profile/${profile.id}`)}
      />

      <ShareBar
        className="mt-8"
        path={`/l/profile/${profile.id}`}
        title={profile.full_name || "Profile"}
        message={profile.professional_title ?? undefined}
      />

      <Text variant="overline" tone="faint" className="mt-10 text-center">
        Powered by CulturePass Australia
      </Text>
    </Screen>
  );
}
