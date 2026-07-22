"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createCheckoutForUser } from "@/lib/services/purchases/checkout";
import { getProfile } from "@/lib/database/users";

export type AuthResult = {
  error: string | null;
  success?: string | null;
  awaitingCode?: boolean;
  pendingEmail?: string;
  pendingChallengeId?: string;
};

export async function signUp(prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const fullName = formData.get("fullName") as string;
  const usernameRaw = formData.get("username") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const country = formData.get("country") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const challengeId = (formData.get("challengeId") as string) || undefined;

  if (!fullName || !usernameRaw || !email || !password) {
    return { error: "Full name, username, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const username = usernameRaw.trim().toLowerCase();

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, username, phone, country },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("database") || error.message.toLowerCase().includes("user")) {
      return { error: "That username may already be taken. Please try a different one." };
    }
    return { error: error.message };
  }

  return {
    error: null,
    awaitingCode: true,
    pendingEmail: email,
    pendingChallengeId: challengeId,
  };
}

export async function verifySignupCode(prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;
  const challengeId = (formData.get("challengeId") as string) || undefined;

  if (!email || !token) {
    return { error: "Please enter the code sent to your email.", awaitingCode: true, pendingEmail: email, pendingChallengeId: challengeId };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error || !data.session || !data.user) {
    return {
      error: "That code is invalid or has expired. Please check it and try again.",
      awaitingCode: true,
      pendingEmail: email,
      pendingChallengeId: challengeId,
    };
  }

  if (challengeId) {
    const profile = await getProfile();
    let checkoutUrl: string | null = null;

    try {
      checkoutUrl = await createCheckoutForUser({
        userId: data.user.id,
        userEmail: data.user.email ?? null,
        fullName: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        challengeId,
      });
    } catch {
      checkoutUrl = null;
    }

    if (checkoutUrl) {
      redirect(checkoutUrl);
    }
    redirect("/challenges");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function resendSignupCode(prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const challengeId = (formData.get("challengeId") as string) || undefined;

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    const message = error.status === 429
      ? "Please wait a moment before requesting another code."
      : error.message;
    return { error: message, awaitingCode: true, pendingEmail: email, pendingChallengeId: challengeId };
  }

  return {
    error: null,
    success: "A new code has been sent.",
    awaitingCode: true,
    pendingEmail: email,
    pendingChallengeId: challengeId,
  };
}

export async function signIn(prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const identifierRaw = (formData.get("identifier") as string)?.trim();
  const password = formData.get("password") as string;

  if (!identifierRaw || !password) {
    return { error: "Username/email and password are required." };
  }

  const identifier = identifierRaw.toLowerCase();
  let email = identifier;

  if (!identifier.includes("@")) {
    const serviceClient = createServiceClient();
    const profileQuery = await serviceClient
      .from("users")
      .select("email")
      .eq("username", identifier)
      .single();

    const profile = profileQuery.data as { email: string } | null;

    if (!profile) {
      return { error: "Invalid login credentials." };
    }
    email = profile.email;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "Invalid login credentials." };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

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
