import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "@/lib/utils/cn";

type Variant =
  | "display" // hero headlines
  | "title" // page titles
  | "heading" // section headings
  | "subheading"
  | "body" // default paragraph
  | "bodyLarge"
  | "label" // form labels / buttons
  | "caption" // secondary meta
  | "overline"; // small uppercase eyebrow

type Tone = "default" | "muted" | "faint" | "ochre" | "eucalyptus" | "inverse";

const VARIANTS: Record<Variant, string> = {
  display: "font-display text-5xl text-ink",
  title: "font-display text-3xl text-ink",
  heading: "font-heading text-2xl text-ink",
  subheading: "font-heading text-lg text-ink",
  body: "font-sans text-base text-ink",
  bodyLarge: "font-sans text-lg text-ink",
  label: "font-ui text-sm text-ink",
  caption: "font-sans text-sm text-ink-muted",
  overline: "font-heading text-2xs uppercase tracking-[1.5px] text-ink-muted",
};

const TONES: Record<Tone, string> = {
  default: "",
  muted: "text-ink-muted",
  faint: "text-ink-faint",
  ochre: "text-ochre-600",
  eucalyptus: "text-eucalyptus-600",
  inverse: "text-paper",
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
