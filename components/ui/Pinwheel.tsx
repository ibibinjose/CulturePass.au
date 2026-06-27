import Svg, { Path, Circle, G } from "react-native-svg";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * The CulturePass brand mark: an eight-bladed pinwheel whose colours spin
 * through the full spectrum — a playful nod to "discover / create / connect"
 * across many cultures. Pure SVG, so it stays crisp at any size on web + native.
 *
 * Blade order runs clockwise from the top. The hub is rendered as a small
 * timber peg to echo a real paper pinwheel.
 */
const BLADES = [
  "#36B34A", // green
  "#2E9CE6", // blue
  "#8E44D0", // purple
  "#D6249A", // magenta
  "#F0356B", // pink
  "#E8352B", // red
  "#F2553F", // coral
  "#F4C020", // gold
];

/** A single curved blade, pointing up from the centre with a clockwise curl. */
const BLADE_PATH = "M50 50 C 39 33, 35 15, 53 6 C 66 17, 61 34, 50 50 Z";

export function Pinwheel({
  size = 32,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <G>
        {BLADES.map((color, i) => (
          <Path
            key={color}
            d={BLADE_PATH}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth={0.6}
            strokeOpacity={0.5}
            strokeLinejoin="round"
            rotation={i * 45}
            originX={50}
            originY={50}
          />
        ))}
      </G>

      {/* Timber hub */}
      <Circle cx={50} cy={50} r={9.5} fill="#D8A86A" />
      <Circle cx={50} cy={50} r={9.5} fill="none" stroke="#B9844A" strokeWidth={1.4} />
      <Circle cx={50} cy={50} r={3.4} fill="#8A5A2B" />
      <Circle cx={47.4} cy={47.4} r={1.5} fill="#FFFFFF" opacity={0.5} />
    </Svg>
  );
}
