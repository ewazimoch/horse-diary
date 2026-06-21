import { z } from "zod";

const HEALTH_EVENT_TYPES = ["farrier", "vet", "vaccination", "deworming", "dentist"] as const;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createHealthEventSchema = z.object({
  event_type: z.enum(HEALTH_EVENT_TYPES),
  event_date: z.string().regex(ISO_DATE_REGEX, "Date must be YYYY-MM-DD"),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateHealthEventSchema = createHealthEventSchema.partial();

export const syncHealthEventEntrySchema = createHealthEventSchema.extend({
  id: z.string().uuid().optional(),
});

export type SyncHealthEventEntryInput = z.infer<typeof syncHealthEventEntrySchema>;

/** Envelope-only validation: ensures entries is a non-empty array. Individual
 *  entries are validated per-row inside the service to allow partial success. */
export const syncHealthEventsEnvelopeSchema = z.object({
  entries: z.array(z.unknown()).min(1, "entries must not be empty"),
});

export const healthEventListQuerySchema = z.object({
  type: z.enum(HEALTH_EVENT_TYPES).optional(),
  date_from: z.string().regex(ISO_DATE_REGEX, "date_from must be YYYY-MM-DD").optional(),
  date_to: z.string().regex(ISO_DATE_REGEX, "date_to must be YYYY-MM-DD").optional(),
  sort: z.enum(["date_asc", "date_desc"]).default("date_desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
