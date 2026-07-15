"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Percent, Target, ShieldAlert, MonitorSmartphone, Clock } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const challenges = [
  { size: "N200,000", fee: "N8,900", comingSoon: false },
  { size: "N300,000", fee: "N13,900", comingSoon: false },
  { size: "N500,000", fee: "N22,900", comingSoon: false, popular: true },
  { size: "N700,000", fee: "N27,900", comingSoon: false },
  { size: "N800,000", fee: "N34,900", comingSoon: false },
  { size: "N1,000,000", fee: null, comingSoon: true },
  { size: "N2,000,000", fee: null, comingSoon: true },
  { size: "N3,000,000", fee: null, comingSoon: true },
];

const stats = [
  { icon: Percent, label: "Profit Split", value: "80%" },
  { icon: Target, label: "Profit Target", value: "10%" },
  { icon: ShieldAlert, label: "Max Drawdown", value: "20%" },
  { icon: MonitorSmartphone, label: "Platform", value: "MT5" },
];

export default function ChallengesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1440px] px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">CHALLENGE PROGRAMS</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">Choose Your Challenge, Start Your Journey.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">Every Voltex Funding challenge follows the same transparent two-phase evaluation, the same fair rules, and the same 80% profit split — pick the account size that matches your ambition.</p>
          </motion.div>
          <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }} className="mx-auto mt-8 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-[1440px] px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {challenges.map((challenge, i) => (
              <motion.div key={challenge.size} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }} className={`group relative flex flex-col rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 ${challenge.popular ? "border-[#D4AF37]/50 bg-[#D4AF37]/[0.05] shadow-[0_0_50px_rgba(212,175,55,0.15)] hover:border-[#D4AF37]/70 hover:shadow-[0_25px_70px_rgba(212,175,55,0.25)]" : "border-[#D4AF37]/15 bg-white/[0.02] hover:border-[#D4AF37]/50 hover:bg-white/[0.04] hover:shadow-[0_20px_60px_rgba(212,175,55,0.15)]"} ${challenge.comingSoon ? "opacity-80" : ""}`}>
                {challenge.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4AF37] px-4 py-1 text-[11px] font-bold tracking-wide text-black shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                <p className="text-xs text-zinc-500">Account Size</p>
                <p className="mt-1 text-2xl font-bold text-white">{challenge.size}</p>
                <div className="my-5 h-px bg-[#D4AF37]/10" />
                {challenge.comingSoon ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/15 bg-white/[0.02] px-4 py-4 text-sm font-semibold text-zinc-400">
                    <Clock className="h-4 w-4 text-[#D4AF37]" />
                    Coming Soon
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-zinc-500">Challenge Fee</p>
                    <p className="mt-1 text-3xl font-extrabold text-[#D4AF37]">{challenge.fee}</p>
                  </div>
                )}
                <div className="my-5 h-px bg-[#D4AF37]/10" />
                <div className="flex-1 space-y-3">
                  {stats.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Icon className="h-4 w-4 text-[#D4AF37]" />
                        {label}
                      </span>
                      <span className="font-semibold text-white">{value}</span>
                    </div>
                  ))}
                </div>
                {challenge.comingSoon ? (
                  <button disabled className="mt-6 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.02] py-3 text-sm font-semibold text-zinc-500">
                    Coming Soon
                  </button>
                ) : (
                  <Button className="mt-6 w-full bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573]">
                    Buy Challenge
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="relative overflow-hidden rounded-[40px] border border-[#D4AF37]/25 bg-white/[0.03] px-10 py-12 text-center backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold text-white">Not Sure Which Challenge Is Right for You?</h2>
              <p className="mx-auto mt-4 max-w-xl text-zinc-400">Review our full trading rules before you begin, or reach out to our support team if you have any questions.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/trading-rules"><Button className="bg-[#D4AF37] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5D573]">View Trading Rules</Button></Link>
                <Link href="/contact"><Button className="border border-[#D4AF37] bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-[#D4AF37] hover:text-black">Contact Support</Button></Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
