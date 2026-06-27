import Svg, { Path, Circle, Rect, Line, Polyline } from "react-native-svg";
import { colors } from "@/lib/theme";

// =============================================================================
// Icon — single consolidated line-icon set (v2).
// 24×24 viewBox, stroke-based, rounded joins. One source of truth so icons stay
// visually consistent across nav, cards, forms and detail screens.
// =============================================================================

export type IconName =
  | "home"
  | "compass"
  | "calendar"
  | "grid"
  | "plus"
  | "search"
  | "close"
  | "menu"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up-right"
  | "share"
  | "heart"
  | "ticket"
  | "map-pin"
  | "phone"
  | "user"
  | "users"
  | "settings"
  | "bell"
  | "lock"
  | "mail"
  | "check"
  | "check-circle"
  | "edit"
  | "trash"
  | "external"
  | "image"
  | "clock"
  | "globe"
  | "info"
  | "star"
  | "link"
  | "logout"
  | "eye"
  | "eye-off"
  | "filter"
  | "sparkle"
  | "chat"
  | "send"
  | "film"
  | "food"
  | "bag"
  | "dumbbell"
  | "palette";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** A few icons support a filled treatment (e.g. heart, star). */
  filled?: boolean;
}

export function Icon({
  name,
  size = 22,
  color = colors.ink,
  strokeWidth = 1.8,
  filled = false,
}: IconProps) {
  const s = {
    stroke: color,
    strokeWidth,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const fillS = { ...s, fill: filled ? color : ("none" as const) };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths(name, s, fillS)}
    </Svg>
  );
}

type Stroke = {
  stroke: string;
  strokeWidth: number;
  fill: string;
  strokeLinecap: "round";
  strokeLinejoin: "round";
};

function renderPaths(name: IconName, s: Stroke, fillS: Stroke) {
  switch (name) {
    case "home":
      return (
        <>
          <Path d="M3 11l9-7 9 7" {...s} />
          <Path d="M5 9.8V20h14V9.8" {...s} />
        </>
      );
    case "compass":
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M15.8 8.2 13.2 13.2 8.2 15.8 10.8 10.8Z" {...s} />
        </>
      );
    case "calendar":
      return (
        <>
          <Rect x={3.5} y={5} width={17} height={15} rx={2.5} {...s} />
          <Path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" {...s} />
        </>
      );
    case "grid":
      return (
        <>
          <Rect x={4} y={4} width={7} height={7} rx={1.5} {...s} />
          <Rect x={13} y={4} width={7} height={7} rx={1.5} {...s} />
          <Rect x={4} y={13} width={7} height={7} rx={1.5} {...s} />
          <Rect x={13} y={13} width={7} height={7} rx={1.5} {...s} />
        </>
      );
    case "plus":
      return <Path d="M12 5v14M5 12h14" {...s} />;
    case "search":
      return (
        <>
          <Circle cx={11} cy={11} r={7} {...s} />
          <Line x1={16.5} y1={16.5} x2={21} y2={21} {...s} />
        </>
      );
    case "close":
      return <Path d="M6 6l12 12M18 6L6 18" {...s} />;
    case "menu":
      return <Path d="M4 7h16M4 12h16M4 17h16" {...s} />;
    case "chevron-right":
      return <Polyline points="9 5 16 12 9 19" {...s} />;
    case "chevron-left":
      return <Polyline points="15 5 8 12 15 19" {...s} />;
    case "chevron-down":
      return <Polyline points="5 9 12 16 19 9" {...s} />;
    case "arrow-right":
      return <Path d="M4 12h15M13 6l6 6-6 6" {...s} />;
    case "arrow-left":
      return <Path d="M20 12H5M11 6l-6 6 6 6" {...s} />;
    case "arrow-up-right":
      return <Path d="M7 17 17 7M8 7h9v9" {...s} />;
    case "share":
      return (
        <>
          <Path d="M12 3v13" {...s} />
          <Path d="M8 7l4-4 4 4" {...s} />
          <Path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" {...s} />
        </>
      );
    case "heart":
      return (
        <Path
          d="M12 20s-7-4.4-9.2-8.6C1.3 8.3 2.9 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.1 0 4.7 3.3 3.2 6.4C19 15.6 12 20 12 20Z"
          {...fillS}
        />
      );
    case "ticket":
      return (
        <>
          <Path
            d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8Z"
            {...s}
          />
          <Path d="M14 6v12" stroke={s.stroke} strokeWidth={s.strokeWidth} strokeDasharray="2 2.5" strokeLinecap="round" />
        </>
      );
    case "map-pin":
      return (
        <>
          <Path d="M12 21c4-4.5 7-7.6 7-11a7 7 0 10-14 0c0 3.4 3 6.5 7 11Z" {...s} />
          <Circle cx={12} cy={10} r={2.5} {...s} />
        </>
      );
    case "phone":
      return (
        <Path
          d="M6 3h3l1.5 4.5-2 1.5a12 12 0 005 5l1.5-2 4.5 1.5v3a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2Z"
          {...s}
        />
      );
    case "user":
      return (
        <>
          <Circle cx={12} cy={8} r={3.6} {...s} />
          <Path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" {...s} />
        </>
      );
    case "users":
      return (
        <>
          <Circle cx={9} cy={8} r={3.2} {...s} />
          <Path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" {...s} />
          <Path d="M16 5.2a3.2 3.2 0 010 6M17.5 14.6c2.2.5 3.5 2.3 3.5 4.9" {...s} />
        </>
      );
    case "settings":
      return (
        <>
          <Circle cx={12} cy={12} r={3} {...s} />
          <Path
            d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L16.2 2h-4l-.4 2.6a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"
            {...s}
          />
        </>
      );
    case "bell":
      return (
        <>
          <Path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" {...s} />
          <Path d="M10 19a2 2 0 004 0" {...s} />
        </>
      );
    case "lock":
      return (
        <>
          <Rect x={5} y={10.5} width={14} height={9.5} rx={2.5} {...s} />
          <Path d="M8 10.5V8a4 4 0 018 0v2.5" {...s} />
        </>
      );
    case "mail":
      return (
        <>
          <Rect x={3.5} y={5.5} width={17} height={13} rx={2.5} {...s} />
          <Path d="M4.5 7.5l7.5 5.5 7.5-5.5" {...s} />
        </>
      );
    case "check":
      return <Polyline points="5 12.5 10 17.5 19 6.5" {...s} />;
    case "check-circle":
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Polyline points="8 12.5 11 15.5 16 9" {...s} />
        </>
      );
    case "edit":
      return (
        <>
          <Path d="M14 5l5 5L9 20H4v-5L14 5Z" {...s} />
          <Path d="M12.5 6.5l5 5" {...s} />
        </>
      );
    case "trash":
      return (
        <>
          <Path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" {...s} />
          <Path d="M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" {...s} />
        </>
      );
    case "external":
      return (
        <>
          <Path d="M14 5h5v5" {...s} />
          <Path d="M19 5l-9 9" {...s} />
          <Path d="M18 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h5" {...s} />
        </>
      );
    case "image":
      return (
        <>
          <Rect x={3.5} y={5} width={17} height={14} rx={2.5} {...s} />
          <Circle cx={9} cy={10} r={1.6} {...s} />
          <Path d="M5 17l4.5-4 3 2.5L16 12l3.5 3.5" {...s} />
        </>
      );
    case "clock":
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M12 7.5V12l3 2" {...s} />
        </>
      );
    case "globe":
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" {...s} />
        </>
      );
    case "info":
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M12 11v5" {...s} />
          <Circle cx={12} cy={8} r={0.6} fill={s.stroke} stroke={s.stroke} />
        </>
      );
    case "star":
      return (
        <Path
          d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L3.2 9.7l5.4-.8L12 4Z"
          {...fillS}
        />
      );
    case "link":
      return (
        <>
          <Path d="M9.5 14.5l5-5" {...s} />
          <Path d="M8 11l-2 2a3 3 0 104.2 4.2l2-2" {...s} />
          <Path d="M16 13l2-2a3 3 0 10-4.2-4.2l-2 2" {...s} />
        </>
      );
    case "logout":
      return (
        <>
          <Path d="M14 4H6a1 1 0 00-1 1v14a1 1 0 001 1h8" {...s} />
          <Path d="M11 12h9M17 8l4 4-4 4" {...s} />
        </>
      );
    case "eye":
      return (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...s} />
          <Circle cx={12} cy={12} r={3} {...s} />
        </>
      );
    case "eye-off":
      return (
        <>
          <Path d="M4 4l16 16" {...s} />
          <Path d="M9.5 5.8A9.6 9.6 0 0112 5.5C18 5.5 21.5 12 21.5 12a14 14 0 01-3 3.6" {...s} />
          <Path d="M6.4 7.4A14 14 0 002.5 12S6 18.5 12 18.5c1 0 1.9-.1 2.7-.4" {...s} />
          <Path d="M9.9 9.9a3 3 0 004.2 4.2" {...s} />
        </>
      );
    case "filter":
      return <Path d="M4 6h16M7 12h10M10 18h4" {...s} />;
    case "sparkle":
      return (
        <Path
          d="M12 4c.5 3.5 1.5 4.5 5 5-3.5.5-4.5 1.5-5 5-.5-3.5-1.5-4.5-5-5 3.5-.5 4.5-1.5 5-5Z"
          {...fillS}
        />
      );
    case "chat":
      return (
        <Path
          d="M5 5h14a1 1 0 011 1v9a1 1 0 01-1 1H9l-4 3.5V6a1 1 0 011-1Z"
          {...s}
        />
      );
    case "send":
      return (
        <>
          <Path d="M21 4 11 14" {...s} />
          <Path d="M21 4 14.5 20l-3.5-6-6-3.5L21 4Z" {...s} />
        </>
      );
    case "film":
      return (
        <>
          <Rect x={3.5} y={4.5} width={17} height={15} rx={2.5} {...s} />
          <Path d="M8 4.5v15M16 4.5v15M3.5 9.5h4.5M16 9.5h4.5M3.5 14.5h4.5M16 14.5h4.5" {...s} />
        </>
      );
    case "food":
      return (
        <>
          <Path d="M6 3v7a2 2 0 004 0V3M8 10v11" {...s} />
          <Path d="M16 3c-1.5 0-2.5 2-2.5 4.5S14.5 12 16 12v9" {...s} />
        </>
      );
    case "bag":
      return (
        <>
          <Path d="M6 8h12l-1 12a1 1 0 01-1 1H8a1 1 0 01-1-1L6 8Z" {...s} />
          <Path d="M9 8V6a3 3 0 016 0v2" {...s} />
        </>
      );
    case "dumbbell":
      return (
        <>
          <Path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" {...s} />
        </>
      );
    case "palette":
      return (
        <>
          <Path
            d="M12 3a9 9 0 100 18c1.4 0 2-1 2-2 0-1.3-1-1.7-1-2.8 0-.8.7-1.2 1.6-1.2H17a4 4 0 004-4c0-4.2-4-8-9-8Z"
            {...s}
          />
          <Circle cx={7.5} cy={11} r={1} fill={s.stroke} stroke={s.stroke} />
          <Circle cx={12} cy={7.5} r={1} fill={s.stroke} stroke={s.stroke} />
          <Circle cx={16.5} cy={10} r={1} fill={s.stroke} stroke={s.stroke} />
        </>
      );
    default:
      return null;
  }
}
