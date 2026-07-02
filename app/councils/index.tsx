import { useState } from "react";
import { useWindowDimensions, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import {
  Badge,
  Button,
  Card,
  Footer,
  Icon,
  Input as SearchInput,
  Pinwheel,
  Screen,
  Text,
} from "@/components/ui";
import { Image } from "expo-image";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useCouncils } from "@/features/reference/api";
import { useSavedLocation } from "@/features/reference/useSavedLocation";
import { useWeather } from "@/features/weather/api";
import type { StateCode } from "@/lib/constants";


export default function CouncilsDirectoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { setLocation } = useSavedLocation();

  const { data: weather } = useWeather();

  const [searchQuery, setSearchQuery] = useState("");

  const { data: councils, isLoading, isError } = useCouncils();

  const filteredCouncils = (() => {
    let list = councils ?? [];

    // Filter by search query only
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.state_code.toLowerCase().includes(q) ||
          (c.traditional_custodians ?? []).some((t: string) => t.toLowerCase().includes(q))
      );
    }

    return list;
  })();

  // Sort alphabetically for better UX
  const sortedCouncils = [...filteredCouncils].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Stats (from full data for accurate overview)
  const totalCouncils = councils?.length ?? 0;
  const metroCount = councils?.filter((c) => c.is_metro).length ?? 0;
  const regionalCount = totalCouncils - metroCount;

  const selectCouncil = (council: any) => {
    setLocation({
      state: council.state_code as StateCode,
      councilId: council.id,
      label: council.name,
    });
    router.push("/my-council");
  };

  // Determine grid column counts based on screen width
  const cols = width >= 1024 ? 4 : width >= 768 ? 3 : width >= 480 ? 2 : 1;

  // Render a council visual: logo if available, else nice monogram
  const renderCouncilVisual = (council: any) => {
    if (council.logo_url) {
      return (
        <View className="aspect-square w-full rounded-2xl border border-linen bg-white overflow-hidden relative">
          <Image
            source={{ uri: council.logo_url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            transition={200}
          />
          {/* Small state badge on logo for consistency */}
          <View className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-md border border-white/30 px-1.5 py-0.5 rounded-xl">
            <Text className="text-[9px] font-heading uppercase tracking-widest text-paper">
              {council.state_code}
            </Text>
          </View>
        </View>
      );
    }
    return renderMonogram(council.name, council.state_code);
  };

  // Render a typographic monogram badge with 1:1 aspect ratio - glassmorphic premium style
  const renderMonogram = (name: string, state: string) => {
    const letters = name
      .replace("Council", "")
      .replace("City of", "")
      .trim()
      .slice(0, 2)
      .toUpperCase();

    // Generate a consistent pastel/warm background based on name hash
    const colorsList = [
      "bg-pink-100 border-pink-200 text-pink-700",
      "bg-amber-100 border-amber-200 text-amber-700",
      "bg-emerald-100 border-emerald-200 text-emerald-700",
      "bg-blue-100 border-blue-200 text-blue-700",
      "bg-violet-100 border-violet-200 text-violet-700",
      "bg-orange-100 border-orange-200 text-orange-700",
    ];
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorStyle = colorsList[hash % colorsList.length];

    return (
      <View className={cn("aspect-square w-full rounded-3xl border items-center justify-center relative overflow-hidden", colorStyle)}>
        <Text className="font-display text-4xl tracking-tight font-semibold">
          {letters}
        </Text>
        {/* Glassmorphic state badge */}
        <View className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-md border border-white/30 px-1.5 py-0.5 rounded-xl">
          <Text className="text-[9px] font-heading uppercase tracking-widest text-paper">
            {state}
          </Text>
        </View>
        {/* Subtle glass overlay for premium feel */}
        <View className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      </View>
    );
  };

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      
      {/* Header */}
      <View className="gap-2 border-b border-linen pb-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="overline" tone="pink">
              LGA Directory
            </Text>
            <Text className="font-display text-3xl md:text-4xl text-ink tracking-tight">
              Australian Councils
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-subtle flex-shrink-0">
            <Pinwheel size={32} windDirection={weather?.windDirection} windSpeed={weather?.windSpeed} />
          </View>
        </View>
        <Text className="font-sans text-xs text-ink-faint">
          Explore local events, community calendars, and hub listings across {filteredCouncils.length} local government areas.
        </Text>
        {weather && (
          <View className="mt-1.5 flex-row items-center gap-1.5">
            <Icon name="globe" size={12} color={colors.inkMuted} />
            <Text className="text-[10px] text-ink-muted">
              Conditions: {weather.emoji} {weather.tempC}° • Wind {weather.windSpeed ?? '—'} km/h {weather.windDirection != null ? `(${Math.round(weather.windDirection)}°)` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Search + Stats in one line */}
      <View className="mt-4 flex-row items-center gap-3 flex-wrap lg:flex-nowrap overflow-x-auto pb-1">
        {/* Search */}
        <View className="flex-1 min-w-[200px]">
          <SearchInput
            placeholder="Search by council name, state, or traditional country..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Icon name="search" size={14} color={colors.inkMuted} />}
            clearButtonMode="while-editing"
            className="h-8 text-sm"
          />
        </View>

        {/* Stats inline - glassmorphic pills */}
        <View className="flex-row items-center gap-2 ml-auto shrink-0">
          {[
            { value: totalCouncils, label: "Councils" },
            { value: metroCount, label: "Metro" },
            { value: regionalCount, label: "Regional" },
          ].map((stat) => (
            <View
              key={stat.label}
              className="bg-black/30 backdrop-blur border border-white/20 rounded-xl px-2 py-0.5 flex-row items-baseline gap-1"
            >
              <Text className="font-display text-sm font-bold text-ink">
                {stat.value}
              </Text>
              <Text className="text-[8px] font-heading uppercase text-ink-muted">
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Grid List */}
      {isLoading ? (
        <View className="p-16 items-center justify-center">
          <ActivityIndicator size="large" color={colors.pink} />
          <Text variant="caption" tone="faint" className="mt-4">
            Loading councils directory...
          </Text>
        </View>
      ) : isError ? (
        <Card className="p-8 items-center mt-8">
          <Text variant="caption" tone="muted">
            Could not fetch councils right now. Please check your connection.
          </Text>
        </Card>
      ) : filteredCouncils.length > 0 ? (
        <View className="mt-4 gap-4">
          <View className="flex-row flex-wrap gap-4">
            {sortedCouncils.map((council) => {
              const widthClass = cols === 4 ? "w-[calc(25%-12px)]" : cols === 3 ? "w-[calc(33.33%-11px)]" : cols === 2 ? "w-[calc(50%-8px)]" : "w-full";
              return (
                <Card
                  key={council.id}
                  padded={false}
                  onPress={() => selectCouncil(council)}
                  className={cn(
                    "overflow-hidden border border-linen/60 bg-white/95 p-4 gap-3 shadow-sm active:scale-[0.985] active:bg-white transition-all",
                    widthClass
                  )}
                >
                  {renderCouncilVisual(council)}
                  
                  <View className="gap-1.5 mt-1">
                    <Text className="font-display text-base text-ink tracking-tight font-semibold" numberOfLines={2}>
                      {council.name}
                    </Text>

                    {/* Custodians list snippet */}
                    {council.traditional_custodians && council.traditional_custodians.length > 0 ? (
                      <Text className="text-[10px] font-sans text-country-red leading-4 bg-country-ochre/5 px-2 py-1 rounded" numberOfLines={2}>
                        Country: {council.traditional_custodians.join(", ")}
                      </Text>
                    ) : null}

                    <View className="flex-row flex-wrap items-center gap-1.5 mt-1">
                      <Badge
                        label={council.is_metro ? "Metro" : "Regional"}
                        variant={council.is_metro ? "success" : "neutral"}
                      />
                      {council.population ? (
                        <Text className="text-[10px] font-heading text-ink-muted bg-sand px-1.5 py-0.5 rounded">
                          Pop. {council.population.toLocaleString()}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      ) : (
        <Card className="p-10 items-center mt-8 gap-2">
          <Text variant="subheading">No councils match</Text>
          <Text variant="caption" tone="muted" className="text-center">
            Try refining your search term.
          </Text>
          <Button
            label="Clear search"
            variant="secondary"
            size="sm"
            className="mt-2"
            onPress={() => {
              setSearchQuery("");
            }}
          />
        </Card>
      )}

      <Footer className="mt-12 border-t border-linen pt-8" />
    </Screen>
  );
}
