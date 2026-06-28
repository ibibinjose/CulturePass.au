import { Image } from "expo-image";
import type { StyleProp } from "react-native";

export function Pinwheel({
  size = 32,
  style,
}: {
  size?: number;
  style?: StyleProp<any>;
}) {
  return (
    <Image
      source={require("@/assets/logo.png")}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
    />
  );
}
