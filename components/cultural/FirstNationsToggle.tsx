import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../ui/Text";
import { cn } from "@/lib/utils/cn";

export function FirstNationsToggle({
  active,
  onPress,
  className,
}: {
  active: boolean;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "h-8.5 flex-row items-center gap-1.5 self-start rounded-full border px-3",
        active ? "border-country-black bg-country-black" : "border-linen/70 bg-card active:bg-sand",
        className,
      )}
    >
      <View className="flex-row gap-0.5">
        <View className="h-1.5 w-1.5 rounded-pill bg-country-red" />
        <View className="h-1.5 w-1.5 rounded-pill bg-country-ochre" />
        <View className={cn("h-1.5 w-1.5 rounded-pill", active ? "bg-paper" : "bg-ink")} />
      </View>
      <Text className={cn("font-heading text-[10px] uppercase tracking-wide", active ? "text-paper" : "text-ink")}>
        First Nations
      </Text>
    </Pressable>
  );
}
