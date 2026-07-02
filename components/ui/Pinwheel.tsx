import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { Image } from "expo-image";
import type { StyleProp, ViewStyle } from "react-native";

export function Pinwheel({
  size = 32,
  style,
  spinning = true,
  windDirection,
  windSpeed,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
  spinning?: boolean;
  windDirection?: number; // 0-360, direction wind is coming FROM
  windSpeed?: number; // km/h
}) {
  const rotation = useRef(new Animated.Value(0)).current;

  // Base direction the "vane" points (windDirection). Changes cause the logo to
  // re-orient (small visual snap is acceptable + realistic for wind changes).
  const baseRotation = windDirection ?? 0;

  // Spin speed derived from wind; faster wind = faster rotation.
  // We keep duration stable for the life of the animation loop so we don't
  // restart unnecessarily on every weather poll.
  const spinDuration = windSpeed && windSpeed > 0 ? Math.max(500, 4000 / (windSpeed / 10)) : 2000;

  useEffect(() => {
    if (!spinning) return;

    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: spinDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]); // Intentionally omit rotation + spinDuration: we don't want to restart the loop on every wind update. Duration is captured at start.

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: [`${baseRotation}deg`, `${baseRotation + 360}deg`],
  });

  return (
    <Animated.View
      style={[
        { width: size, height: size, transform: [{ rotate }] },
        style,
      ]}
    >
      <Image
        source={require("@/assets/logo.png")}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </Animated.View>
  );
}
