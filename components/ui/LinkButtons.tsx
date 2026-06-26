import { Linking, Pressable, View } from "react-native";

import { Text } from "./Text";
import { cn } from "@/lib/utils/cn";

export interface LinkItem {
  label: string;
  sublabel?: string;
  href: string;
}

/** Stacked, full-width tappable link buttons — the link-in-bio (linktree) look. */
export function LinkButtons({ items, className }: { items: LinkItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <View className={cn("gap-3", className)}>
      {items.map((item) => (
        <Pressable
          key={`${item.label}-${item.href}`}
          onPress={() => Linking.openURL(item.href)}
          accessibilityRole="link"
          className="rounded-xl border border-linen bg-card px-5 py-4 active:bg-sand"
        >
          <Text variant="label" className="text-center text-ink">
            {item.label}
          </Text>
          {item.sublabel ? (
            <Text variant="caption" tone="faint" className="mt-0.5 text-center">
              {item.sublabel}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
