import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Returns the currently logged-in user, or null if not authenticated.
 * Safe to call from any Server Component or Server Action.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the current session (includes access/refresh tokens), or null.
 */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Like getUser(), but redirects to /login if no user is found.
 * Use this inside pages/layouts that require authentication.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Logs the current user out and clears their session.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
