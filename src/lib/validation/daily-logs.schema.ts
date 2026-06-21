import { z } from "zod";

const ACTIVITY_TYPES = ["longing", "riding", "groundwork", "walk", "care", "trail", "other"] as const;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const moodScoreSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const activitiesSchema = z.array(z.enum(ACTIVITY_TYPES)).min(1, "At least one activity is required");

export const upsertDailyLogSchema = z.object({
  log_date: z.string().regex(ISO_DATE_REGEX, "Date must be YYYY-MM-DD"),
  mood_score: moodScoreSchema,
  activities: activitiesSchema,
  notes: z.string().max(2000).nullable().optional(),
});

export const updateDailyLogSchema = z.object({
  mood_score: moodScoreSchema.optional(),
  activities: activitiesSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type UpsertDailyLogInput = z.infer<typeof upsertDailyLogSchema>;

/** Envelope-only validation: ensures entries is a non-empty array. Individual
 *  entries are validated per-row inside the service to allow partial success. */
export const syncDailyLogsEnvelopeSchema = z.object({
  entries: z.array(z.unknown()).min(1, "entries must not be empty"),
});

export const dailyLogListQuerySchema = z.object({
  date_from: z.string().regex(ISO_DATE_REGEX, "date_from must be YYYY-MM-DD").optional(),
  date_to: z.string().regex(ISO_DATE_REGEX, "date_to must be YYYY-MM-DD").optional(),
  sort: z.enum(["date_asc", "date_desc"]).default("date_desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
