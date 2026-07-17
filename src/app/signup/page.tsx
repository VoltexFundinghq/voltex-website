"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, Phone, Globe2, Gift, Sparkles, ShieldCheck } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { signUp, verifySignupCode, resendSignupCode } from "@/lib/auth/actions";

function CodeEntryForm({ email, challengeId }: { email: string; challengeId?: string }) {
  const [state, formAction, isPending] = useActionState(verifySignupCode, { error: null });
  const [resendState, resendAction, isResending] = useActionState(resendSignupCode, { error: null });

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="email" value={email} />
        {challengeId && <input type="hidden" name="challengeId" value={challengeId} />}

        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10">
            <ShieldCheck className="h-6 w-6 text-[#D4AF37]" />
          </div>
          <p className="mt-4 text-lg font-bold text-white">Check Your Email</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
            We sent a code to <span className="text-white">{email}</span>. Enter it below to continue.
          </p>
        </div>

        {state?.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {state.error}
          </div>
        )}
        {resendState?.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {resendState.error}
          </div>
        )}
        {resendState?.success && (
          <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#D4AF37]">
            {resendState.success}
          </div>
        )}

        <input
          required
          name="token"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{4,10}"
          maxLength={10}
          autoFocus
          className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-4 text-center text-2xl tracking-[0.4em] text-white placeholder:text-zinc-700 focus:border-[#D4AF37]/60 focus:outline-none"
          placeholder="Enter code"
        />

        <Button type="submit" disabled={isPending} className="w-full bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573] disabled:opacity-60">
          {isPending ? "Verifying..." : "Verify & Continue"}
        </Button>
      </form>

      <form action={resendAction}>
        <input type="hidden" name="email" value={email} />
        {challengeId && <input type="hidden" name="challengeId" value={challengeId} />}
        <button type="submit" disabled={isResending} className="w-full text-center text-sm text-zinc-400 underline decoration-zinc-600 underline-offset-4 transition-colors hover:text-[#D4AF37] disabled:opacity-50">
          {isResending ? "Sending..." : "Didn't get a code? Resend it"}
        </button>
      </form>
    </div>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref") || "";
  const challengeFromUrl = searchParams.get("challenge") || "";
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [promoCode, setPromoCode] = useState("");
  const [promoChecked, setPromoChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, formAction, isPending] = useActionState(signUp, { error: null });

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoChecked(true);
  }

  if (state?.awaitingCode && state.pendingEmail) {
    return <CodeEntryForm email={state.pendingEmail} challengeId={state.pendingChallengeId} />;
  }

  return (
    <form action={formAction} className="space-y-5">
      {challengeFromUrl && <input type="hidden" name="challengeId" value={challengeFromUrl} />}

      {state?.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Full Name</label>
        <div className="relative mt-2">
          <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input required name="fullName" type="text" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="Your full name" />
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">Used privately for your account records — never shown publicly.</p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Username</label>
        <div className="relative mt-2">
          <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input required name="username" type="text" pattern="[a-zA-Z0-9_]{3,20}" title="3-20 characters, letters, numbers, and underscores only" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="e.g. trader_chidi" />
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">This is what displays on your account, and what you'll use to log in.</p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Email</label>
        <div className="relative mt-2">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input required name="email" type="email" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="you@example.com" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Phone</label>
          <div className="relative mt-2">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input name="phone" type="tel" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="+234..." />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Country</label>
          <div className="relative mt-2">
            <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input name="country" type="text" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="Nigeria" />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Password</label>
        <div className="relative mt-2">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input required name="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="At least 8 characters" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Confirm Password</label>
        <div className="relative mt-2">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input required name="confirmPassword" type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full rounded-xl border bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none ${passwordsMismatch ? "border-red-500/50 focus:border-red-500/70" : "border-[#D4AF37]/20 focus:border-[#D4AF37]/60"}`} placeholder="Re-enter your password" />
        </div>
        {passwordsMismatch && <p className="mt-1.5 text-xs text-red-400">Passwords do not match.</p>}
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Referral Code (Optional)</label>
        <div className="relative mt-2">
          <Gift className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none"
            placeholder="Have a referral code?"
          />
        </div>
        {refFromUrl && (
          <p className="mt-1.5 text-xs text-[#D4AF37]">Referral code detected and applied automatically.</p>
        )}
      </div>

      <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-5">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">
          <Sparkles className="h-3.5 w-3.5" />
          Bonus Account Code (Optional)
        </label>
        <p className="mt-1.5 text-xs leading-5 text-zinc-400">Have a bonus account code from a promotion? Enter it below to check eligibility.</p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value); setPromoChecked(false); }}
            className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none"
            placeholder="Enter bonus code"
          />
          <button onClick={handleApplyPromo} className="flex-shrink-0 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-5 text-sm font-semibold text-[#D4AF37] transition-colors duration-300 hover:bg-[#D4AF37] hover:text-black">
            Apply
          </button>
        </div>
        {promoChecked && (
          <p className="mt-2.5 text-xs leading-5 text-zinc-400">
            Code entered: <span className="font-semibold text-[#D4AF37]">{promoCode}</span> — bonus code verification isn't live yet. Once available, this will automatically detect your bonus account size and terms.
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending || passwordsMismatch} className="w-full bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573] disabled:opacity-60">
        {isPending ? "Creating Account..." : "Create Account"}
      </Button>

      <p className="text-center text-sm text-zinc-400">
        Already have a Voltex Funding account?{" "}
        <Link href="/login" className="font-semibold text-[#D4AF37] hover:text-[#F5D573]">Log In</Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1440px] px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">SIGN UP</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">Create Your Trader Account.</h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400">
              Set up your free Voltex Funding account to track your challenges, manage payouts, and get started when you're ready.
            </p>
          </div>
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%)]" />
        <div className="relative mx-auto max-w-[480px] px-8">
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-8 backdrop-blur-xl sm:p-10">
            <Suspense fallback={null}>
              <SignupForm />
            </Suspense>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
