import { useState } from "react";
import { Modal, Pressable, ScrollView, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./Text";
import { Input } from "./Input";
import { Icon } from "./Icon";
import { Divider } from "./Divider";
import { useToast } from "./Toast";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { AUSTRALIAN_STATES, type StateCode } from "@/lib/constants";
import { useCouncils } from "@/features/reference/api";

const STATE_NAME_TO_CODE: Record<string, string> = {
  "new south wales": "NSW",
  "victoria": "VIC",
  "queensland": "QLD",
  "western australia": "WA",
  "south australia": "SA",
  "tasmania": "TAS",
  "australian capital territory": "ACT",
  "northern territory": "NT",
};

export interface LocationValue {
  state?: StateCode;
  councilId?: string;
  label: string;
}

export const ANYWHERE: LocationValue = { label: "Anywhere" };

const POPULAR_COUNCILS = [
  { name: "Sydney", state_code: "NSW" },
  { name: "Melbourne", state_code: "VIC" },
  { name: "Brisbane", state_code: "QLD" },
  { name: "Adelaide", state_code: "SA" },
  { name: "Perth", state_code: "WA" },
];

/**
 * Location filter — a pill that opens a sheet to choose a state/territory and,
 * optionally, a council within it. Replaces the old "Explore by place" list.
 */
export function LocationPicker({
  value,
  onChange,
  className,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [stateSel, setStateSel] = useState<StateCode | undefined>(value.state);
  const [search, setSearch] = useState("");
  
  // Always query all councils to enable global search and cached navigation
  const { data: councils, isLoading } = useCouncils();
  const [detecting, setDetecting] = useState(false);

  const active = !!value.state || !!value.councilId;

  const choose = (v: LocationValue) => {
    onChange(v);
    setSearch("");
    setOpen(false);
  };

  const detectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation isn't supported by your browser.");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`
          );
          if (!res.ok) throw new Error("reverse-geocode");
          const geo = await res.json();
          
          const stateName = geo.address?.state?.toLowerCase();
          const county = geo.address?.county || geo.address?.city_district || geo.address?.city;
          
          if (!stateName || !county) {
            throw new Error("incomplete-address");
          }

          const stateCode = STATE_NAME_TO_CODE[stateName];
          if (!stateCode) {
            throw new Error("unsupported-state");
          }

          // Use already-loaded councils from useCouncils()
          const councilsData = (councils ?? []).filter((c) => c.state_code === stateCode);

          if (!councilsData || councilsData.length === 0) {
            throw new Error("no-councils-in-state");
          }

          const cleanCounty = county.toLowerCase().replace("council", "").replace("city of", "").trim();
          const matchedCouncil = councilsData.find((c) => {
            const cleanName = c.name.toLowerCase().replace("council", "").replace("city of", "").trim();
            return cleanName.includes(cleanCounty) || cleanCounty.includes(cleanName);
          }) || councilsData[0];

          if (!matchedCouncil) {
            throw new Error("no-matched-council");
          }

          choose({
            state: stateCode as StateCode,
            councilId: matchedCouncil.id,
            label: matchedCouncil.name,
          });
        } catch (err) {
          console.error(err);
          toast.error("Couldn't detect your council — please choose manually.");
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error(error);
        toast.error("Location permission denied or unavailable.");
        setDetecting(false);
      }
    );
  };

  const filteredCouncils = (() => {
    const list = councils ?? [];
    const q = search.trim().toLowerCase();
    
    if (!q) {
      return stateSel ? list.filter((c) => c.state_code === stateSel) : [];
    }

    return list.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchState = c.state_code.toLowerCase() === q;
      const matchCustodians = c.traditional_custodians?.some((tc: string) => tc.toLowerCase().includes(q)) ?? false;
      
      const matchesQuery = matchName || matchState || matchCustodians;
      
      if (stateSel) {
        return c.state_code === stateSel && matchesQuery;
      }
      return matchesQuery;
    });
  })();

  const stateName = stateSel
    ? AUSTRALIAN_STATES.find((s) => s.code === stateSel)?.name ?? stateSel
    : null;

  return (
    <>
      <Pressable
        onPress={() => {
          setStateSel(value.state);
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Choose location"
        className={cn(
          "h-11 flex-row items-center gap-2 self-start rounded-pill border px-4",
          active ? "border-ink bg-ink" : "border-linen bg-card active:bg-sand",
          className,
        )}
      >
        <Icon name="map-pin" size={16} color={active ? colors.paper : colors.inkMuted} />
        <Text variant="label" className={cn("font-heading text-sm", active ? "text-paper" : "text-ink")}>
          {value.label}
        </Text>
        {active ? (
          <Pressable onPress={() => choose(ANYWHERE)} hitSlop={8}>
            <Icon name="close" size={14} color={colors.paper} strokeWidth={2.2} />
          </Pressable>
        ) : (
          <Icon name="chevron-down" size={15} color={colors.inkMuted} />
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-ink/40" onPress={() => setOpen(false)} />
        <View
          style={{ paddingBottom: insets.bottom + 8, maxHeight: "82%" }}
          className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-paper"
        >
          <View className="items-center pt-3">
            <View className="h-1.5 w-10 rounded-pill bg-linen" />
          </View>

          <View className="flex-row items-center justify-between px-gutter pb-3 pt-4">
            <Text variant="heading">{stateSel && !search ? stateName : "Choose a location"}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-pill active:bg-sand">
              <Icon name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <Divider />

          {/* Unified search bar, always visible at top of modal */}
          <View className="px-gutter pt-3 pb-2">
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder={stateSel ? `Search councils in ${stateName}...` : "Search all Australian councils, regions, or lands..."}
              leftIcon={<Icon name="search" size={18} color={colors.inkFaint} />}
              rightIcon={search ? (
                <Pressable onPress={() => setSearch("")} className="p-1">
                  <Icon name="close" size={14} color={colors.inkMuted} />
                </Pressable>
              ) : undefined}
            />
          </View>

          {/* Scrollable list content */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 10 }} showsVerticalScrollIndicator={false}>
            {search ? (
              // Search Results mode
              <View className="gap-2">
                <Text variant="overline" tone="pink">
                  Search Results ({filteredCouncils.length})
                </Text>
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.pink} className="py-8" />
                ) : filteredCouncils.length === 0 ? (
                  <View className="py-8 items-center justify-center">
                    <Icon name="search" size={24} color={colors.inkFaint} />
                    <Text variant="caption" tone="faint" className="mt-2 text-center">
                      {"No councils match \"" + search + "\""}
                    </Text>
                  </View>
                ) : (
                  filteredCouncils.map((c) => {
                    const custodianLabel = c.traditional_custodians && c.traditional_custodians.length > 0
                      ? `Traditional Land: ${c.traditional_custodians.join(" & ")}`
                      : undefined;
                    return (
                      <Row
                        key={c.id}
                        label={c.name}
                        subtitle={custodianLabel}
                        trailing={c.state_code}
                        active={value.councilId === c.id}
                        onPress={() => choose({ state: c.state_code as StateCode, councilId: c.id, label: c.name })}
                      />
                    );
                  })
                )}
              </View>
            ) : !stateSel ? (
              // Main selectors: Detect location, Quick select, and State list
              <View className="gap-4">
                <Pressable
                  onPress={detectLocation}
                  disabled={detecting}
                  className="flex-row items-center gap-3 bg-pink-50/50 border border-pink-100/60 rounded-2xl p-3.5 active:opacity-85"
                >
                  <View className="h-8 w-8 rounded-full bg-pink-600 items-center justify-center">
                    {detecting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Icon name="map-pin" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-heading text-xs text-ink font-semibold">
                      {detecting ? "Locating you..." : "Detect my location"}
                    </Text>
                    <Text className="text-[10px] text-ink-faint mt-0.5">
                      Find postcodes and local council automatically
                    </Text>
                  </View>
                </Pressable>

                {/* Popular suggestions list */}
                {councils && councils.length > 0 && (
                  <View className="gap-2">
                    <Text variant="overline" tone="pink">
                      Quick Suggestions
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="py-1">
                      {POPULAR_COUNCILS.map((pop) => {
                        const match = councils.find(c => c.name.toLowerCase().includes(pop.name.toLowerCase()) && c.state_code === pop.state_code);
                        if (!match) return null;
                        return (
                          <Pressable
                            key={match.id}
                            onPress={() => choose({ state: match.state_code as StateCode, councilId: match.id, label: match.name })}
                            className="bg-sand/40 border border-linen rounded-full px-3 py-1.5 active:bg-sand flex-row items-center gap-1.5"
                          >
                            <Text className="text-xs font-semibold text-ink-muted">{pop.name}</Text>
                            <Text className="text-[9px] font-bold text-ink-faint bg-linen/50 px-1 py-0.5 rounded">{pop.state_code}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <Row label="Anywhere in Australia" active={!active} onPress={() => choose(ANYWHERE)} />

                <View className="gap-2">
                  <Text variant="overline" tone="pink">
                    States & territories
                  </Text>
                  {AUSTRALIAN_STATES.map((s) => (
                    <Row
                      key={s.code}
                      label={s.name}
                      trailing={s.code}
                      active={value.state === s.code && !value.councilId}
                      chevron
                      onPress={() => setStateSel(s.code)}
                    />
                  ))}
                </View>
              </View>
            ) : (
              // State drill-down
              <View className="gap-4">
                <Pressable onPress={() => setStateSel(undefined)} className="flex-row items-center gap-1 self-start py-1 active:opacity-60">
                  <Icon name="chevron-left" size={16} color={colors.inkMuted} />
                  <Text variant="label" tone="muted" className="font-heading">
                    All states
                  </Text>
                </Pressable>

                <Row
                  label={`All of ${stateName}`}
                  active={value.state === stateSel && !value.councilId}
                  onPress={() => choose({ state: stateSel, label: stateSel! })}
                />

                <View className="gap-2">
                  <Text variant="overline" tone="pink">
                    Councils in {stateName}
                  </Text>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.pink} className="py-4" />
                  ) : filteredCouncils.length === 0 ? (
                    <Text variant="caption" tone="faint" className="italic py-2">
                      No councils found in this state.
                    </Text>
                  ) : (
                    filteredCouncils.map((c) => {
                      const custodianLabel = c.traditional_custodians && c.traditional_custodians.length > 0
                        ? `Traditional Land: ${c.traditional_custodians.join(" & ")}`
                        : undefined;
                      return (
                        <Row
                          key={c.id}
                          label={c.name}
                          subtitle={custodianLabel}
                          active={value.councilId === c.id}
                          onPress={() => choose({ state: stateSel, councilId: c.id, label: c.name })}
                        />
                      );
                    })
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Row({
  label,
  subtitle,
  trailing,
  active,
  chevron,
  onPress,
}: {
  label: string;
  subtitle?: string;
  trailing?: string;
  active?: boolean;
  chevron?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 rounded-2xl border px-4 py-3.5",
        active ? "border-ink bg-ochre-50" : "border-linen bg-card active:bg-sand",
      )}
    >
      <View className="flex-1 gap-0.5">
        <Text variant="label" className="text-base font-medium text-ink">
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-[10px] text-ink-faint font-sans">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        <View className="bg-sand/50 px-2 py-0.5 rounded-md border border-linen/40">
          <Text className="text-[10px] font-heading font-semibold text-ink-muted">
            {trailing}
          </Text>
        </View>
      ) : null}
      {active ? (
        <Icon name="check" size={16} color={colors.ink} strokeWidth={2.4} />
      ) : chevron ? (
        <Icon name="chevron-right" size={16} color={colors.inkFaint} />
      ) : null}
    </Pressable>
  );
}
