import { useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import {
  Badge,
  Button,
  Card,
  Footer,
  Icon,
  Input as SearchInput,
  Screen,
  Text,
} from "@/components/ui";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useCouncils } from "@/features/reference/api";
import { useSavedLocation } from "@/features/reference/useSavedLocation";
import { AUSTRALIAN_STATES, type StateCode } from "@/lib/constants";

export default function CouncilsDirectoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { setLocation } = useSavedLocation();

  const [stateFilter, setStateFilter] = useState<StateCode | "ALL">("ALL");
  const [metroFilter, setMetroFilter] = useState<"ALL" | "METRO" | "REGIONAL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: councils, isLoading, isError } = useCouncils(stateFilter === "ALL" ? undefined : stateFilter);

  const filteredCouncils = (() => {
    let list = councils ?? [];

    // Filter by Metro / Regional
    if (metroFilter === "METRO") {
      list = list.filter((c) => c.is_metro);
    } else if (metroFilter === "REGIONAL") {
      list = list.filter((c) => !c.is_metro);
    }

    // Filter by search query
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

  // Render a typographic monogram badge with 1:1 aspect ratio
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
      <View className={cn("aspect-square w-full rounded-2xl border items-center justify-center relative", colorStyle)}>
        <Text className="font-display text-4xl tracking-tight font-semibold">
          {letters}
        </Text>
        <View className="absolute bottom-3 left-3 bg-white/80 border border-linen/30 px-1.5 py-0.5 rounded-md">
          <Text className="text-[9px] font-heading uppercase tracking-widest text-ink-muted">
            {state}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      
      {/* Header */}
      <View className="gap-2 border-b border-linen pb-5">
        <Text variant="overline" tone="pink">
          LGA Directory
        </Text>
        <Text className="font-display text-3xl md:text-4xl text-ink tracking-tight">
          Australian Councils
        </Text>
        <Text className="font-sans text-xs text-ink-faint">
          Explore local events, community calendars, and hub listings across {filteredCouncils.length} local government areas.
        </Text>
      </View>

      {/* Filter Section */}
      <View className="mt-6 gap-4">
        {/* Search */}
        <SearchInput
          placeholder="Search by council name, state, or traditional country..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Icon name="search" size={16} color={colors.inkMuted} />}
          clearButtonMode="while-editing"
        />

        {/* State Selection Scroll */}
        <View className="gap-1.5">
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
            Filter by State
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 pr-4"
            className="-mx-gutter px-gutter"
          >
            <Pressable
              onPress={() => setStateFilter("ALL")}
              className={cn(
                "h-10 items-center justify-center rounded-full border px-4 active:opacity-85",
                stateFilter === "ALL" ? "border-ink bg-ink" : "border-linen/70 bg-card"
              )}
            >
              <Text className={cn("text-xs font-heading", stateFilter === "ALL" ? "text-paper font-semibold" : "text-ink-muted")}>
                All
              </Text>
            </Pressable>
            {AUSTRALIAN_STATES.map((s) => (
              <Pressable
                key={s.code}
                onPress={() => setStateFilter(s.code)}
                className={cn(
                  "h-10 items-center justify-center rounded-full border px-4 active:opacity-85",
                  stateFilter === s.code ? "border-ink bg-ink" : "border-linen/70 bg-card"
                )}
              >
                <Text className={cn("text-xs font-heading", stateFilter === s.code ? "text-paper font-semibold" : "text-ink-muted")}>
                  {s.code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Metro / Regional Segmented Switcher */}
        <View className="gap-1.5">
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
            Location Type
          </Text>
          <View className="w-full md:max-w-[420px] flex-row border border-linen bg-card p-1 rounded-xl gap-1">
            {([
              { key: "ALL", label: "All" },
              { key: "METRO", label: "Metro" },
              { key: "REGIONAL", label: "Regional" },
            ] as const).map(({ key, label }) => {
              const on = metroFilter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setMetroFilter(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  className={cn(
                    "flex-1 items-center justify-center py-2.5 rounded-lg active:opacity-80",
                    on ? "bg-ink" : "bg-transparent",
                  )}
                >
                  <Text className={cn("text-xs font-heading", on ? "text-paper font-semibold" : "text-ink-muted")}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
        <View className="mt-8 gap-4">
          <View className="flex-row flex-wrap gap-4">
            {filteredCouncils.map((council) => {
              const widthClass = cols === 4 ? "w-[calc(25%-12px)]" : cols === 3 ? "w-[calc(33.33%-11px)]" : cols === 2 ? "w-[calc(50%-8px)]" : "w-full";
              return (
                <Card
                  key={council.id}
                  padded={false}
                  onPress={() => selectCouncil(council)}
                  className={cn("overflow-hidden border border-linen bg-card p-4 gap-3", widthClass)}
                >
                  {renderMonogram(council.name, council.state_code)}
                  
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
            Try clearing some filters or refining your search term.
          </Text>
          <Button
            label="Clear all filters"
            variant="secondary"
            size="sm"
            className="mt-2"
            onPress={() => {
              setStateFilter("ALL");
              setMetroFilter("ALL");
              setSearchQuery("");
            }}
          />
        </Card>
      )}

      <Footer className="mt-12 border-t border-linen pt-8" />
    </Screen>
  );
}
