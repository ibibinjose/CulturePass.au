import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "@/lib/utils/cn";

type Variant =
  | "displayLarge" // landing hero
  | "display" // hero headlines
  | "title" // page titles
  | "heading" // section headings
  | "subheading"
  | "body" // default paragraph
  | "bodyLarge"
  | "lead" // intro paragraph under a title
  | "label" // form labels / buttons
  | "caption" // secondary meta
  | "overline"; // small uppercase eyebrow

type Tone =
  | "default"
  | "muted"
  | "faint"
  | "ochre"
  | "eucalyptus"
  | "terracotta"
  | "pink"
  | "teal"
  | "green"
  | "white"
  | "inverse"
  | "inverseMuted";

const VARIANTS: Record<Variant, string> = {
  displayLarge: "font-display text-5xl md:text-7xl text-ink",
  display: "font-display text-4xl md:text-5xl text-ink",
  title: "font-display text-3xl md:text-4xl text-ink",
  heading: "font-heading text-2xl text-ink",
  subheading: "font-heading text-lg text-ink",
  body: "font-sans text-base text-ink",
  bodyLarge: "font-sans text-lg text-ink",
  lead: "font-sans text-lg md:text-xl text-ink-muted",
  label: "font-ui text-sm text-ink",
  caption: "font-sans text-sm text-ink-muted",
  overline: "font-heading text-2xs uppercase tracking-[1.6px] text-ink-muted",
};

const TONES: Record<Tone, string> = {
  default: "",
  muted: "text-ink-muted",
  faint: "text-ink-faint",
  ochre: "text-ochre-600",
  eucalyptus: "text-eucalyptus-600",
  terracotta: "text-terracotta-600",
  pink: "text-pink-600",
  teal: "text-teal-700",
  green: "text-green-700",
  white: "text-white",
  inverse: "text-paper",
  inverseMuted: "text-night-muted",
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  className?: string;
}

/**
 * Typographic primitive. All text in the app flows through here so the Swiss
 * type scale and tone system stay consistent.
 */
export function Text({ variant = "body", tone = "default", className, ...rest }: TextProps) {
  return <RNText className={cn(VARIANTS[variant], TONES[tone], className)} {...rest} />;
}
