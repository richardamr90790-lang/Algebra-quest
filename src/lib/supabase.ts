import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** True when the Supabase keys are configured. Without them the app runs local-only. */
export const backendEnabled = Boolean(url && key);

export function getSupabase(): SupabaseClient | null {
  if (!backendEnabled) return null;
  client ??= createClient(url!, key!);
  return client;
}
