"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { UAParser } from "ua-parser-js";
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

async function captureSignupMetadata(userId: string) {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : headerList.get("x-real-ip");
    const userAgent = headerList.get("user-agent");

    let deviceSummary: string | null = null;
    if (userAgent) {
      const parser = new UAParser(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const browserPart = browser.name ? `${browser.name} ${browser.version ?? ""}`.trim() : "Unknown browser";
      const osPart = os.name ? `${os.name} ${os.version ?? ""}`.trim() : "Unknown OS";
      deviceSummary = `${browserPart} on ${osPart}`;
    }

    const serviceClient = createServiceClient();
    await (serviceClient.from("users") as any).update({
      signup_ip_address: ipAddress ?? null,
      signup_user_agent: userAgent ?? null,
      signup_device_summary: deviceSummary,
      signup_captured_at: new Date().toISOString(),
    }).eq("id", userId);
  } catch (err) {
    console.error("Failed to capture signup metadata (non-fatal):", err);
  }
}

export async function verifySignupCode(prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;
  const challengeId = (formData.get("challengeId") as string) || undefined;
  const agreedToTerms = formData.get("agreedToTerms") === "on";

  if (!email || !token) {
    return { error: "Please enter the code sent to your email.", awaitingCode: true, pendingEmail: email, pendingChallengeId: challengeId };
  }

  // Real, required consent gate — only enforced when a purchase is
  // actually about to happen (challengeId present). A plain signup
  // with no attached challenge needs no purchase consent yet.
  if (challengeId && !agreedToTerms) {
    return {
      error: "You must agree to the Terms of Service before your challenge purchase can proceed.",
      awaitingCode: true,
      pendingEmail: email,
      pendingChallengeId: challengeId,
    };
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

  await captureSignupMetadata(data.user.id);

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
        agreedToTerms: true,
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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "Invalid login credentials." };

  revalidatePath("/", "layout");

  if (data.user) {
    const serviceClient = createServiceClient();
    const profileQuery = await serviceClient
      .from("users")
      .select("is_admin")
      .eq("id", data.user.id)
      .single();

    const profile = profileQuery.data as { is_admin: boolean } | null;

    if (profile?.is_admin) {
      redirect("/admin");
    }
  }

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
