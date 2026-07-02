import { Image } from "expo-image";
import { View } from "react-native";
import { cn } from "@/lib/utils/cn";

/**
 * Optimized thumbnail component using expo-image (best for Expo).
 * Use for avatars, hub logos, event covers in lists/cards for caching + perf.
 * For creating resized thumbnails (e.g. before upload), use expo-image-manipulator.
 *
 * Install (if needed): npx expo install expo-image expo-image-manipulator
 */
export function Thumbnail({
  uri,
  size = 48,
  borderRadius,
  className,
  placeholder = "blur",
}: {
  uri: string | null | undefined;
  size?: number;
  borderRadius?: number;
  className?: string;
  placeholder?: "blur" | "none";
}) {
  if (!uri) {
    return (
      <View
        className={cn("bg-sand items-center justify-center", className)}
        style={{ width: size, height: size, borderRadius: borderRadius ?? size / 2 }}
      >
        <View className="w-1/2 h-1/2 bg-linen rounded" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: borderRadius ?? size / 2 }}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
      placeholderContentFit="cover"
      className={cn(className)}
    />
  );
}
