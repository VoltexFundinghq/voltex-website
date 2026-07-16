"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { User, Mail, Lock, Gift, Sparkles } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

function SignupForm() {
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref") || "";
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [promoCode, setPromoCode] = useState("");
  const [promoChecked, setPromoChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoChecked(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-8 backdrop-blur-xl sm:p-10">
      {submitted ? (
        <div className="py-10 text-center">
          <p className="text-xl font-extrabold text-white">Sign Up Coming Soon</p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
            Account creation isn't live yet — we're still building this out. Check back soon, or contact support if you'd like to get started sooner.
          </p>
          <Link href="/contact">
            <Button className="mt-6 bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-black hover:bg-[#F5D573]">Contact Support</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Full Name</label>
            <div className="relative mt-2">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input required type="text" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="Your full name" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Email</label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input required type="email" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Password</label>
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input required type="password" className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="Create a password" />
            </div>
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

          <Button type="submit" className="w-full bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573]">
            Create Account
          </Button>

          <p className="text-center text-sm text-zinc-400">
            Already have a Voltex Funding account?{" "}
            <Link href="/login" className="font-semibold text-[#D4AF37] hover:text-[#F5D573]">Log In</Link>
          </p>
        </form>
      )}
    </motion.div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1440px] px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">SIGN UP</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">Create Your Trader Account.</h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400">
              Set up your free Voltex Funding account to track your challenges, manage payouts, and get started when you're ready.
            </p>
          </motion.div>
          <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }} className="mx-auto mt-8 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%)]" />
        <div className="relative mx-auto max-w-[480px] px-8">
          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>
        </div>
      </section>

      <Footer />
    </main>
  );
}
