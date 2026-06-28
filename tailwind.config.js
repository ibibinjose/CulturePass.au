/** @type {import('tailwindcss').Config} */

// =============================================================================
// CulturePass Australia — Design Tokens (v2 · "Editorial Swiss × warm earth")
// -----------------------------------------------------------------------------
// Swiss minimalism, warm Australian palette — cream paper, ochre, eucalyptus,
// terracotta — pushed into a bolder, more editorial language: confident display
// type, generous space, fuller cards, and an occasional rich `night` surface for
// contrast. Semantic token *names* are stable from v1 (so screens re-skin as
// they're rebuilt); values are refreshed and ramps expanded.
//
// Restraint still rules: ink on paper is the default; accents are sparing.
// `country.*` is reserved strictly for sanctioned First Nations surfaces.
// =============================================================================

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    // Editorial Swiss scale — tight negative tracking on the big display sizes,
    // calm reading rhythm below. rem-free (RN uses px).
    fontSize: {
      "2xs": ["11px", { lineHeight: "14px", letterSpacing: "0.4px" }],
      xs: ["12px", { lineHeight: "16px", letterSpacing: "0.2px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "25px" }],
      lg: ["18px", { lineHeight: "27px" }],
      xl: ["21px", { lineHeight: "28px", letterSpacing: "-0.1px" }],
      "2xl": ["25px", { lineHeight: "31px", letterSpacing: "-0.3px" }],
      "3xl": ["31px", { lineHeight: "36px", letterSpacing: "-0.5px" }],
      "4xl": ["40px", { lineHeight: "43px", letterSpacing: "-0.8px" }],
      "5xl": ["54px", { lineHeight: "55px", letterSpacing: "-1.2px" }],
      "6xl": ["72px", { lineHeight: "72px", letterSpacing: "-1.8px" }],
      "7xl": ["92px", { lineHeight: "90px", letterSpacing: "-2.4px" }],
    },
    extend: {
      colors: {
        // — Surfaces — warm cream paper, airy and calm.
        paper: "#FAF6EF", // app background (signature cream)
        sand: "#F1E9DA", // subtle raised surface / chips
        linen: "#E6DAC6", // borders / dividers (warm hairline)
        card: "#FFFFFF", // crisp card surface over paper

        // — Ink — warm near-black for text. Never pure #000.
        ink: {
          DEFAULT: "#1A1510",
          muted: "#6B6258", // secondary text (~5.6:1 on white)
          faint: "#706455", // tertiary / placeholders (darkened for legibility)
        },

        // — Night — rich warm-dark surfaces for editorial contrast sections
        //   (inverted heroes/footers). Text on night uses paper / night.muted.
        night: {
          DEFAULT: "#1A1510",
          soft: "#241D16", // raised card on a night surface
          line: "#3A3027", // hairline on night
          muted: "#B3A797", // secondary text on night
        },

        // — Ochre — primary warm accent (earth, sunlit stone).
        ochre: {
          50: "#FBF1E4",
          100: "#F4DEC1",
          200: "#ECC99B",
          300: "#E0A86B",
          400: "#D68F45",
          500: "#C8772E", // primary accent
          600: "#B0651F",
          700: "#8C4F18",
          800: "#6B3D14",
        },

        // — Eucalyptus — calm secondary green (bush, sage).
        eucalyptus: {
          50: "#EEF1EA",
          100: "#D6DECB",
          200: "#BDC8AC",
          300: "#9CAD89",
          400: "#82946C",
          500: "#6B7A5E",
          600: "#566249",
          700: "#414B37",
          800: "#2E351F",
        },

        // — Terracotta — soft expressive accent (used sparingly).
        terracotta: {
          50: "#FBEDE8",
          100: "#F3D2C6",
          200: "#E8B3A0",
          300: "#DB9078",
          400: "#CD7257",
          500: "#C05B3E",
          600: "#A4492F",
          700: "#833924",
        },

        // — Bright accent system ("brighten up the app"). Used on marketing
        //   surfaces (hero, tiles, footer, brand) — NOT on cultural surfaces,
        //   which keep the reserved country.* palette.
        pink: {
          50: "#FFE6F1",
          100: "#FFB9D8",
          300: "#FF6FAC",
          500: "#FF1E84", // hot pink — backgrounds / primary brand
          600: "#E10A6E",
          700: "#B80056",
        },
        teal: {
          50: "#DEF8F8",
          100: "#A9EFEF",
          300: "#3FE0E0",
          500: "#00D2D2", // turquoise — border details / accents
          600: "#00A6A6",
          700: "#017878",
        },
        gold: {
          50: "#FFF7D6",
          100: "#FDEB9E",
          300: "#FFDF52",
          500: "#FED215", // bright gold — buttons (with black border) / bottom text
          600: "#DDB400",
          700: "#A98800",
        },
        green: {
          50: "#E4F8EC",
          100: "#B8EFCC",
          300: "#5FE08C",
          500: "#25D366", // bright green — create / accents (use ink text)
          600: "#1DA851",
          700: "#157A3B", // surface w/ white text (heroes)
          800: "#0E5A2B", // deep surface (footer)
        },

        // — Functional
        success: "#3B623E",
        warning: "#955B00",
        danger: "#B23A2E",

        // WhatsApp brand green — reserved for "create / get started" actions.
        whatsapp: {
          DEFAULT: "#25D366",
          dark: "#1DA851",
        },

        // — First Nations acknowledgement accents.
        //   Reserved strictly for Welcome to Country / Acknowledgement surfaces.
        //   Not decorative — see components/cultural/* for sanctioned usage.
        country: {
          red: "#C8442C",
          ochre: "#D08A2C",
          black: "#1A1410",
        },
      },
      fontFamily: {
        // Inter as the Neue-Haas-Grotesk-adjacent Swiss workhorse. Keys are
        // collision-free with Tailwind's weight utilities so each maps cleanly
        // to a specific static Inter face under NativeWind.
        sans: ["Inter_400Regular", "system-ui", "sans-serif"], // font-sans
        ui: ["Inter_500Medium", "system-ui", "sans-serif"], // font-ui (500)
        heading: ["Inter_600SemiBold", "system-ui", "sans-serif"], // font-heading (600)
        display: ["Inter_700Bold", "system-ui", "sans-serif"], // font-display (700)
      },
      spacing: {
        // 4pt base grid; generous large steps for airy editorial layouts.
        18: "72px",
        22: "88px",
        30: "120px",
        gutter: "20px", // standard screen horizontal padding
        "gutter-lg": "32px", // wide-viewport gutter
        section: "56px", // vertical rhythm between sections
        "section-lg": "88px", // vertical rhythm on web/large sections
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        lg: "16px",
        xl: "22px",
        "2xl": "28px",
        "3xl": "36px",
        pill: "999px",
      },
      maxWidth: {
        content: "1180px", // web max content width
        prose: "660px", // readable text column
        form: "540px", // creation-flow column
      },
      boxShadow: {
        // Soft, low, warm-tinted shadows. Editorial cards lift a little more.
        subtle: "0 1px 2px rgba(26, 21, 16, 0.05)",
        card: "0 4px 18px rgba(26, 21, 16, 0.07)",
        raised: "0 14px 40px rgba(26, 21, 16, 0.12)",
        float: "0 22px 60px rgba(26, 21, 16, 0.18)",
      },
    },
  },
  plugins: [],
};
