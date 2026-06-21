import type { SupabaseClient } from "@/db/supabase.client";
import type {
  DailyLogDTO,
  DailyLogListDTO,
  DailyLogListQueryParams,
  DailyLogSyncErrorDTO,
  DailyLogSyncResultDTO,
  UpdateDailyLogCommand,
  UpsertDailyLogCommand,
} from "@/types";
import { upsertDailyLogSchema } from "@/lib/validation/daily-logs.schema";

const DAILY_LOG_COLUMNS = "id, horse_id, log_date, mood_score, activities, notes, created_at, updated_at";

/** The DB stores mood_score as a plain integer; the DTO narrows it to MoodScore.
 *  The CHECK constraint guarantees the value is 1 | 2 | 3 at runtime. */
function toDTO(row: Omit<DailyLogDTO, "mood_score"> & { mood_score: number }): DailyLogDTO {
  return { ...row, mood_score: row.mood_score as DailyLogDTO["mood_score"] };
}

export async function listDailyLogs(
  supabase: SupabaseClient,
  horseId: string,
  params: Required<Pick<DailyLogListQueryParams, "sort" | "page" | "limit">> & DailyLogListQueryParams
): Promise<DailyLogListDTO> {
  const { date_from, date_to, sort, page, limit } = params;
  const offset = (page - 1) * limit;

  let query = supabase.from("daily_logs").select(DAILY_LOG_COLUMNS, { count: "exact" }).eq("horse_id", horseId);

  if (date_from) query = query.gte("log_date", date_from);
  if (date_to) query = query.lte("log_date", date_to);

  query = query.order("log_date", { ascending: sort === "date_asc" }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[daily-logs] listDailyLogs error:", error);
    throw new Error("Failed to fetch daily logs");
  }

  return {
    data: (data ?? []).map(toDTO),
    pagination: { page, limit, total: count ?? 0 },
  };
}

/** Always performs INSERT ... ON CONFLICT (horse_id, log_date) DO UPDATE. */
export async function upsertDailyLog(
  supabase: SupabaseClient,
  horseId: string,
  cmd: UpsertDailyLogCommand
): Promise<DailyLogDTO> {
  const { data, error } = await supabase
    .from("daily_logs")
    .upsert(
      {
        horse_id: horseId,
        log_date: cmd.log_date,
        mood_score: cmd.mood_score,
        activities: cmd.activities,
        notes: cmd.notes ?? null,
      },
      { onConflict: "horse_id,log_date" }
    )
    .select(DAILY_LOG_COLUMNS)
    .single();

  if (error) {
    console.error("[daily-logs] upsertDailyLog error:", error);
    throw new Error("Failed to upsert daily log");
  }

  return toDTO(data);
}

export async function getDailyLog(supabase: SupabaseClient, horseId: string, id: string): Promise<DailyLogDTO | null> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select(DAILY_LOG_COLUMNS)
    .eq("horse_id", horseId)
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) {
    console.error("[daily-logs] getDailyLog error:", error);
    throw new Error("Failed to fetch daily log");
  }

  return toDTO(data);
}

/** log_date is intentionally not updatable — it is the conflict key. */
export async function updateDailyLog(
  supabase: SupabaseClient,
  horseId: string,
  id: string,
  cmd: UpdateDailyLogCommand
): Promise<DailyLogDTO | null> {
  const { data, error } = await supabase
    .from("daily_logs")
    .update(cmd)
    .eq("horse_id", horseId)
    .eq("id", id)
    .select(DAILY_LOG_COLUMNS)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) {
    console.error("[daily-logs] updateDailyLog error:", error);
    throw new Error("Failed to update daily log");
  }

  return toDTO(data);
}

export async function deleteDailyLog(supabase: SupabaseClient, horseId: string, id: string): Promise<void> {
  const { error } = await supabase.from("daily_logs").delete().eq("horse_id", horseId).eq("id", id);

  if (error) {
    console.error("[daily-logs] deleteDailyLog error:", error);
    throw new Error("Failed to delete daily log");
  }
}

/** Bulk upsert for offline sync with partial-success semantics on the
 *  (horse_id, log_date) conflict target. Each entry is validated individually:
 *  invalid entries are collected in errors[] and skipped, valid entries are
 *  upserted. Returns the count of synced rows plus any per-row errors. */
export async function syncDailyLogs(
  supabase: SupabaseClient,
  horseId: string,
  entries: unknown[]
): Promise<DailyLogSyncResultDTO> {
  const errors: DailyLogSyncErrorDTO[] = [];
  const rows: {
    horse_id: string;
    log_date: string;
    mood_score: number;
    activities: UpsertDailyLogCommand["activities"];
    notes: string | null;
  }[] = [];

  entries.forEach((entry, index) => {
    const parsed = upsertDailyLogSchema.safeParse(entry);
    if (!parsed.success) {
      const rawLogDate =
        typeof entry === "object" && entry !== null && "log_date" in entry
          ? String((entry as { log_date: unknown }).log_date)
          : `index ${index}`;
      errors.push({
        log_date: rawLogDate,
        message: parsed.error.issues[0]?.message ?? `Invalid entry at index ${index}`,
      });
      return;
    }

    rows.push({
      horse_id: horseId,
      log_date: parsed.data.log_date,
      mood_score: parsed.data.mood_score,
      activities: parsed.data.activities,
      notes: parsed.data.notes ?? null,
    });
  });

  if (rows.length === 0) {
    return { synced: 0, failed: errors.length, errors };
  }

  const { data, error } = await supabase
    .from("daily_logs")
    .upsert(rows, { onConflict: "horse_id,log_date" })
    .select("id");

  if (error) {
    console.error("[daily-logs] syncDailyLogs error:", error);
    for (const row of rows) {
      errors.push({ log_date: row.log_date, message: "Failed to persist entry" });
    }
    return { synced: 0, failed: errors.length, errors };
  }

  return { synced: data?.length ?? 0, failed: errors.length, errors };
}
