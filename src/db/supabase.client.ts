import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient as _SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

/** Typed Supabase client bound to the project Database schema. */
export type SupabaseClient = _SupabaseClient<Database>;
