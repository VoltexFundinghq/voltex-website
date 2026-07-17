"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AtSign, Lock } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/actions";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, { error: null });

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">LOGIN</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">Welcome Back, Trader.</h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400">
              Log in to access your challenge dashboard, track your progress, and manage your funded account.
            </p>
          </div>
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-10 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%)]" />
        <div className="relative mx-auto max-w-[480px] px-5 sm:px-8">
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-6 backdrop-blur-xl sm:p-10">
            <form action={formAction} className="space-y-5">
              {state?.error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {state.error}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Username or Email</label>
                <div className="relative mt-2">
                  <AtSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input required name="identifier" type="text" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="username or you@example.com" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Password</label>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input required name="password" type="password" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="••••••••" />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <label className="flex items-center gap-2 text-zinc-400">
                  <input type="checkbox" className="h-4 w-4 rounded border-[#D4AF37]/30 bg-black/40 accent-[#D4AF37]" />
                  Remember me
                </label>
                <Link href="/forgot-password" className="font-medium text-[#D4AF37] hover:text-[#F5D573]">Forgot password?</Link>
              </div>

              <Button type="submit" disabled={isPending} className="w-full bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573] disabled:opacity-60">
                {isPending ? "Logging In..." : "Log In"}
              </Button>

              <p className="text-center text-sm text-zinc-400">
                Don't have an account yet?{" "}
                <Link href="/challenges" className="font-semibold text-[#D4AF37] hover:text-[#F5D573]">Start Challenge</Link>
              </p>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
