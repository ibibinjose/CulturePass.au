import { z } from "zod";
import { PROFESSIONAL_CATEGORIES } from "@/lib/constants";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

// Social handles are stored bare (e.g. "janedoe"); the full URL is derived on
// render (lib/social.ts), so we keep these as free strings rather than URLs.
const publicLinks = z
  .object({
    website: z.string().optional(),
    instagram: z.string().optional(),
    x: z.string().optional(),
    facebook: z.string().optional(),
    linkedin: z.string().optional(),
    tiktok: z.string().optional(),
    youtube: z.string().optional(),
  })
  .partial()
  .default({});

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Add your name").max(120),
  avatar_url: z.string().url().optional(),
  bio: z.string().trim().max(500).optional(),
  location: optionalText,
  interests: z.array(z.string().trim().min(1)).default([]),
  cultural_background: optionalText,
  indigenous_connection: optionalText,
  preferred_languages: z.array(z.string().trim().min(1)).default([]),
});

export type ProfileInput = z.input<typeof profileSchema>;

/**
 * Professional Public Account. When is_public_professional is true a category
 * is required (mirrors the DB CHECK `profiles_professional_requires_category`).
 */
export const professionalProfileSchema = profileSchema
  .extend({
    is_public_professional: z.literal(true),
    professional_category: z.enum(PROFESSIONAL_CATEGORIES, {
      message: "Choose a category",
    }),
    professional_title: z.string().trim().min(2, "Add a title").max(120),
    public_bio: z.string().trim().max(2000).optional(),
    public_links: publicLinks,
  });

export type ProfessionalProfileInput = z.input<typeof professionalProfileSchema>;

/**
 * Settings stored in profiles.preferences (jsonb). Every field has a default so
 * reading an empty `{}` yields a fully-populated, typed object.
 */
export const profilePreferencesSchema = z
  .object({
    privacy: z
      .object({
        discoverable: z.boolean().default(true),
        show_location: z.boolean().default(true),
        show_interests: z.boolean().default(true),
      })
      .default({}),
    notifications: z
      .object({
        email_event_reminders: z.boolean().default(true),
        email_hub_updates: z.boolean().default(true),
        email_announcements: z.boolean().default(false),
        weekly_digest: z.boolean().default(false),
      })
      .default({}),
    onboarding: z
      .object({
        completed: z.boolean().default(false),
      })
      .default({}),
    // The member's preferred location — seeds the Discover location filter so the
    // feed is relevant by default rather than "Anywhere".
    location: z
      .object({
        state: z.string().nullable().default(null),
        councilId: z.string().nullable().default(null),
        label: z.string().default("Anywhere"),
      })
      .default({}),
  })
  .default({});

export type ProfilePreferences = z.infer<typeof profilePreferencesSchema>;

/** Parse the raw jsonb (or null/undefined) into a typed, defaulted object. */
export function parsePreferences(raw: unknown): ProfilePreferences {
  return profilePreferencesSchema.parse(raw ?? {});
}
