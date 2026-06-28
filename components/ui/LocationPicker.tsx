import { useState } from "react";
import { Modal, Pressable, ScrollView, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./Text";
import { Input } from "./Input";
import { Icon } from "./Icon";
import { Divider } from "./Divider";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import { AUSTRALIAN_STATES, type StateCode } from "@/lib/constants";
import { useCouncils } from "@/features/reference/api";
import { supabase } from "@/lib/supabase/client";

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
  const [open, setOpen] = useState(false);
  const [stateSel, setStateSel] = useState<StateCode | undefined>(value.state);
  const [search, setSearch] = useState("");
  const { data: councils, isLoading } = useCouncils(stateSel);
  const [detecting, setDetecting] = useState(false);

  const active = !!value.state || !!value.councilId;

  const choose = (v: LocationValue) => {
    onChange(v);
    setSearch("");
    setOpen(false);
  };

  const detectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
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

          const { data: councilsData } = await supabase
            .from("australian_councils")
            .select("*")
            .eq("state_code", stateCode);

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
          alert("Could not automatically resolve your local council. Please select manually.");
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error(error);
        alert("Permission denied or location unavailable.");
        setDetecting(false);
      }
    );
  };

  const filteredCouncils = (() => {
    const list = councils ?? [];
    const q = search.trim().toLowerCase();
    return (q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list).slice(0, 30);
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
            <Text variant="heading">{stateSel ? stateName : "Choose a location"}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-pill active:bg-sand">
              <Icon name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <Divider />

          {!stateSel ? (
            <ScrollView contentContainerClassName="px-gutter py-4 gap-2" showsVerticalScrollIndicator={false}>
              <Pressable
                onPress={detectLocation}
                disabled={detecting}
                className="flex-row items-center gap-3 bg-pink-50/50 border border-pink-100/60 rounded-2xl p-3.5 mb-2 active:opacity-85"
              >
                <View className="h-8 w-8 rounded-full bg-pink-600 items-center justify-center">
                  {detecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Icon name="map-pin" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-heading text-xs text-ink">
                    {detecting ? "Locating you..." : "Detect my location"}
                  </Text>
                  <Text className="text-[10px] text-ink-faint mt-0.5">
                    Find postcodes and local council automatically
                  </Text>
                </View>
              </Pressable>

              <Row label="Anywhere in Australia" active={!active} onPress={() => choose(ANYWHERE)} />
              <Text variant="overline" tone="pink" className="mb-1 mt-3">
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
            </ScrollView>
          ) : (
            <ScrollView contentContainerClassName="px-gutter py-4 gap-2" showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => setStateSel(undefined)} className="mb-1 flex-row items-center gap-1 self-start py-1 active:opacity-60">
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
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder="Search councils…"
                className="my-1"
                leftIcon={<Icon name="search" size={18} color={colors.inkFaint} />}
              />
              {isLoading ? (
                <Text variant="caption" tone="faint">
                  Loading councils…
                </Text>
              ) : filteredCouncils.length === 0 ? (
                <Text variant="caption" tone="faint">
                  No councils match.
                </Text>
              ) : (
                filteredCouncils.map((c) => (
                  <Row
                    key={c.id}
                    label={c.name}
                    active={value.councilId === c.id}
                    onPress={() => choose({ state: stateSel, councilId: c.id, label: c.name })}
                  />
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

function Row({
  label,
  trailing,
  active,
  chevron,
  onPress,
}: {
  label: string;
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
      <Text variant="label" className="flex-1 text-base">
        {label}
      </Text>
      {trailing ? (
        <Text variant="caption" tone="faint">
          {trailing}
        </Text>
      ) : null}
      {active ? (
        <Icon name="check" size={16} color={colors.ink} strokeWidth={2.4} />
      ) : chevron ? (
        <Icon name="chevron-right" size={16} color={colors.inkFaint} />
      ) : null}
    </Pressable>
  );
}
