import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!cachedClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY)");
    }
    cachedClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return cachedClient;
}

export const SCREENSHOTS_BUCKET = "screenshots";
