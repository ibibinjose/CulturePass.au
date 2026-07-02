import React from "react";
import { Pressable, View } from "react-native";

import { Card, Text, Icon, MediaImage } from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";
import { colors } from "@/lib/theme";
import { getHubImage } from "@/lib/hubImages";
import { cn } from "@/lib/utils/cn";

interface CommunityCardProps {
  hub: any;
  onPress: () => void;
  className?: string;
}

export function CommunityCard({ hub, onPress, className }: CommunityCardProps) {
  const images = (hub.images ?? []).filter((i: any) => i && i.url);
  const logoUrl = getHubImage(images, "logo");
  const coverUrl =
    getHubImage(images, "cover") ??
    images.find((i: any) => i.type !== "logo")?.url ??
    images[0]?.url ??
    null;
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");
  const isVerified = hub.verification_status === "verified";
  const tags: string[] = (hub.tags ?? []).filter(Boolean).slice(0, 2);

  return (
    <Card padded={false} className={cn("overflow-hidden border border-linen bg-card rounded-2xl", className)}>
      <Pressable onPress={onPress} accessibilityRole="button" className="flex-1 justify-between active:opacity-95">
        <View>
          {/* Cover banner */}
          {coverUrl ? (
            <MediaImage uri={coverUrl} style={{ width: "100%", height: 120 }} contentFit="cover" transition={150} />
          ) : (
            <View className="h-[120px] bg-sand items-center justify-center">
              <Icon name="image" size={24} color={colors.inkFaint} />
            </View>
          )}

          {/* Logo crest + status badges */}
          <View className="px-5 -mt-7 flex-row items-end justify-between gap-3">
            {logoUrl ? (
              <MediaImage
                uri={logoUrl}
                style={{ width: 54, height: 54, borderRadius: 14, borderWidth: 3, borderColor: colors.card }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View
                style={{ width: 54, height: 54, borderRadius: 14, borderWidth: 3, borderColor: colors.card }}
                className="items-center justify-center bg-sand"
              >
                <Text className="font-display text-lg text-ink-muted font-bold">
                  {hub.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="flex-row items-center gap-1.5 pb-0.5">
              {isVerified ? (
                <View className="h-6 w-6 rounded-full bg-teal-50 items-center justify-center">
                  <Icon name="check-circle" size={15} color={colors.tealDeep} />
                </View>
              ) : null}
              {hub.indigenous_led ? <IndigenousLedBadge /> : null}
            </View>
          </View>

          {/* Details */}
          <View className="px-5 pt-3 gap-2">
            <View className="gap-1">
              <Text className="text-[10px] text-pink-600 font-heading uppercase tracking-wider">
                {HUB_TYPE_LABELS[hub.type as HubType]}
              </Text>
              <Text className="font-display text-lg text-ink font-bold tracking-tight" numberOfLines={1}>
                {hub.name}
              </Text>
            </View>
            {hub.short_description ? (
              <Text className="text-xs text-ink-muted leading-5" numberOfLines={2}>
                {hub.short_description}
              </Text>
            ) : (
              <Text className="text-xs text-ink-faint italic leading-5">No description provided yet.</Text>
            )}
            {tags.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5 pt-0.5">
                {tags.map((tag) => (
                  <View key={tag} className="rounded-full bg-sand px-2.5 py-1">
                    <Text className="text-[10px] font-heading text-ink-muted">{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Footer row */}
        <View className="mt-3 px-5 py-3.5 border-t border-linen flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
            <Icon name="map-pin" size={12} color={colors.inkFaint} />
            <Text className="text-[11px] text-ink-muted font-heading flex-1" numberOfLines={1}>
              {place || "Australia"}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-heading text-pink-600 font-semibold">Explore</Text>
            <Icon name="arrow-right" size={13} color={colors.pink} />
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <View className={cn("overflow-hidden rounded-2xl border border-linen bg-card", className)}>
      <View className="h-[120px] bg-sand" />
      <View className="px-5 -mt-7">
        <View className="h-[54px] w-[54px] rounded-[14px] border-[3px] border-card bg-linen" />
      </View>
      <View className="px-5 pt-3 pb-5 gap-2.5">
        <View className="h-2.5 w-20 rounded-full bg-sand" />
        <View className="h-4 w-2/3 rounded-full bg-linen" />
        <View className="h-2.5 w-full rounded-full bg-sand" />
        <View className="h-2.5 w-4/5 rounded-full bg-sand" />
      </View>
    </View>
  );
}
