"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, Clock3, Wallet, Globe2, Zap, ShieldCheck, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: TrendingUp, title: "Balance-Based Trailing Drawdown", description: "Your maximum drawdown automatically recalculates from your highest closed account balance, creating a transparent and disciplined risk model that rewards consistent trading." },
  { icon: MailWarning, title: "Early-Warning Alerts", description: "We email you before you breach — at 15% drawdown, your 2nd hold-time warning, and day 4 of inactivity — giving you a real chance to course-correct instead of a silent failure." },
  { icon: Clock3, title: "No Time Limits", description: "Trade at your own pace without unnecessary deadlines. Focus on consistency instead of racing against the clock." },
  { icon: Wallet, title: "80% Profit Split", description: "Keep up to 80% of the profits you generate and grow with a model designed to reward disciplined traders." },
  { icon: Globe2, title: "Built for Nigerian Traders", description: "Designed with Nigerian traders in mind through local payment methods, responsive support, and a trading experience tailored to our region." },
  { icon: Zap, title: "Instant Challenge Delivery", description: "Receive your challenge account immediately after a successful payment so you can start trading without unnecessary delays." },
  { icon: ShieldCheck, title: "Transparent Rules", description: "No hidden conditions. Every rule is clearly explained before you begin your evaluation so you always know where you stand." },
];

function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  e.currentTarget.style.setProperty("--mx", `${x}%`);
  e.currentTarget.style.setProperty("--my", `${y}%`);
}

function FeatureCard({ feature }: { feature: (typeof features)[number] }) {
  const Icon = feature.icon;
  return (
    <motion.div whileHover={{ y: -8, scale: 1.02 }} onMouseMove={handleCardMouseMove} className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-8 backdrop-blur-xl transition-colors duration-300 hover:border-[#D4AF37]/60">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(212,175,55,0.15), transparent 45%)" }} />
      <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 transition-colors duration-300 group-hover:bg-[#D4AF37] group-hover:text-black">
        <Icon className="h-7 w-7 text-[#D4AF37] transition-colors duration-300 group-hover:text-black" />
      </div>
      <h3 className="relative mt-6 text-xl font-extrabold leading-snug text-white">{feature.title}</h3>
      <p className="relative mt-3 flex-1 text-sm leading-7 text-zinc-400">{feature.description}</p>
    </motion.div>
  );
}

export default function WhyVoltex() {
  return (
    <section className="relative overflow-hidden bg-black py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(212,175,55,.05),transparent_45%)]" />
      <div className="relative mx-auto max-w-[1440px] px-8">

        <div className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">WHY VOLTEX FUNDING</p>
          <h2 className="mt-4 text-4xl font-extrabold text-white md:text-5xl">Why Voltex Funding</h2>
          <p className="mx-auto mt-5 max-w-2xl text-zinc-400">Built to reward disciplined traders with transparent rules, fair evaluations, and a professional trading experience.</p>
        </div>

        <div className="mx-auto mb-12 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

        <div className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory -mx-8 px-8 sm:hidden [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
          {features.map((feature) => (
            <div key={feature.title} className="w-[82%] flex-shrink-0 snap-center">
              <FeatureCard feature={feature} />
            </div>
          ))}
        </div>

        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {features.map((feature) => (<FeatureCard key={feature.title} feature={feature} />))}
        </div>

        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="absolute -inset-8 rounded-[56px] bg-[#D4AF37]/8 blur-3xl" />
          <div className="relative overflow-hidden rounded-[40px] border border-[#D4AF37]/25 bg-white/[0.03] px-10 py-7 text-center backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_70%)]" />
            <div className="relative">
              <h3 className="text-3xl font-extrabold text-white">We Warn You <span className="text-[#D4AF37]">Before You Breach</span></h3>
              <p className="mx-auto mt-5 max-w-2xl text-zinc-400">Most prop firms fail you silently. Voltex Funding emails you the moment you're at risk — at 15% drawdown, your 2nd hold-time warning, and day 4 of inactivity — so discipline gets a second chance, not just a verdict.</p>
              <Link href="/challenges">
                <Button className="mt-8 bg-[#D4AF37] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5D573]">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
      </div>
    </section>
  );
}
