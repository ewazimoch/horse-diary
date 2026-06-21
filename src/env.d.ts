/// <reference types="astro/client" />

import type { SupabaseClient } from "@/db/supabase.client";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user: import("@supabase/supabase-js").User | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
