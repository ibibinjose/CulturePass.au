import { Linking, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Screen,
  Text,
  Button,
  Card,
  Avatar,
  Badge,
  Chip,
  Divider,
  ListRow,
  ShareButton,
} from "@/components/ui";
import { useMyProfile, useProfile } from "@/features/profiles/api";
import { PROFESSIONAL_CATEGORY_LABELS, type ProfessionalCategory } from "@/lib/constants";
import { parsePreferences } from "@/lib/validation/profile";
import { resolveLinks } from "@/lib/social";

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: profile, isLoading } = useProfile(id);
  const { data: me } = useMyProfile();

  const isMe = !!profile && !!me && profile.id === me.id;

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
        <Button
          label="← Back"
          variant="ghost"
          size="sm"
          className="mb-6 self-start"
          onPress={() => router.back()}
        />
        <Text variant="title">Profile unavailable</Text>
        <Text variant="body" tone="muted" className="mt-3">
          This profile is private or doesn’t exist.
        </Text>
      </Screen>
    );
  }

  const prefs = parsePreferences(profile.preferences);
  const links = (profile.public_links ?? {}) as Record<string, string>;
  const linkEntries = resolveLinks(links);
  const showLocation = prefs.privacy.show_location && profile.location;
  const showInterests = prefs.privacy.show_interests && profile.interests.length > 0;

  return (
    <Screen maxWidth="form" contentClassName="pt-10">
      <Button
        label="← Back"
        variant="ghost"
        size="sm"
        className="mb-6 self-start"
        onPress={() => router.back()}
      />

      <View className="items-center gap-4">
        <Avatar name={profile.full_name} uri={profile.avatar_url} size={96} />
        <View className="items-center gap-2">
          <Text variant="title" className="text-center">
            {profile.full_name || "Member"}
          </Text>
          {profile.is_public_professional && profile.professional_title ? (
            <Text variant="body" tone="muted" className="text-center">
              {profile.professional_title}
            </Text>
          ) : null}
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
            <Text variant="caption" tone="faint">
              {profile.location}
            </Text>
          ) : null}
        </View>

        {isMe ? (
          <View className="flex-row gap-3">
            <Button
              label="Edit profile"
              variant="outline"
              size="sm"
              onPress={() => router.push("/profile/edit")}
            />
            <Button
              label="Settings"
              variant="ghost"
              size="sm"
              onPress={() => router.push("/settings")}
            />
          </View>
        ) : null}

        <View className="flex-row flex-wrap justify-center gap-3">
          <ShareButton
            path={`/profile/${profile.id}`}
            title={profile.full_name || "Profile"}
            message={profile.professional_title ?? undefined}
          />
          {profile.is_public_professional ? (
            <>
              <Button
                label="Link in bio"
                variant="outline"
                size="sm"
                onPress={() => router.push(`/l/profile/${profile.id}`)}
              />
              <Button
                label="Business card"
                variant="outline"
                size="sm"
                onPress={() => router.push(`/card/profile/${profile.id}`)}
              />
            </>
          ) : null}
        </View>
      </View>

      {profile.public_bio || profile.bio ? (
        <View className="mt-8">
          <Text variant="overline" tone="faint">
            About
          </Text>
          <Text variant="body" className="mt-2">
            {profile.is_public_professional ? profile.public_bio || profile.bio : profile.bio}
          </Text>
        </View>
      ) : null}

      {showInterests ? (
        <View className="mt-8">
          <Text variant="overline" tone="faint">
            Interests
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <Chip key={interest} label={interest} />
            ))}
          </View>
        </View>
      ) : null}

      {linkEntries.length > 0 ? (
        <View className="mt-8">
          <Text variant="overline" tone="faint">
            Links
          </Text>
          <Card className="mt-3 px-5 py-1">
            {linkEntries.map((link, i) => (
              <View key={link.key}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={link.label}
                  value={link.value}
                  onPress={() => Linking.openURL(link.href)}
                />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
