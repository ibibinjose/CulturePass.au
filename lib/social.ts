// =============================================================================
// CulturePass Australia — social links
// Single source of truth for the social platforms we support. Used by the
// "add a handle" inputs (SocialLinksField), the public profile/hub pages and
// the link-in-bio / business-card pages. Storing only the handle keeps
// public_links compact; the full URL is derived on render.
// =============================================================================

export type SocialKey =
  | "website"
  | "instagram"
  | "x"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube";

export interface SocialPlatform {
  key: SocialKey;
  label: string;
  /** Non-editable prefix shown in the input — what the handle is appended to. */
  prefix: string;
  /** Placeholder for the handle/value the user types. */
  placeholder: string;
  /** Build a full https URL from a stored handle/value. */
  url: (value: string) => string;
}

const handle = (v: string) =>
  v.trim().replace(/^@+/, "").replace(/^\/+/, "").replace(/\s+/g, "");

const hasScheme = (v: string) => /^https?:\/\//i.test(v.trim());

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    key: "website",
    label: "Website",
    prefix: "https://",
    placeholder: "your-site.com",
    url: (v) => (hasScheme(v) ? v.trim() : `https://${v.trim().replace(/^\/+/, "")}`),
  },
  {
    key: "instagram",
    label: "Instagram",
    prefix: "instagram.com/",
    placeholder: "handle",
    url: (v) => `https://instagram.com/${handle(v)}`,
  },
  {
    key: "x",
    label: "X",
    prefix: "x.com/",
    placeholder: "handle",
    url: (v) => `https://x.com/${handle(v)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    prefix: "facebook.com/",
    placeholder: "page",
    url: (v) => `https://facebook.com/${handle(v)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    prefix: "linkedin.com/in/",
    placeholder: "handle",
    url: (v) =>
      v.includes("/")
        ? `https://${v.trim().replace(/^https?:\/\//i, "")}`
        : `https://linkedin.com/in/${handle(v)}`,
  },
  {
    key: "tiktok",
    label: "TikTok",
    prefix: "tiktok.com/@",
    placeholder: "handle",
    url: (v) => `https://tiktok.com/@${handle(v)}`,
  },
  {
    key: "youtube",
    label: "YouTube",
    prefix: "youtube.com/@",
    placeholder: "handle",
    url: (v) => `https://youtube.com/@${handle(v)}`,
  },
];

export const SOCIAL_BY_KEY = Object.fromEntries(
  SOCIAL_PLATFORMS.map((p) => [p.key, p]),
) as Record<SocialKey, SocialPlatform>;

/** Resolve a stored link value to a full URL; null when empty. */
export function socialUrl(key: string, value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const platform = SOCIAL_BY_KEY[key as SocialKey];
  // A pasted full URL is always respected (except website, which the builder
  // already normalises).
  if (hasScheme(v) && key !== "website") return v;
  if (!platform) return hasScheme(v) ? v : `https://${v}`;
  return platform.url(v);
}

export type ResolvedLink = {
  key: SocialKey;
  label: string;
  value: string;
  href: string;
};

/** public_links jsonb → ordered, resolved entries ready to render. */
export function resolveLinks(
  links: Record<string, string> | null | undefined,
): ResolvedLink[] {
  const l = links ?? {};
  const out: ResolvedLink[] = [];
  for (const p of SOCIAL_PLATFORMS) {
    const value = l[p.key];
    const href = socialUrl(p.key, value);
    if (href && value) out.push({ key: p.key, label: p.label, value, href });
  }
  return out;
}

/** Drop empty handles so we only persist links the user actually filled in. */
export function pruneLinks(links: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(links)) {
    if (v && v.trim().length > 0) out[k] = v.trim();
  }
  return out;
}
