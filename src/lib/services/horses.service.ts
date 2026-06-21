import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateHorseCommand, HorseDTO, HorseListDTO, UpdateHorseCommand } from "@/types";

const HORSE_COLUMNS = "id, name, birth_year, breed, color, created_at, updated_at";

export async function listHorses(supabase: SupabaseClient): Promise<HorseListDTO> {
  const { data, error, count } = await supabase.from("horses").select(HORSE_COLUMNS, { count: "exact" }).order("name");

  if (error) {
    console.error("[horses] listHorses error:", error);
    throw new Error("Failed to fetch horses");
  }

  return { data: data ?? [], count: count ?? 0 };
}

export async function createHorse(
  supabase: SupabaseClient,
  userId: string,
  cmd: CreateHorseCommand
): Promise<HorseDTO> {
  const { data, error } = await supabase
    .from("horses")
    .insert({ ...cmd, user_id: userId })
    .select(HORSE_COLUMNS)
    .single();

  if (error) {
    console.error("[horses] createHorse error:", error);
    throw new Error("Failed to create horse");
  }

  return data;
}

export async function getHorse(supabase: SupabaseClient, id: string): Promise<HorseDTO | null> {
  const { data, error } = await supabase.from("horses").select(HORSE_COLUMNS).eq("id", id).single();

  if (error?.code === "PGRST116") return null;
  if (error) {
    console.error("[horses] getHorse error:", error);
    throw new Error("Failed to fetch horse");
  }

  return data;
}

export async function updateHorse(
  supabase: SupabaseClient,
  id: string,
  cmd: UpdateHorseCommand
): Promise<HorseDTO | null> {
  const { data, error } = await supabase.from("horses").update(cmd).eq("id", id).select(HORSE_COLUMNS).single();

  if (error?.code === "PGRST116") return null;
  if (error) {
    console.error("[horses] updateHorse error:", error);
    throw new Error("Failed to update horse");
  }

  return data;
}

export async function deleteHorse(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("horses").delete().eq("id", id);

  if (error) {
    console.error("[horses] deleteHorse error:", error);
    throw new Error("Failed to delete horse");
  }
}

/** Verifies the horse exists and belongs to the authenticated user (enforced via RLS).
 *  Returns false when the horse is not found or belongs to another user. */
export async function verifyHorseOwnership(supabase: SupabaseClient, horseId: string): Promise<boolean> {
  const { data } = await supabase.from("horses").select("id").eq("id", horseId).single();
  return !!data;
}
