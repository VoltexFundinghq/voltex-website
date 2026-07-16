"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AuthResult = { error: string | null; success?: string | null };

/**
 * Registers a new user. Full name, phone, and country are passed as
 * user metadata — the handle_new_user trigger reads this metadata and
 * creates the matching public.users profile row automatically.
 * Does NOT redirect: email confirmation is required before login, so
 * we show a "check your email" message instead.
 */
export async function signUp(prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const country = formData.get("country") as string;
  const password = formData.get("password") as string;

  if (!fullName || !email || !password) {
    return { error: "Full name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, country },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return {
    error: null,
    success: "Account created! Please check your email to confirm your account before logging in.",
  };
}

/**
 * Logs a user in with email and password. Redirects to home on success.
 */
export async function signIn(prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Logs the current user out and redirects to the login page.
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Sends a password reset email. Does not redirect — shows a
 * "check your email" message instead.
 */
export async function forgotPassword(prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: error.message };
  return { error: null, success: "Password reset link sent! Please check your email." };
}

/**
 * Sets a new password. Must be called with an active session established
 * via the reset-password email link (handled by the callback route).
 */
export async function resetPassword(prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  redirect("/login");
}
