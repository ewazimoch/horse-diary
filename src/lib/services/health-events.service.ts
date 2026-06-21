import type { SupabaseClient } from "@/db/supabase.client";
import type {
  CreateHealthEventCommand,
  HealthEventDTO,
  HealthEventListDTO,
  HealthEventListQueryParams,
  HealthEventSyncErrorDTO,
  HealthEventSyncResultDTO,
  UpdateHealthEventCommand,
} from "@/types";
import { syncHealthEventEntrySchema } from "@/lib/validation/health-events.schema";

const HEALTH_EVENT_COLUMNS = "id, horse_id, event_type, event_date, notes, created_at, updated_at";

export async function listHealthEvents(
  supabase: SupabaseClient,
  horseId: string,
  params: Required<Pick<HealthEventListQueryParams, "sort" | "page" | "limit">> & HealthEventListQueryParams
): Promise<HealthEventListDTO> {
  const { type, date_from, date_to, sort, page, limit } = params;
  const offset = (page - 1) * limit;

  let query = supabase.from("health_events").select(HEALTH_EVENT_COLUMNS, { count: "exact" }).eq("horse_id", horseId);

  if (type) query = query.eq("event_type", type);
  if (date_from) query = query.gte("event_date", date_from);
  if (date_to) query = query.lte("event_date", date_to);

  query = query.order("event_date", { ascending: sort === "date_asc" }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[health-events] listHealthEvents error:", error);
    throw new Error("Failed to fetch health events");
  }

  return {
    data: data ?? [],
    pagination: { page, limit, total: count ?? 0 },
  };
}

export async function createHealthEvent(
  supabase: SupabaseClient,
  horseId: string,
  cmd: CreateHealthEventCommand
): Promise<HealthEventDTO> {
  const { data, error } = await supabase
    .from("health_events")
    .insert({ ...cmd, horse_id: horseId })
    .select(HEALTH_EVENT_COLUMNS)
    .single();

  if (error) {
    console.error("[health-events] createHealthEvent error:", error);
    throw new Error("Failed to create health event");
  }

  return data;
}

export async function getHealthEvent(
  supabase: SupabaseClient,
  horseId: string,
  id: string
): Promise<HealthEventDTO | null> {
  const { data, error } = await supabase
    .from("health_events")
    .select(HEALTH_EVENT_COLUMNS)
    .eq("horse_id", horseId)
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) {
    console.error("[health-events] getHealthEvent error:", error);
    throw new Error("Failed to fetch health event");
  }

  return data;
}

export async function updateHealthEvent(
  supabase: SupabaseClient,
  horseId: string,
  id: string,
  cmd: UpdateHealthEventCommand
): Promise<HealthEventDTO | null> {
  const { data, error } = await supabase
    .from("health_events")
    .update(cmd)
    .eq("horse_id", horseId)
    .eq("id", id)
    .select(HEALTH_EVENT_COLUMNS)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) {
    console.error("[health-events] updateHealthEvent error:", error);
    throw new Error("Failed to update health event");
  }

  return data;
}

export async function deleteHealthEvent(supabase: SupabaseClient, horseId: string, id: string): Promise<void> {
  const { error } = await supabase.from("health_events").delete().eq("horse_id", horseId).eq("id", id);

  if (error) {
    console.error("[health-events] deleteHealthEvent error:", error);
    throw new Error("Failed to delete health event");
  }
}

/** Bulk upsert for offline sync with partial-success semantics. Each entry is
 *  validated individually: invalid entries are collected in errors[] and skipped,
 *  while valid entries are upserted on the id conflict target (entries without an
 *  id are inserted as new records). Returns the count of synced rows plus errors. */
export async function syncHealthEvents(
  supabase: SupabaseClient,
  horseId: string,
  entries: unknown[]
): Promise<HealthEventSyncResultDTO> {
  const errors: HealthEventSyncErrorDTO[] = [];
  const rows: {
    id?: string;
    horse_id: string;
    event_type: string;
    event_date: string;
    notes: string | null;
  }[] = [];

  entries.forEach((entry, index) => {
    const parsed = syncHealthEventEntrySchema.safeParse(entry);
    if (!parsed.success) {
      const rawId =
        typeof entry === "object" && entry !== null && "id" in entry
          ? String((entry as { id: unknown }).id)
          : undefined;
      errors.push({
        ...(rawId ? { id: rawId } : {}),
        message: parsed.error.issues[0]?.message ?? `Invalid entry at index ${index}`,
      });
      return;
    }

    rows.push({
      ...(parsed.data.id ? { id: parsed.data.id } : {}),
      horse_id: horseId,
      event_type: parsed.data.event_type,
      event_date: parsed.data.event_date,
      notes: parsed.data.notes ?? null,
    });
  });

  if (rows.length === 0) {
    return { synced: 0, failed: errors.length, errors };
  }

  const { data, error } = await supabase.from("health_events").upsert(rows, { onConflict: "id" }).select("id");

  if (error) {
    console.error("[health-events] syncHealthEvents error:", error);
    for (const row of rows) {
      errors.push({ ...(row.id ? { id: row.id } : {}), message: "Failed to persist entry" });
    }
    return { synced: 0, failed: errors.length, errors };
  }

  return { synced: data?.length ?? 0, failed: errors.length, errors };
}
