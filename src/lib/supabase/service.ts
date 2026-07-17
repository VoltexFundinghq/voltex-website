import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 * ONLY use this in trusted server-side code with no logged-in user
 * (webhooks, cron jobs, admin actions). NEVER expose this client or
 * the service role key to the browser.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
