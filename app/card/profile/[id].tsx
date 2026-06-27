import { Linking, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Screen,
  Text,
  Button,
  Card,
  Avatar,
  Badge,
  ShareBar,
  Icon,
  Pinwheel,
} from "@/components/ui";
import { useProfile } from "@/features/profiles/api";
import { colors } from "@/lib/theme";
import { resolveLinks } from "@/lib/social";
import { saveContact } from "@/lib/vcard";
import { parsePreferences } from "@/lib/validation/profile";
import { PROFESSIONAL_CATEGORY_LABELS, type ProfessionalCategory } from "@/lib/constants";

/** Shareable digital business card for a profile, with "Save contact" (vCard). */
export default function ProfileBusinessCard() {
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
        <Text variant="title">Card unavailable</Text>
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

  function handleSaveContact() {
    if (!profile) return;
    void saveContact({
      name: profile.full_name || "Member",
      title: profile.professional_title,
      urls: links.map((l) => l.href),
      address: prefs.privacy.show_location ? profile.location : null,
      note: bio,
    });
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-section">
      <Card elevated className="items-center gap-4 p-7">
        <Avatar
          name={profile.full_name}
          uri={profile.avatar_url}
          size={100}
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

        {links.length > 0 ? (
          <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1">
            {links.map((l) => (
              <Pressable key={l.key} onPress={() => Linking.openURL(l.href)} hitSlop={6}>
                <Text variant="label" tone="pink">
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Button
          label="Save contact"
          variant="primary"
          className="mt-2 self-stretch"
          onPress={handleSaveContact}
        />
      </Card>

      <ShareBar
        className="mt-6"
        path={`/card/profile/${profile.id}`}
        title={profile.full_name || "Profile"}
        message={profile.professional_title ?? undefined}
      />

      <Button
        label="View full profile"
        variant="ghost"
        className="mt-3"
        onPress={() => router.push(`/profile/${profile.id}`)}
      />

      <View className="mt-10 items-center gap-2">
        <Pinwheel size={22} />
        <Text variant="overline" tone="faint" className="text-center">
          Powered by CulturePass Australia
        </Text>
      </View>
    </Screen>
  );
}
