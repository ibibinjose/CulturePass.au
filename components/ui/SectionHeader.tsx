import React from "react";
import { View } from "react-native";
import { Text } from "./Text";

export function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <View className="gap-0.5">
      {eyebrow ? (
        <Text variant="overline" tone="pink" className="text-2xs font-heading tracking-widest text-pink-600">
          {eyebrow}
        </Text>
      ) : null}
      <Text className="font-display text-lg text-ink tracking-tight">{title}</Text>
    </View>
  );
}
