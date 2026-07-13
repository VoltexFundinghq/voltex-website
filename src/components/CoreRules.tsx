"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import {
  ShieldCheck,
  Clock3,
  CalendarClock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const rules = [
  {
    value: 20,
    suffix: "%",
    title: "Balance-Based Trailing Drawdown",
    description:
      "Your drawdown trails only after a new balance high. Once it reaches your starting balance, it locks permanently.",
    bullets: [
      "Locks permanently at start balance",
      "Balance-based trailing model",
      "Rewards disciplined growth",
    ],
    icon: ShieldCheck,
    featured: true,
  },
  {
    value: 3,
    suffix: " Min",
    title: "Minimum Hold Time",
    description:
      "Every position must stay open for at least three minutes to discourage latency arbitrage and encourage genuine execution.",
    bullets: [
      "Prevents latency abuse",
      "Encourages genuine execution",
      "Promotes trading discipline",
    ],
    icon: Clock3,
    featured: false,
  },
  {
    value: 5,
    suffix: " Days",
    title: "Activity Requirement",
    description:
      "Place at least one trade every five calendar days to keep your challenge active.",
    bullets: [
      "Stay active",
      "Simple requirement",
      "Fair capital allocation",
    ],
    icon: CalendarClock,
    featured: false,
  },
];

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [isInView, to]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  e.currentTarget.style.setProperty("--mx", `${x}%`);
  e.currentTarget.style.setProperty("--my", `${y}%`);
}

export default function CoreRules() {
  return (
    <section className="relative overflow-hidden bg-black pt-20 pb-32">

      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(212,175,55,.05),transparent_45%)]" />

      <div className="relative mx-auto max-w-7xl px-6">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-8 max-w-3xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">
            CORE TRADING RULES
          </p>

          <h2 className="mt-4 text-4xl font-extrabold text-white md:text-5xl">
            Trade Smarter.
            <span className="text-[#D4AF37]"> Trade Professionally.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-zinc-400">
            Transparent rules designed to reward disciplined traders,
            not to trap them.
          </p>
        </motion.div>

        {/* Animated divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mb-12 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
        />

        {/* Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {rules.map((rule, index) => {
            const Icon = rule.icon;

            return (
              <motion.div
                key={rule.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.15,
                }}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                }}
                onMouseMove={handleCardMouseMove}
                className="group relative overflow-hidden rounded-3xl p-[1px]"
              >
                {/* Rotating gold border light — hover only */}
                <motion.div
                  className="pointer-events-none absolute -inset-[60%] opacity-0 transition-opacity duration-500 group-hover:opacity-[0.65]"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, #F5D573 8deg, transparent 40deg, transparent 360deg)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                />

                {/* Card body */}
                <div
                  className={`relative z-10 h-full overflow-hidden rounded-[calc(1.5rem-1px)] border backdrop-blur-xl transition-colors duration-300 ${
                    rule.featured
                      ? "border-[#D4AF37]/60 bg-[#D4AF37]/[0.05] shadow-[0_0_60px_rgba(212,175,55,.18)]"
                      : "border-[#D4AF37]/20 bg-white/[0.02]"
                  }`}
                >
                  {/* Mouse-follow glow */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(212,175,55,0.18), transparent 45%)",
                    }}
                  />

                  {/* Corner glow */}
                  <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                    <div className="absolute -right-24 -top-24 h-52 w-52 rounded-full bg-[#D4AF37]/10 blur-3xl" />
                  </div>

                  <div className="relative p-8">

                    {/* Icon */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10">
                      <Icon className="h-8 w-8 text-[#D4AF37]" />
                    </div>

                    {/* Big Number */}
                    <div className="mt-8">
                      <h3 className="text-6xl font-black leading-none text-[#D4AF37]">
                        <Counter to={rule.value} suffix={rule.suffix} />
                      </h3>
                      <h4 className="mt-3 text-2xl font-bold leading-tight text-white">
                        {rule.title}
                      </h4>
                    </div>

                    {/* Description */}
                    <p className="mt-5 text-sm leading-7 text-zinc-400">
                      {rule.description}
                    </p>

                    {/* Divider */}
                    <div className="my-7 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

                    {/* Bullet List */}
                    <div className="space-y-3">
                      {rule.bullets.map((item) => (
                        <div key={item} className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-[#D4AF37]" />
                          <span className="text-sm text-zinc-300">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA — bridge into the Rules page */}
        <div className="relative mx-auto mt-20 max-w-4xl">
          <div className="absolute -inset-8 rounded-[56px] bg-[#D4AF37]/10 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="relative overflow-hidden rounded-[40px] border border-[#D4AF37]/25 bg-white/[0.03] p-10 text-center backdrop-blur-xl"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_70%)]" />

            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">
                COMPLETE RULEBOOK
              </p>

              <h3 className="mt-4 text-3xl font-extrabold text-white">
                Simple Rules. <span className="text-[#D4AF37]">Transparent Trading.</span>
              </h3>

              <p className="mx-auto mt-5 max-w-2xl text-zinc-400">
                Every rule is built to protect firm capital while giving
                disciplined traders the best opportunity to succeed.
              </p>

              <button className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-[#D4AF37] bg-[#D4AF37]/10 px-8 py-4 text-sm font-bold text-[#D4AF37] transition-all duration-300 hover:bg-[#D4AF37] hover:text-black">
                View Complete Rules
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        </div>

      </div>

    </section>
  );
}
