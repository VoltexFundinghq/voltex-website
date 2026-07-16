"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { forgotPassword } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPassword, { error: null });

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">RESET PASSWORD</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">Forgot Your Password?</h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400">
              Enter the email address on your account and we'll send you a link to reset your password.
            </p>
          </div>
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-10 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%)]" />
        <div className="relative mx-auto max-w-[480px] px-5 sm:px-8">
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-6 backdrop-blur-xl sm:p-10">
            {state?.success ? (
              <div className="py-10 text-center">
                <p className="text-xl font-extrabold text-white">Check Your Email</p>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">{state.success}</p>
                <Link href="/login">
                  <Button className="mt-6 bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-black hover:bg-[#F5D573]">Back to Login</Button>
                </Link>
              </div>
            ) : (
              <form action={formAction} className="space-y-5">
                {state?.error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {state.error}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Email</label>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input required name="email" type="email" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="you@example.com" />
                  </div>
                </div>

                <Button type="submit" disabled={isPending} className="w-full bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573] disabled:opacity-60">
                  {isPending ? "Sending Link..." : "Send Reset Link"}
                </Button>

                <p className="text-center text-sm text-zinc-400">
                  Remembered your password?{" "}
                  <Link href="/login" className="font-semibold text-[#D4AF37] hover:text-[#F5D573]">Log In</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
