/** @type {import('tailwindcss').Config} */

// CulturePass Australia — Design Tokens
// Swiss minimalism + warm, respectful Australian palette.
// Cream paper, ochre, eucalyptus green, soft terracotta.
// Keep colour use restrained: ink on cream is the default; accents are sparing.

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    // Swiss type scale — tight, deliberate hierarchy. rem-free (RN uses px).
    fontSize: {
      "2xs": ["11px", { lineHeight: "14px", letterSpacing: "0.3px" }],
      xs: ["12px", { lineHeight: "16px", letterSpacing: "0.2px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "24px" }],
      lg: ["18px", { lineHeight: "26px" }],
      xl: ["20px", { lineHeight: "28px", letterSpacing: "-0.2px" }],
      "2xl": ["24px", { lineHeight: "30px", letterSpacing: "-0.4px" }],
      "3xl": ["30px", { lineHeight: "36px", letterSpacing: "-0.6px" }],
      "4xl": ["38px", { lineHeight: "42px", letterSpacing: "-0.8px" }],
      "5xl": ["52px", { lineHeight: "54px", letterSpacing: "-1.2px" }],
      "6xl": ["68px", { lineHeight: "68px", letterSpacing: "-1.8px" }],
    },
    extend: {
      colors: {
        // Surfaces — warm cream paper, airy and calm.
        paper: "#FAF6EF", // app background
        sand: "#F3ECE0", // subtle raised surface
        linen: "#EDE4D6", // borders / dividers (warm, low contrast)
        card: "#FFFFFF", // crisp card surface over paper

        // Ink — warm near-black for text. Never pure #000.
        ink: {
          DEFAULT: "#1C1815",
          muted: "#6B6259", // secondary text
          faint: "#9C9388", // tertiary / placeholders
        },

        // Ochre — primary warm accent (earth, sunlit stone).
        ochre: {
          50: "#FBF1E4",
          100: "#F4DEC1",
          300: "#E0A86B",
          500: "#C8772E", // primary accent
          600: "#B0651F",
          700: "#8C4F18",
        },

        // Eucalyptus — calm secondary green (bush, sage).
        eucalyptus: {
          50: "#EEF1EA",
          100: "#D6DECB",
          300: "#9CAD89",
          500: "#6B7A5E",
          600: "#566249",
          700: "#414B37",
        },

        // Terracotta — soft expressive accent (used sparingly).
        terracotta: {
          50: "#FBEDE8",
          100: "#F3D2C6",
          500: "#C05B3E",
          600: "#A4492F",
        },

        // Functional
        success: "#4F7A52",
        warning: "#C8902E",
        danger: "#B23A2E",

        // First Nations acknowledgement accents.
        // Reserved strictly for Welcome to Country / Acknowledgement surfaces.
        // Not decorative — see components/cultural/* for sanctioned usage.
        country: {
          red: "#C8442C",
          ochre: "#D08A2C",
          black: "#1A1410",
        },
      },
      fontFamily: {
        // Inter as the Neue-Haas-Grotesk-adjacent Swiss workhorse.
        // Keys are collision-free with Tailwind's font-weight utilities
        // (font-medium / font-semibold / font-bold), so each maps cleanly to a
        // specific static Inter face in NativeWind.
        sans: ["Inter_400Regular", "system-ui", "sans-serif"], // font-sans
        ui: ["Inter_500Medium", "system-ui", "sans-serif"], // font-ui (500)
        heading: ["Inter_600SemiBold", "system-ui", "sans-serif"], // font-heading (600)
        display: ["Inter_700Bold", "system-ui", "sans-serif"], // font-display (700)
      },
      spacing: {
        // 4pt base grid; generous large steps for airy layouts.
        18: "72px",
        22: "88px",
        30: "120px",
        gutter: "20px", // standard screen horizontal padding
        section: "56px", // vertical rhythm between sections
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        lg: "16px",
        xl: "22px",
        "2xl": "28px",
        pill: "999px",
      },
      maxWidth: {
        content: "1120px", // web max content width
        prose: "640px", // readable text column
        form: "520px", // creation-flow column
      },
      boxShadow: {
        // Soft, low, warm-tinted shadows. Minimal elevation.
        subtle: "0 1px 2px rgba(28, 24, 21, 0.04)",
        card: "0 2px 12px rgba(28, 24, 21, 0.06)",
        raised: "0 8px 30px rgba(28, 24, 21, 0.10)",
      },
    },
  },
  plugins: [],
};
