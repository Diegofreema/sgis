import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client (SPA).
 * Session persisted in localStorage. Reads/writes go through the anon key
 * and are governed by Postgres RLS. Server-only work (service-role, direct
 * Drizzle/Postgres, email) is NOT available here — see legacy/next-app.
 */
let client: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (client) return client;
  client = createSupabaseClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
  return client;
}

/** Shared singleton browser client. */
export const supabase = createClient();
