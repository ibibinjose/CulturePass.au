import { useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { Screen, Text, Input, Button, Card, Badge, Divider, Icon, Footer } from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { useHubs } from "@/features/hubs/api";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";
import { colors } from "@/lib/theme";
import { getHubImage } from "@/lib/hubImages";
import { cn } from "@/lib/utils/cn";

const STATES = [
  { label: "All Australia", value: "" },
  { label: "NSW", value: "NSW" },
  { label: "VIC", value: "VIC" },
  { label: "QLD", value: "QLD" },
  { label: "SA", value: "SA" },
  { label: "WA", value: "WA" },
  { label: "TAS", value: "TAS" },
  { label: "ACT", value: "ACT" },
  { label: "NT", value: "NT" },
];

const CATEGORIES = [
  { label: "All Types", value: "" },
  { label: "Venues & Spaces", value: "venue_space" },
  { label: "Wellness", value: "wellness" },
  { label: "Businesses", value: "business_shop_workshop" },
  { label: "Community Groups", value: "community_cultural_group" },
  { label: "Clubs & Societies", value: "club_society" },
  { label: "NGOs & Charities", value: "organisation_association_ngo_charity" },
  { label: "Government", value: "council_government" },
];

export default function CommunitiesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [onlyIndigenousLed, setOnlyIndigenousLed] = useState(false);

  const { data: hubs, isLoading, isError } = useHubs({
    state: selectedState || undefined,
    type: (selectedType as any) || undefined,
    indigenousLed: onlyIndigenousLed || undefined,
    search: searchQuery.trim() || undefined,
  });

  const count = hubs?.length ?? 0;
  const cols = width >= 768 ? 2 : 1;

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      {/* Header */}
      <View className="mb-6 flex-col gap-1 border-b border-linen pb-5">
        <Text variant="overline" tone="pink">
          Directory
        </Text>
        <Text className="font-display text-3xl md:text-4xl text-ink tracking-tight font-bold">
          Communities
        </Text>
        <Text className="font-sans text-xs text-ink-faint mt-1 leading-5 max-w-xl">
          Explore local creative networks, galleries, artisan workshops, wellness spaces, and community hubs across the continent.
        </Text>
      </View>

      {/* Filter Section */}
      <View className="gap-4 mb-6">
        {/* Search */}
        <Input
          placeholder="Search communities by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Icon name="search" size={15} color={colors.inkMuted} />}
          clearButtonMode="while-editing"
        />

        {/* State Pill Filter */}
        <View className="gap-2">
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
            State Jurisdiction
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {STATES.map((st) => {
              const active = selectedState === st.value;
              return (
                <Pressable
                  key={st.label}
                  onPress={() => setSelectedState(st.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border border-linen active:opacity-80",
                    active ? "bg-pink border-pink-600" : "bg-card"
                  )}
                >
                  <Text className={cn("text-2xs font-heading", active ? "text-white font-semibold" : "text-ink-muted")}>
                    {st.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Category & Indigenous Toggle Row */}
        <View className="flex-row flex-wrap items-center justify-between gap-4 pt-1">
          {/* Type dropdown style selector */}
          <View className="flex-1 min-w-[200px] gap-2">
            <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
              Community Type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {CATEGORIES.map((cat) => {
                const active = selectedType === cat.value;
                return (
                  <Pressable
                    key={cat.label}
                    onPress={() => setSelectedType(cat.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border border-linen active:opacity-85",
                      active ? "bg-ochre-500 border-ochre-600" : "bg-card"
                    )}
                  >
                    <Text className={cn("text-2xs font-heading", active ? "text-white font-semibold" : "text-ink-muted")}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* First Nations Toggle */}
          <Pressable
            onPress={() => setOnlyIndigenousLed(!onlyIndigenousLed)}
            className={cn(
              "flex-row items-center gap-2 px-3 py-2 rounded-xl border active:opacity-80 self-end",
              onlyIndigenousLed ? "bg-country-ochre/10 border-country-ochre" : "bg-card border-linen"
            )}
          >
            <View className="h-3 w-3 rounded-full bg-country-ochre items-center justify-center">
              <View className="h-1.5 w-1.5 rounded-full bg-country-red" />
            </View>
            <Text className={cn("text-2xs font-heading", onlyIndigenousLed ? "text-country-red font-semibold" : "text-ink-muted")}>
              Indigenous Led
            </Text>
          </Pressable>
        </View>
      </View>

      <Divider className="opacity-45 mb-6" />

      {/* Grid Content */}
      <View className="flex-row flex-wrap gap-4">
        {isLoading ? (
          <View className="w-full p-16 items-center justify-center">
            <ActivityIndicator size="large" color={colors.pink} />
            <Text variant="caption" tone="faint" className="mt-4">
              Searching directory...
            </Text>
          </View>
        ) : isError ? (
          <Card className="w-full p-6 border border-danger/25 bg-terracotta-50/50">
            <Text variant="caption" tone="muted">
              Couldn’t load community directory. Please try again.
            </Text>
          </Card>
        ) : count > 0 ? (
          hubs?.map((hub) => (
            <CommunityCard
              key={hub.id}
              hub={hub}
              cols={cols}
              onPress={() => router.push(`/hub/${hub.slug}`)}
            />
          ))
        ) : (
          <Card className="w-full p-10 items-center gap-3 border border-dashed border-linen bg-sand/15">
            <Icon name="users" size={32} color={colors.inkFaint} />
            <Text variant="subheading" className="font-display tracking-tight text-center">No communities found</Text>
            <Text variant="caption" tone="muted" className="text-center max-w-sm">
              We couldn’t find any communities matching your search filters. Try clearing your filters or look in another state.
            </Text>
            <Button
              label="Reset Filters"
              variant="secondary"
              size="sm"
              className="mt-2"
              onPress={() => {
                setSearchQuery("");
                setSelectedState("");
                setSelectedType("");
                setOnlyIndigenousLed(false);
              }}
            />
          </Card>
        )}
      </View>

      <Footer className="mt-12 border-t border-linen pt-8" />
    </Screen>
  );
}

function CommunityCard({
  hub,
  cols,
  onPress,
}: {
  hub: any;
  cols: number;
  onPress: () => void;
}) {
  const images = (hub.images ?? []).filter((i: any) => i && i.url);
  const logoUrl = getHubImage(images, "logo");
  const coverUrl = getHubImage(images, "cover") ?? images.find((i: any) => i.type !== "logo")?.url ?? images[0]?.url ?? null;
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

  const verifyBadge =
    hub.verification_status === "verified" ? (
      <Badge label="Verified" variant="success" />
    ) : null;

  const widthClass = cols === 2 ? "w-[calc(50%-8px)]" : "w-full";

  return (
    <Card padded={false} className={cn("overflow-hidden border border-linen bg-card rounded-2xl shadow-xs", widthClass)}>
      <Pressable onPress={onPress} className="active:opacity-95 flex-1 justify-between">
        <View>
          {/* Cover image banner */}
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: "100%", height: 110 }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="h-[110px] bg-sand/50 justify-center items-center">
              <Icon name="image" size={24} color={colors.inkFaint} />
            </View>
          )}

          {/* Logo Crest overlap */}
          <View className="px-5 -mt-6 flex-row items-end gap-3 justify-between">
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={{ width: 50, height: 50, borderRadius: 12, borderWidth: 3, borderColor: colors.card }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={{ width: 50, height: 50, borderRadius: 12, borderWidth: 3, borderColor: colors.card }} className="items-center justify-center bg-sand">
                <Text className="font-display text-base text-ink-muted font-bold">
                  {hub.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="flex-row gap-1">
              {verifyBadge}
              {hub.indigenous_led ? <IndigenousLedBadge /> : null}
            </View>
          </View>

          {/* Details */}
          <View className="p-5 gap-2">
            <View className="gap-0.5">
              <Text className="font-display text-lg text-ink font-bold tracking-tight" numberOfLines={1}>
                {hub.name}
              </Text>
              <Text className="text-[10px] text-pink font-heading uppercase tracking-wider">
                {HUB_TYPE_LABELS[hub.type as HubType]}
              </Text>
            </View>
            {hub.short_description ? (
              <Text className="text-xs text-ink-muted leading-5" numberOfLines={2}>
                {hub.short_description}
              </Text>
            ) : (
              <Text className="text-xs text-ink-faint italic leading-5">
                No description provided.
              </Text>
            )}
          </View>
        </View>

        {/* Footer/Explore Button */}
        <View className="px-5 pb-5 pt-1 border-t border-linen/10 flex-row items-center justify-between">
          <Text className="text-[10px] text-ink-faint font-heading">
            {place || "Australia"}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-heading text-pink font-semibold">Explore Profile</Text>
            <Icon name="chevron-right" size={13} color={colors.pink} />
          </View>
        </View>
      </Pressable>
    </Card>
  );
}
