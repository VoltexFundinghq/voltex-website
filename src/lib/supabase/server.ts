import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use on the server (Server Components, Server Actions,
 * Route Handlers). Reads/writes the auth session via cookies.
 *
 * Note: Server Components can only READ cookies, not write them. If this is
 * called from a Server Component, the `setAll` call below will throw — that's
 * expected and safely ignored, since session refresh in that case is handled
 * by the middleware instead (see middleware.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore.
            // Session refresh is handled by middleware.ts instead.
          }
        },
      },
    }
  );
}
