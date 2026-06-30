import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { Text, Icon, SectionHeader } from "@/components/ui";
import { AustralianFlag } from "@/components/ui/AustralianFlag";
import { colors } from "@/lib/theme";
import type { StateCode } from "@/lib/constants";

type FeatureCity = { name: string; state: StateCode; image: number };

/**
 * Curated metros for the "Explore Cities" rail (mirrors culturepass.app). Each
 * card opens its state page (`/state/[code]`) — the closest place-level page in
 * the data model, since events/hubs are filtered by state, not city.
 *
 * Photos are bundled under assets/cities (Wikimedia Commons skylines); see
 * assets/cities/CREDITS.md for per-image attribution and licensing.
 */
export const FEATURE_CITIES: FeatureCity[] = [
  { name: "Sydney", state: "NSW", image: require("@/assets/cities/sydney.jpg") },
  { name: "Melbourne", state: "VIC", image: require("@/assets/cities/melbourne.jpg") },
  { name: "Brisbane", state: "QLD", image: require("@/assets/cities/brisbane.jpg") },
  { name: "Perth", state: "WA", image: require("@/assets/cities/perth.jpg") },
  { name: "Adelaide", state: "SA", image: require("@/assets/cities/adelaide.jpg") },
  { name: "Gold Coast", state: "QLD", image: require("@/assets/cities/goldcoast.jpg") },
];

export function ExploreCities() {
  const router = useRouter();

  return (
    <View className="gap-4">
      <View className="flex-row items-end justify-between gap-3">
        <SectionHeader eyebrow="Explore Cities" title="Discover culture nationwide" />
        <Pressable
          onPress={() => router.push("/councils")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="See all locations"
          className="flex-row items-center gap-1 active:opacity-70"
        >
          <Text variant="overline" tone="pink" className="font-bold tracking-[1px]">
            See all
          </Text>
          <Icon name="arrow-right" size={13} color={colors.pink} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 pr-4"
        className="-mx-gutter px-gutter"
      >
        {FEATURE_CITIES.map((city) => (
          <Pressable
            key={city.name}
            onPress={() => router.push({ pathname: "/state/[code]", params: { code: city.state } })}
            accessibilityRole="button"
            accessibilityLabel={`Explore ${city.name}, Australia`}
            className="w-[170px] overflow-hidden rounded-2xl border border-linen bg-card shadow-subtle active:opacity-90"
          >
            {/* Photo — bg-ink keeps the overlaid text legible if the image fails to load */}
            <View className="relative h-[116px] w-full bg-ink">
              <Image
                source={city.image}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={180}
              />
              {/* Scrim for legibility: light overall + darker base band */}
              <View className="absolute inset-0 bg-ink/15" />
              <View className="absolute inset-x-0 bottom-0 h-3/5 bg-ink/55" />

              {/* National flag badge */}
              <View className="absolute right-2 top-2 overflow-hidden rounded border border-white/40">
                <AustralianFlag width={22} rounded={false} />
              </View>

              {/* Labels */}
              <View className="absolute inset-x-0 bottom-0 p-3">
                <Text tone="white" className="font-heading text-sm" numberOfLines={1}>
                  {city.name}
                </Text>
                <Text className="text-[11px] text-white/85">Australia</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
