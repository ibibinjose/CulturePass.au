import { Linking, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Screen,
  Text,
  Button,
  BackButton,
  Card,
  Avatar,
  Badge,
  Chip,
  Divider,
  ListRow,
  ShareButton,
  Icon,
} from "@/components/ui";
import { colors } from "@/lib/theme";
import {
  useMyProfile,
  useProfile,
  useProfileFollowStatus,
  useToggleProfileFollow,
  useProfileSubscriptionStatus,
  useToggleProfileSubscription,
} from "@/features/profiles/api";
import { PROFESSIONAL_CATEGORY_LABELS, type ProfessionalCategory } from "@/lib/constants";
import { parsePreferences } from "@/lib/validation/profile";
import { resolveLinks } from "@/lib/social";

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: profile, isLoading } = useProfile(id);
  const { data: me } = useMyProfile();

  const { data: followStatus } = useProfileFollowStatus(profile?.id ?? "");
  const { data: subStatus } = useProfileSubscriptionStatus(profile?.id ?? "");
  const toggleFollow = useToggleProfileFollow();
  const toggleSub = useToggleProfileSubscription();

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
      <Screen maxWidth="form" contentClassName="pt-6">
        <BackButton />
        <Text variant="title" className="mt-6">
          Profile unavailable
        </Text>
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
  const hubs = profile.hubs ?? [];
  const primaryHub = hubs[0];

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton className="mb-2" />

      {/* Identity card */}
      <View className="items-center gap-4 rounded-3xl border border-linen bg-card p-7">
        <Pressable
          onPress={() => {
            if (isMe) {
              router.push("/profile/edit");
            } else if (profile.avatar_url) {
              Linking.openURL(profile.avatar_url).catch(() => {});
            }
          }}
          className="active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel={isMe ? "Edit profile picture" : "View profile picture"}
        >
          <Avatar
            name={profile.full_name}
            uri={profile.avatar_url}
            size={100}
            ring
            hubLogoUri={primaryHub?.images?.find((img: any) => img?.type === "logo")?.url}
          />
        </Pressable>
        <View className="items-center gap-2">
          <View className="flex-row items-center justify-center gap-2">
            <Text variant="title" className="text-center">
              {profile.full_name || "Member"}
            </Text>
            {primaryHub ? (
              <Pressable
                onPress={() => router.push(`/hub/${primaryHub.slug}`)}
                className="h-6 w-6 overflow-hidden rounded bg-sand border border-linen/30 active:opacity-80 justify-center items-center"
                accessibilityRole="link"
                accessibilityLabel={`View affiliated hub ${primaryHub.name}`}
              >
                <Image
                  source={{ uri: primaryHub.images?.find((img: any) => img?.type === "logo")?.url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </Pressable>
            ) : null}
          </View>
          {profile.is_public_professional && profile.professional_title ? (
            <Text variant="body" tone="muted" className="text-center">
              {profile.professional_title}
            </Text>
          ) : null}
          {showLocation || (profile.is_public_professional && profile.professional_category) ? (
            <View className="flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1">
              {profile.is_public_professional && profile.professional_category ? (
                <Badge
                  variant="ochre"
                  label={PROFESSIONAL_CATEGORY_LABELS[profile.professional_category as ProfessionalCategory]}
                />
              ) : null}
              {showLocation ? (
                <View className="flex-row items-center gap-1.5">
                  <Icon name="map-pin" size={14} color={colors.inkFaint} />
                  <Text variant="caption" tone="faint">
                    {profile.location}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Stats Row */}
        <View className="flex-row items-center justify-center gap-6 py-1">
          <View className="items-center">
            <Text variant="subheading" className="font-display text-lg text-ink">
              {followStatus?.count ?? 0}
            </Text>
            <Text variant="overline" tone="faint" className="text-[10px]">
              Followers
            </Text>
          </View>
          <View className="h-6 w-px bg-linen" />
          <View className="items-center">
            <Text variant="subheading" className="font-display text-lg text-ink">
              {subStatus?.count ?? 0}
            </Text>
            <Text variant="overline" tone="faint" className="text-[10px]">
              Subscribers
            </Text>
          </View>
        </View>

        {isMe ? (
          <View className="flex-row gap-3">
            <Button label="Edit profile" variant="outline" size="sm" onPress={() => router.push("/profile/edit")} />
            <Button label="Settings" variant="ghost" size="sm" onPress={() => router.push("/settings")} />
          </View>
        ) : (
          <View className="flex-row gap-3">
            <Button
              label={followStatus?.followed ? "Following" : "Follow"}
              variant={followStatus?.followed ? "outline" : "primary"}
              size="sm"
              leftIcon={
                <Icon
                  name={followStatus?.followed ? "check" : "plus"}
                  size={15}
                  color={colors.ink}
                />
              }
              loading={toggleFollow.isPending}
              onPress={() => {
                if (!me) {
                  router.push("/sign-in");
                  return;
                }
                toggleFollow.mutate({
                  profileId: profile.id,
                  followed: !!followStatus?.followed,
                });
              }}
            />
            <Button
              label={subStatus?.subscribed ? "Subscribed" : "Subscribe"}
              variant={subStatus?.subscribed ? "outline" : "whatsapp"}
              size="sm"
              leftIcon={
                <Icon
                  name={subStatus?.subscribed ? "check" : "bell"}
                  size={15}
                  color={colors.ink}
                />
              }
              loading={toggleSub.isPending}
              onPress={() => {
                if (!me) {
                  router.push("/sign-in");
                  return;
                }
                toggleSub.mutate({
                  profileId: profile.id,
                  subscribed: !!subStatus?.subscribed,
                });
              }}
            />
          </View>
        )}

        <View className="flex-row flex-wrap justify-center gap-3">
          <ShareButton
            path={`/profile/${profile.id}`}
            title={profile.full_name || "Profile"}
            message={profile.professional_title ?? undefined}
          />
          {profile.is_public_professional ? (
            <>
              <Button label="Link in bio" variant="outline" size="sm" onPress={() => router.push(`/l/profile/${profile.id}`)} />
              <Button label="Business card" variant="outline" size="sm" onPress={() => router.push(`/card/profile/${profile.id}`)} />
            </>
          ) : null}
        </View>
      </View>

      {profile.public_bio || profile.bio ? (
        <View className="mt-8 gap-2">
          <Text variant="overline" tone="pink">
            About
          </Text>
          <Text variant="bodyLarge" className="leading-7">
            {profile.is_public_professional ? profile.public_bio || profile.bio : profile.bio}
          </Text>
        </View>
      ) : null}

      {showInterests ? (
        <View className="mt-8 gap-3">
          <Text variant="overline" tone="pink">
            Interests
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <Chip key={interest} label={interest} />
            ))}
          </View>
        </View>
      ) : null}

      {linkEntries.length > 0 ? (
        <View className="mt-8 gap-3">
          <Text variant="overline" tone="pink">
            Links
          </Text>
          <Card padded={false} className="px-5">
            {linkEntries.map((link, i) => (
              <View key={link.key}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={link.label}
                  value={link.value}
                  onPress={() => Linking.openURL(link.href)}
                  left={
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-sand">
                      <Icon name="link" size={16} color={colors.inkMuted} />
                    </View>
                  }
                />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
