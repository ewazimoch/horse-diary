import type { Tables, Enums } from "@/db/database.types";

// ─── Scalar types ─────────────────────────────────────────────────────────────

/** Re-exported from the generated DB types so the rest of the app never imports
 *  database.types.ts directly for domain values. */
export type ActivityType = Enums<"activity_type">;
export type HealthEventType = Enums<"health_event_type">;

/** Narrowed literal union — the DB CHECK constraint guarantees only 1 | 2 | 3
 *  is stored, so we encode that precision at the TypeScript level. */
export type MoodScore = 1 | 2 | 3;

// ─── Shared / utility ─────────────────────────────────────────────────────────

export type SortDirection = "date_asc" | "date_desc";

export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
}

// ─── Horses ───────────────────────────────────────────────────────────────────

/** user_id is an internal FK — it is never exposed in API responses. */
export type HorseDTO = Omit<Tables<"horses">, "user_id">;

// --- Response wrappers ---

export interface HorseListDTO {
  data: HorseDTO[];
  /** Total count of the user's horses (no pagination — volume is small). */
  count: number;
}

export interface HorseDetailDTO {
  data: HorseDTO;
}

// --- Command models ---

export interface CreateHorseCommand {
  name: string;
  birth_year?: number | null;
  breed?: string | null;
  color?: string | null;
}

/** PATCH semantics — only the fields present in the payload are updated. */
export type UpdateHorseCommand = Partial<Pick<Tables<"horses">, "name" | "birth_year" | "breed" | "color">>;

// ─── Health Events ────────────────────────────────────────────────────────────

/** ai_metadata is excluded from all MVP read responses. */
export type HealthEventDTO = Omit<Tables<"health_events">, "ai_metadata">;

// --- Response wrappers ---

export interface HealthEventListDTO {
  data: HealthEventDTO[];
  pagination: PaginationDTO;
}

export interface HealthEventDetailDTO {
  data: HealthEventDTO;
}

// --- Query parameters ---

export interface HealthEventListQueryParams {
  /** Filter to a single event type. */
  type?: HealthEventType;
  /** Inclusive lower bound on event_date (YYYY-MM-DD). */
  date_from?: string;
  /** Inclusive upper bound on event_date (YYYY-MM-DD). */
  date_to?: string;
  sort?: SortDirection;
  page?: number;
  limit?: number;
}

// --- Command models ---

export interface CreateHealthEventCommand {
  event_type: HealthEventType;
  /** ISO date string — YYYY-MM-DD. Past and future dates are both valid. */
  event_date: string;
  notes?: string | null;
}

/** All fields are optional; at least one must be provided to make a meaningful PATCH. */
export type UpdateHealthEventCommand = Partial<CreateHealthEventCommand>;

/** A single entry inside the offline sync payload.
 *  id is optional: the client may pre-generate a UUID for idempotent upsert;
 *  without it the server inserts a new record. */
export interface SyncHealthEventEntry extends CreateHealthEventCommand {
  id?: string;
}

export interface SyncHealthEventsCommand {
  entries: SyncHealthEventEntry[];
}

// --- Sync result ---

export interface HealthEventSyncErrorDTO {
  /** The client-supplied id of the entry that failed, if one was provided. */
  id?: string;
  message: string;
}

export interface HealthEventSyncResultDTO {
  synced: number;
  failed: number;
  errors: HealthEventSyncErrorDTO[];
}

// ─── Daily Logs ───────────────────────────────────────────────────────────────

/** ai_metadata excluded from MVP responses; mood_score narrowed to its three
 *  valid values (the DB CHECK constraint guarantees this at runtime). */
export type DailyLogDTO = Omit<Tables<"daily_logs">, "ai_metadata" | "mood_score"> & {
  mood_score: MoodScore;
};

// --- Response wrappers ---

export interface DailyLogListDTO {
  data: DailyLogDTO[];
  pagination: PaginationDTO;
}

export interface DailyLogDetailDTO {
  data: DailyLogDTO;
}

// --- Query parameters ---

export interface DailyLogListQueryParams {
  /** Inclusive lower bound on log_date (YYYY-MM-DD). */
  date_from?: string;
  /** Inclusive upper bound on log_date (YYYY-MM-DD). */
  date_to?: string;
  sort?: SortDirection;
  page?: number;
  limit?: number;
}

// --- Command models ---

/** POST /daily-logs always performs an INSERT … ON CONFLICT DO UPDATE, so this
 *  command model covers both the "create" and the "replace for that date" cases.
 *  The non-empty tuple type enforces the DB CHECK (array_length >= 1). */
export interface UpsertDailyLogCommand {
  /** ISO date string — YYYY-MM-DD. */
  log_date: string;
  mood_score: MoodScore;
  activities: [ActivityType, ...ActivityType[]];
  notes?: string | null;
}

/** PATCH /daily-logs/:id — log_date is intentionally excluded: it is the
 *  unique conflict key and cannot be changed after creation. */
export interface UpdateDailyLogCommand {
  mood_score?: MoodScore;
  /** If provided, must still contain at least one element. */
  activities?: [ActivityType, ...ActivityType[]];
  notes?: string | null;
}

/** Each entry in the offline sync batch has the same shape as a regular upsert. */
export interface SyncDailyLogsCommand {
  entries: UpsertDailyLogCommand[];
}

// --- Sync result ---

export interface DailyLogSyncErrorDTO {
  /** The log_date of the entry that failed validation. */
  log_date: string;
  message: string;
}

export interface DailyLogSyncResultDTO {
  synced: number;
  failed: number;
  errors: DailyLogSyncErrorDTO[];
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

/** Health event as it appears in the weekly timeline.
 *  horse_id is omitted (the timeline is already scoped to one horse).
 *  is_future is computed server-side as event_date > CURRENT_DATE. */
export type TimelineHealthEventDTO = Omit<HealthEventDTO, "horse_id"> & {
  is_future: boolean;
};

/** Daily log as it appears in the weekly timeline.
 *  horse_id is omitted for the same reason as TimelineHealthEventDTO. */
export type TimelineDailyLogDTO = Omit<DailyLogDTO, "horse_id">;

export interface TimelineDayDTO {
  /** ISO date string — YYYY-MM-DD. */
  date: string;
  /** Full English day name, e.g. "Monday". */
  day_of_week: string;
  /** Health events for this day, ordered chronologically; empty array if none. */
  health_events: TimelineHealthEventDTO[];
  /** The daily log for this date, or null if none has been recorded. */
  daily_log: TimelineDailyLogDTO | null;
}

export interface TimelineDTO {
  /** Always a Monday — YYYY-MM-DD. */
  week_start: string;
  /** Always a Sunday — YYYY-MM-DD. */
  week_end: string;
  /** Exactly 7 elements, one per day Monday through Sunday. */
  days: TimelineDayDTO[];
}

export interface TimelineQueryParams {
  /** The Monday that starts the 7-day window (YYYY-MM-DD).
   *  Defaults to the current week's Monday when omitted. */
  week_start?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface SignUpCommand {
  email: string;
  password: string;
}

export interface SignInCommand {
  email: string;
  password: string;
}

/** Generic envelope returned by all three auth endpoints. */
export interface AuthMessageDTO {
  message: string;
}
