// =============================================================================
// CulturePass Australia — raw theme tokens (JS)
// Mirror of tailwind.config.js for contexts that can't use className:
// StatusBar, native navigation, SVG fills, shadows computed in JS, etc.
// Tailwind/NativeWind remains the primary styling surface.
// =============================================================================

export const colors = {
  paper: "#FAF6EF",
  sand: "#F3ECE0",
  linen: "#EDE4D6",
  card: "#FFFFFF",

  ink: "#1C1815",
  inkMuted: "#6B6259",
  inkFaint: "#9C9388",

  ochre: "#C8772E",
  ochreSoft: "#FBF1E4",
  eucalyptus: "#6B7A5E",
  eucalyptusSoft: "#EEF1EA",
  terracotta: "#C05B3E",

  success: "#4F7A52",
  warning: "#C8902E",
  danger: "#B23A2E",

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
  pill: 999,
} as const;

export const spacing = {
  gutter: 20,
  section: 56,
} as const;

// Inter font map (loaded via expo-font in app/_layout.tsx).
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;
