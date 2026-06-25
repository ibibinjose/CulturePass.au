import { View } from "react-native";
import { Image } from "expo-image";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
  className?: string;
}

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

/** Circular avatar: shows the image when present, otherwise warm initials. */
export function Avatar({ name, uri, size = 48, className }: AvatarProps) {
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <View className={cn("overflow-hidden border border-linen bg-sand", className)} style={style}>
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      </View>
    );
  }

  return (
    <View
      style={style}
      className={cn("items-center justify-center border border-linen bg-ochre-50", className)}
    >
      <Text className="font-ui text-ochre-600" style={{ fontSize: Math.round(size * 0.38) }}>
        {initials(name)}
      </Text>
    </View>
  );
}
