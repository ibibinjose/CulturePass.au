import { z } from "zod";
import { EVENT_TYPES } from "@/lib/constants";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

// Form date fields start as "" — treat empty/blank as "no value" so an
// unset date doesn't fail `.datetime()` validation.
const optionalIsoDateTime = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : undefined))
  .pipe(z.string().datetime({ offset: true }).optional());

const requiredIsoDateTime = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : undefined))
  .pipe(
    z
      .string({ required_error: "Add a start time" })
      .datetime({ offset: true, message: "Add a valid start time" }),
  );

export const eventDraftSchema = z
  .object({
    hub_id: z.string().uuid(),
    type: z.enum(EVENT_TYPES).default("event"),
    title: z.string().trim().max(140).optional(),
    description: z.string().trim().max(5000).optional(),

    start_time: optionalIsoDateTime,
    end_time: optionalIsoDateTime,

    is_free: z.boolean().default(true),
    price: z.number().nonnegative().optional(),
    ticket_url: optionalText.pipe(z.string().url().optional()),

    location_city: optionalText,
    location_state: optionalText,
    location_council_id: z.string().uuid().optional(),

    capacity: z.number().int().nonnegative().optional(),
    images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).default([]),
    tags: z.array(z.string().trim().min(1)).default([]),
    cultural_focus: z.array(z.string().trim().min(1)).default([]),
  })
  .refine((v) => v.is_free || v.price !== undefined, {
    message: "Add a price or mark the event free",
    path: ["price"],
  })
  .refine((v) => !v.start_time || !v.end_time || v.end_time >= v.start_time, {
    message: "End time must be after the start",
    path: ["end_time"],
  });

export type EventDraftInput = z.input<typeof eventDraftSchema>;

/**
 * Publish schema — mirrors the DB CHECK `events_published_requires_fields`:
 * a published event needs a title and a start time.
 */
export const eventPublishSchema = z
  .object({
    hub_id: z.string().uuid(),
    type: z.enum(EVENT_TYPES),
    title: z.string().trim().min(3, "Give the event a title").max(140),
    description: z.string().trim().max(5000).optional(),
    start_time: requiredIsoDateTime,
    end_time: optionalIsoDateTime,
    is_free: z.boolean(),
    price: z.number().nonnegative().optional(),
    ticket_url: optionalText.pipe(z.string().url().optional()),
    location_city: optionalText,
    location_state: optionalText,
    location_council_id: z.string().uuid().optional(),
    capacity: z.number().int().nonnegative().optional(),
    images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).default([]),
    tags: z.array(z.string().trim().min(1)).default([]),
    cultural_focus: z.array(z.string().trim().min(1)).default([]),
  })
  .refine((v) => v.is_free || v.price !== undefined, {
    message: "Add a price or mark the event free",
    path: ["price"],
  })
  .refine((v) => !v.end_time || v.end_time >= v.start_time, {
    message: "End time must be after the start",
    path: ["end_time"],
  });

export type EventPublishInput = z.input<typeof eventPublishSchema>;
