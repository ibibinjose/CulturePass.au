import Svg, { Rect, Line, Polygon, G, Defs, ClipPath } from "react-native-svg";

const NAVY = "#00247D";
const RED = "#CF142B";
const WHITE = "#FFFFFF";

/** Points string for an n-pointed star centred at (cx, cy). */
function star(cx: number, cy: number, outer: number, points = 7): string {
  const inner = outer * 0.42;
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    out.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return out.join(" ");
}

/**
 * A small, recognisable Australian National Flag (Union Jack canton, the
 * Commonwealth Star and the Southern Cross). Decorative — used in the footer.
 */
export function AustralianFlag({ width = 44, rounded = true }: { width?: number; rounded?: boolean }) {
  const height = width / 2;
  return (
    <Svg width={width} height={height} viewBox="0 0 60 30">
      <Defs>
        <ClipPath id="ausCanton">
          <Rect x={0} y={0} width={30} height={15} rx={rounded ? 1.5 : 0} />
        </ClipPath>
      </Defs>

      <Rect x={0} y={0} width={60} height={30} rx={rounded ? 2 : 0} fill={NAVY} />

      {/* Union Jack canton */}
      <G clipPath="url(#ausCanton)">
        <Line x1={0} y1={0} x2={30} y2={15} stroke={WHITE} strokeWidth={6} />
        <Line x1={30} y1={0} x2={0} y2={15} stroke={WHITE} strokeWidth={6} />
        <Line x1={0} y1={0} x2={30} y2={15} stroke={RED} strokeWidth={2} />
        <Line x1={30} y1={0} x2={0} y2={15} stroke={RED} strokeWidth={2} />
        <Rect x={12} y={0} width={6} height={15} fill={WHITE} />
        <Rect x={0} y={4.5} width={30} height={6} fill={WHITE} />
        <Rect x={13.5} y={0} width={3} height={15} fill={RED} />
        <Rect x={0} y={6} width={30} height={3} fill={RED} />
      </G>

      {/* Commonwealth Star (under the canton) */}
      <Polygon points={star(15, 22.5, 4.4, 7)} fill={WHITE} />

      {/* Southern Cross */}
      <Polygon points={star(46, 7, 2.4, 7)} fill={WHITE} />
      <Polygon points={star(52.5, 14.5, 2.4, 7)} fill={WHITE} />
      <Polygon points={star(46, 24, 2.4, 7)} fill={WHITE} />
      <Polygon points={star(39.5, 15.5, 2.4, 7)} fill={WHITE} />
      <Polygon points={star(47, 17.5, 1.4, 5)} fill={WHITE} />
    </Svg>
  );
}
