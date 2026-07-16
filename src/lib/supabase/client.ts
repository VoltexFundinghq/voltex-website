import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in the browser (Client Components).
 * Safe to use the anon key here — Row Level Security enforces access control.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
