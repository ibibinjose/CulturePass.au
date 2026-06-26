import { z } from "zod";
import { HUB_TYPES } from "@/lib/constants";

// Trim + treat empty string as undefined so optional URL/email fields don't
// fail validation when a user clears them in the form.
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalUrl = optionalText.pipe(z.string().url("Enter a valid URL").optional());
const optionalEmail = optionalText.pipe(z.string().email("Enter a valid email").optional());

const hubImage = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  type: z.enum(["logo", "cover", "gallery"]).optional(),
});

/**
 * Draft schema — lenient, used for auto-saving an in-progress hub. Only a name
 * and a type are required so we always have something to persist.
 */
export const hubDraftSchema = z.object({
  type: z.enum(HUB_TYPES, { message: "Choose a hub type" }),
  name: z.string().trim().min(2, "Give your hub a name").max(120),
  slug: optionalText,
  short_description: z.string().trim().max(160, "Keep it under 160 characters").optional(),
  full_description: z.string().trim().max(5000).optional(),

  welcome_to_country: z.string().trim().max(2000).optional(),
  traditional_custodians: z.array(z.string().trim().min(1)).default([]),
  indigenous_led: z.boolean().default(false),
  indigenous_partners: z.array(z.string().trim().min(1)).default([]),

  location_state: z.string().trim().length(2).or(z.string().trim().length(3)).optional(),
  location_council_id: z.string().uuid().optional(),
  // Treat a blank postcode as "no value" so an empty field doesn't fail the
  // 4-digit regex when saving a draft.
  location_postcode: optionalText.pipe(
    z.string().regex(/^\d{4}$/, "4-digit postcode").optional(),
  ),
  location_city: optionalText,
  address: optionalText,

  website: optionalUrl,
  contact_email: optionalEmail,
  phone: optionalText,

  images: z.array(hubImage).default([]),
  categories: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export type HubDraftInput = z.input<typeof hubDraftSchema>;
export type HubDraft = z.output<typeof hubDraftSchema>;

/**
 * Publish schema — strict. Mirrors the DB CHECK constraint
 * `hubs_published_requires_location`: a published hub needs a location and a
 * short description.
 */
export const hubPublishSchema = hubDraftSchema.extend({
  short_description: z
    .string()
    .trim()
    .min(10, "Add a one-line description (min 10 characters)")
    .max(160),
  location_state: z.string().trim().min(2, "Choose a state"),
  location_council_id: z.string().uuid("Choose a council"),
});

export type HubPublishInput = z.input<typeof hubPublishSchema>;
