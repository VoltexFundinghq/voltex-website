"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, Clock3, Wallet, Globe2, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: TrendingUp, title: "Balance-Based Trailing Drawdown", description: "Your maximum drawdown automatically recalculates from your highest closed account balance, creating a transparent and disciplined risk model that rewards consistent trading." },
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

export default function WhyVoltex() {
  return (
    <section className="relative overflow-hidden bg-black py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(212,175,55,.05),transparent_45%)]" />
      <div className="relative mx-auto max-w-[1440px] px-8">
        <motion.div initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">WHY VOLTEX FUNDING</p>
          <h2 className="mt-4 text-4xl font-extrabold text-white md:text-5xl">Why Voltex Funding</h2>
          <p className="mx-auto mt-5 max-w-2xl text-zinc-400">Built to reward disciplined traders with transparent rules, fair evaluations, and a professional trading experience.</p>
        </motion.div>

        <motion.div initial={{ scaleX: 0, opacity: 0 }} whileInView={{ scaleX: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="mx-auto mb-12 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.06 }} whileHover={{ y: -8, scale: 1.02 }} onMouseMove={handleCardMouseMove} className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-8 backdrop-blur-xl transition-colors duration-300 hover:border-[#D4AF37]/60" style={{ boxShadow: "0 0 24px rgba(212,175,55,0.06)" }}>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(212,175,55,0.15), transparent 45%)" }} />
                <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                  <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#D4AF37]/10 blur-3xl" />
                </div>
                <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 transition-colors duration-300 group-hover:bg-[#D4AF37] group-hover:text-black">
                  <Icon className="h-7 w-7 text-[#D4AF37] transition-colors duration-300 group-hover:text-black" />
                </div>
                <h3 className="relative mt-6 text-xl font-extrabold leading-snug text-white">{feature.title}</h3>
                <p className="relative mt-3 flex-1 text-sm leading-7 text-zinc-400">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="absolute -inset-8 rounded-[56px] bg-[#D4AF37]/8 blur-3xl" />
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }} className="relative overflow-hidden rounded-[40px] border border-[#D4AF37]/25 bg-white/[0.03] px-10 py-7 text-center backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_70%)]" />
            <div className="relative">
              <h3 className="text-3xl font-extrabold text-white">Built to Reward <span className="text-[#D4AF37]">Discipline</span></h3>
              <p className="mx-auto mt-5 max-w-2xl text-zinc-400">Voltex Funding is designed to help serious traders grow through consistency, transparency, and fair evaluation standards.</p>
              <Link href="/challenges">
                <Button className="mt-8 bg-[#D4AF37] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5D573]">Get Started</Button>
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ scaleX: 0, opacity: 0 }} whileInView={{ scaleX: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }} className="mx-auto mt-16 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
      </div>
    </section>
  );
}
