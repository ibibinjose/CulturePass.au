import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./Text";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Divider } from "./Divider";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";

interface MultiSelectFilterProps {
  /** Pill label when nothing is selected (e.g. "Interests"). */
  label: string;
  options: readonly string[];
  /** Optional display labels for option values. */
  labels?: Record<string, string>;
  selected: string[];
  onChange: (next: string[]) => void;
  icon?: IconName;
  className?: string;
}

/**
 * A compact dropdown filter: a pill showing the label + selected count that
 * opens a multi-select sheet. Used for the Discover interest filter; mirrors the
 * LocationPicker pattern.
 */
export function MultiSelectFilter({
  label,
  options,
  labels,
  selected,
  onChange,
  icon = "filter",
  className,
}: MultiSelectFilterProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const active = selected.length > 0;

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const pillText = active ? `${label} · ${selected.length}` : label;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} filter`}
        className={cn(
          "h-8.5 flex-row items-center gap-2 self-start rounded-pill border px-3",
          active ? "border-ink bg-ink" : "border-linen bg-card active:bg-sand",
          className,
        )}
      >
        <Icon name={icon} size={14} color={active ? colors.paper : colors.inkMuted} />
        <Text variant="label" className={cn("font-heading text-xs", active ? "text-paper" : "text-ink")}>
          {pillText}
        </Text>
        {active ? (
          <Pressable onPress={() => onChange([])} hitSlop={8}>
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
            <Text variant="heading">{label}</Text>
            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-pill active:bg-sand"
            >
              <Icon name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <Divider />

          <ScrollView contentContainerClassName="px-gutter py-4 gap-2" showsVerticalScrollIndicator={false}>
            {options.map((opt) => {
              const on = selected.includes(opt);
              return (
                <Pressable
                  key={opt}
                  onPress={() => toggle(opt)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  className={cn(
                    "flex-row items-center gap-3 rounded-2xl border px-4 py-3.5",
                    on ? "border-ink bg-ochre-50" : "border-linen bg-card active:bg-sand",
                  )}
                >
                  <View
                    className={cn(
                      "h-6 w-6 items-center justify-center rounded-lg border-2",
                      on ? "border-ink bg-ink" : "border-linen",
                    )}
                  >
                    {on ? <Icon name="check" size={13} color={colors.paper} strokeWidth={2.6} /> : null}
                  </View>
                  <Text variant="label" className="flex-1 text-base">
                    {labels?.[opt] ?? opt}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="flex-row gap-3 px-gutter pt-2">
            {active ? (
              <Button label="Clear" variant="outline" className="flex-1" onPress={() => onChange([])} />
            ) : null}
            <Button
              label={active ? `Show ${selected.length} selected` : "Done"}
              className="flex-1"
              onPress={() => setOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
