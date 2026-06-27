// =============================================================================
// CulturePass Australia — raw theme tokens (JS) · v2
// Mirror of tailwind.config.js for contexts that can't use className:
// StatusBar, native navigation, SVG fills, shadows computed in JS, etc.
// Tailwind/NativeWind remains the primary styling surface.
// =============================================================================

export const colors = {
  paper: "#FAF6EF",
  sand: "#F1E9DA",
  linen: "#E6DAC6",
  card: "#FFFFFF",

  ink: "#1A1510",
  inkMuted: "#6B6258",
  inkFaint: "#857A6B",

  // Night — rich warm-dark editorial surfaces.
  night: "#1A1510",
  nightSoft: "#241D16",
  nightLine: "#3A3027",
  nightMuted: "#B3A797",

  ochre: "#C8772E",
  ochreSoft: "#FBF1E4",
  ochreDeep: "#8C4F18",
  eucalyptus: "#6B7A5E",
  eucalyptusSoft: "#EEF1EA",
  eucalyptusDeep: "#414B37",
  terracotta: "#C05B3E",
  terracottaSoft: "#FBEDE8",

  // Bright brand system (main colours).
  pink: "#FF1E84",
  pinkSoft: "#FFE6F1",
  pinkDeep: "#E10A6E",
  teal: "#00D2D2",
  tealSoft: "#DEF8F8",
  tealDeep: "#00A6A6",
  gold: "#FED215",
  goldSoft: "#FFF7D6",
  goldDeep: "#A98800",
  green: "#25D366",
  greenSurface: "#157A3B",
  greenDeep: "#0E5A2B",
  greenSoft: "#E4F8EC",
  white: "#FFFFFF",

  success: "#4F7A52",
  warning: "#C8902E",
  danger: "#B23A2E",

  whatsapp: "#25D366",
  whatsappDark: "#1DA851",

  country: {
    red: "#C8442C",
    ochre: "#D08A2C",
    black: "#1A1410",
  },
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  "2xl": 28,
  "3xl": 36,
  pill: 999,
} as const;

export const spacing = {
  gutter: 20,
  gutterLg: 32,
  section: 56,
  sectionLg: 88,
} as const;

// Motion — purposeful, restrained. Durations in ms; standard ease-out curve.
export const motion = {
  fast: 140,
  base: 220,
  slow: 360,
  easeOut: [0.22, 1, 0.36, 1] as const,
} as const;

// Inter font map (loaded via expo-font in app/_layout.tsx).
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;
