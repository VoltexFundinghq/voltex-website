"use client";

import { motion } from "framer-motion";
import { CreditCard, TrendingUp, Trophy, Clock, MonitorSmartphone, Zap, Wallet, CheckCircle2 } from "lucide-react";

const steps = [
  { icon: CreditCard, title: "Purchase Challenge", description: "Choose your account size from N200,000 to N3,000,000 and begin your evaluation." },
  { icon: TrendingUp, title: "Reach 10% Profit Target", description: "Trade responsibly within our 20% maximum drawdown rule." },
  { icon: Trophy, title: "Get Funded", description: "Receive your funded account and earn up to 80% profit split." },
];

const perks = [
  { icon: Clock, label: "No Time Limits" },
  { icon: MonitorSmartphone, label: "MT5 Platform" },
  { icon: Zap, label: "Instant Account Delivery" },
  { icon: Wallet, label: "Payouts Within 24 Hours" },
];

const particles = [
  { top: "12%", left: "8%", size: 2, delay: 0 },
  { top: "22%", left: "88%", size: 2, delay: 0.8 },
  { top: "78%", left: "6%", size: 2, delay: 1.6 },
  { top: "82%", left: "92%", size: 2, delay: 0.4 },
];

function TravelingLight({ delay = 0, vertical = false }: { delay?: number; vertical?: boolean }) {
  return (
    <div className={vertical ? "relative h-full w-[3px] overflow-hidden rounded-full bg-[#D4AF37]/20" : "relative h-[3px] w-full overflow-hidden rounded-full bg-[#D4AF37]/20"}>
      <motion.div
        className={vertical ? "absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-[#F5D573] to-transparent" : "absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#F5D573] to-transparent"}
        style={{ filter: "drop-shadow(0 0 8px rgba(212,175,55,0.9))" }}
        animate={vertical ? { top: ["-50%", "120%"], opacity: [0, 1, 1, 0] } : { left: ["-50%", "120%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.8, 1], delay }}
      />
    </div>
  );
}

function StepCard({ step, delay }: { step: (typeof steps)[number]; delay: number }) {
  const Icon = step.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay }} whileHover={{ y: -5, scale: 1.02 }} className="group relative flex w-full flex-col items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-white/[0.02] px-6 py-[25px] text-center backdrop-blur-xl transition-colors duration-300 hover:border-[#D4AF37]/70" style={{ boxShadow: "0 0 20px rgba(212,175,55,0.05)" }}>
      <div className="relative flex h-[70px] w-[70px] items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-[#D4AF37]/30 blur-2xl transition-all duration-300 group-hover:bg-[#D4AF37]/55" />
        <div className="relative flex h-[70px] w-[70px] items-center justify-center rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] ring-1 ring-[#D4AF37]/40 transition-colors duration-300 group-hover:bg-[#D4AF37] group-hover:text-black">
          <Icon className="h-7 w-7" />
        </div>
      </div>
      <h3 className="mt-4 text-xl font-extrabold leading-snug text-white">{step.title}</h3>
      <p className="mx-auto mt-2.5 max-w-[210px] text-sm leading-7 text-zinc-400">{step.description}</p>
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-black pt-10 pb-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_50%),radial-gradient(circle_at_85%_90%,rgba(212,175,55,.06),transparent_45%)]" />
      {particles.map((p, i) => (
        <motion.div key={i} className="pointer-events-none absolute rounded-full bg-[#D4AF37] blur-[1px]" style={{ top: p.top, left: p.left, width: p.size, height: p.size, opacity: 0.25 }} animate={{ opacity: [0.1, 0.3, 0.1], y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: p.delay }} />
      ))}
      <div className="relative mx-auto max-w-[1440px] px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">How It Works</p>
          <h2 className="text-3xl font-extrabold leading-tight text-white">Become a Funded Trader in <span className="text-[#D4AF37]">3 Simple Steps</span></h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">Getting funded is simple. Purchase a challenge, prove your consistency, and receive a funded account.</p>
        </motion.div>

        <div className="relative hidden lg:flex lg:items-stretch lg:justify-center">
          {steps.map((step, i) => (
            <div key={step.title} className="flex items-stretch">
              <div className="lg:w-[390px]"><StepCard step={step} delay={i * 0.1} /></div>
              {i < steps.length - 1 && (<div className="flex w-4 flex-shrink-0 items-center justify-center"><TravelingLight delay={i * 0.1 + 0.1} /></div>)}
            </div>
          ))}
        </div>

        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-6 lg:hidden">
          {steps.map((step, i) => (
            <div key={step.title} className={i === steps.length - 1 ? "sm:col-span-2 sm:flex sm:justify-center" : ""}>
              <div className={i === steps.length - 1 ? "sm:w-[calc(50%-12px)]" : "w-full"}><StepCard step={step} delay={i * 0.08} /></div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-stretch sm:hidden">
          {steps.map((step, i) => (
            <div key={step.title}>
              <StepCard step={step} delay={i * 0.08} />
              {i < steps.length - 1 && (<div className="mx-auto flex h-6 w-[3px] items-center justify-center"><TravelingLight delay={i * 0.08 + 0.08} vertical /></div>)}
            </div>
          ))}
        </div>

        <div className="relative mx-auto mt-8 max-w-[640px]">
          <div className="absolute -inset-10 rounded-[48px] bg-[#D4AF37]/15 blur-3xl" />
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="relative rounded-2xl border border-[#D4AF37]/30 bg-white/[0.03] p-7 text-center backdrop-blur-xl" style={{ boxShadow: "0 15px 40px rgba(212,175,55,0.12)" }}>
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#D4AF37]/40 blur-2xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/40"><Trophy className="h-7 w-7 text-[#D4AF37]" /></div>
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-white">Funded Account Ready</h3>
            <div className="mx-auto mt-3 h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            <p className="mt-3 text-sm text-zinc-300">Trade with confidence.</p>
            <div className="mx-auto mt-4 flex max-w-sm flex-col gap-1.5 text-left">
              <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#D4AF37]" /><span className="text-xs leading-5 text-zinc-300">Receive up to 80% profit split.</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#D4AF37]" /><span className="text-xs leading-5 text-zinc-300">Withdraw eligible profits within 24 hours.</span></div>
            </div>
          </motion.div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((perk, i) => (
            <motion.div key={perk.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.06 }} whileHover={{ y: -5, scale: 1.03 }} className="group flex items-center gap-3.5 rounded-xl border border-[#D4AF37]/20 bg-white/[0.02] p-4 backdrop-blur-xl transition-colors duration-300 hover:border-[#D4AF37]/60" style={{ boxShadow: "0 0 18px rgba(212,175,55,0.05)" }}>
              <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-lg bg-[#D4AF37]/20 blur-lg transition-all duration-300 group-hover:bg-[#D4AF37]/40" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] ring-1 ring-[#D4AF37]/30 transition-colors duration-300 group-hover:bg-[#D4AF37] group-hover:text-black"><perk.icon className="h-5 w-5" /></div>
              </div>
              <p className="text-sm font-semibold leading-5 text-white">{perk.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }} className="mx-auto mt-10 max-w-lg text-center">
          <div className="mx-auto h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
          <p className="mt-5 text-base font-semibold text-white">Ready to prove your consistency?</p>
          <p className="mt-1.5 text-sm text-zinc-400">Choose your challenge below and begin your journey today.</p>
        </motion.div>
      </div>
    </section>
  );
}
