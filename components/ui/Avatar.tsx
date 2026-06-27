import { View } from "react-native";
import { Image } from "expo-image";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
  /** Adds a paper ring — used when an avatar overlaps imagery (hub headers). */
  ring?: boolean;
  className?: string;
}

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

/** Circular avatar: image when present, otherwise warm initials. */
export function Avatar({ name, uri, size = 48, ring = false, className }: AvatarProps) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  const ringClass = ring ? "border-[3px] border-paper" : "border border-linen";

  if (uri) {
    return (
      <View className={cn("overflow-hidden bg-sand", ringClass, className)} style={style}>
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      </View>
    );
  }

  return (
    <View
      style={style}
      className={cn("items-center justify-center bg-ochre-100", ringClass, className)}
    >
      <Text className="font-display text-ochre-700" style={{ fontSize: Math.round(size * 0.38) }}>
        {initials(name)}
      </Text>
    </View>
  );
}
