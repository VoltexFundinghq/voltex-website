"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Clock3, CalendarClock } from "lucide-react";

export default function CoreRulesDetailed() {
  return (
    <section className="relative overflow-hidden bg-black py-16">
      <div className="relative mx-auto max-w-[1000px] px-8">

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/60 bg-[#D4AF37]/[0.05] p-8 shadow-[0_0_60px_rgba(212,175,55,.18)] md:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10"><ShieldCheck className="h-7 w-7 text-[#D4AF37]" /></div>
            <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#D4AF37]">20% · Signature Feature</span>
          </div>
          <h2 className="mt-6 text-2xl font-extrabold text-white md:text-3xl">Balance-Based Trailing Drawdown</h2>
          <div className="mt-5 space-y-4">
            <p className="text-base leading-7 text-zinc-300">Your maximum drawdown trails your highest CLOSED account balance — not your floating, unrealized equity.</p>
            <p className="text-base leading-7 text-zinc-300">Every time you close a trade that pushes your account to a new highest closed balance, your drawdown threshold recalculates upward from that new balance.</p>
            <p className="text-base leading-7 text-zinc-300">Floating profit on open trades does not move your drawdown line. Only a closed trade that sets a new highest balance updates the threshold.</p>
            <p className="text-base leading-7 text-zinc-300">If your balance falls after that point, your drawdown floor stays fixed at the level set by your last highest closed balance — it does not trail back downward with your balance.</p>
            <p className="text-base leading-7 text-zinc-300">Your live balance, including any trade still open, is checked against this floor at all times — a dip to or below it is an immediate breach, even on a trade that would have gone on to recover.</p>
            <p className="text-base leading-7 text-zinc-300">Here's the real edge: we'll email you the moment you reach 15% down — a genuine heads-up before the actual 20% limit, giving you a real chance to protect your account. Many prop firms just fail you silently; we'd rather you have the chance to course-correct first.</p>
          </div>
          <div className="mt-7 rounded-2xl border border-[#D4AF37]/25 bg-black/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">Worked Example</p>
            <ol className="mt-4 space-y-2.5">
              {["You start with a N500,000 account.", "You close a trade, bringing your balance to a new high of N520,000 — your drawdown threshold recalculates from N520,000.", "You open a new trade showing N530,000 in floating profit. Your drawdown floor does NOT move yet, since it's unrealized.", "You close that trade at N530,000 — a new highest closed balance. The threshold recalculates again.", "Your balance later drops to N510,000. Your drawdown floor stays anchored to the N530,000 closed high, not the current N510,000 balance."].map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-6 text-zinc-400">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[10px] font-bold text-[#D4AF37]">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-8 rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-8 backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10"><Clock3 className="h-7 w-7 text-[#D4AF37]" /></div>
          <h2 className="mt-6 text-2xl font-extrabold text-white">3 Minute Minimum Hold Time</h2>
          <div className="mt-4 space-y-3">
            <p className="text-base leading-7 text-zinc-300">Every position you open must remain open for at least three minutes before it can be closed. This applies across Phase 1, Phase 2, and your funded account.</p>
            <p className="text-base leading-7 text-zinc-300">This rule exists to discourage latency arbitrage and ultra-fast execution strategies that exploit tiny price-feed delays rather than genuine market analysis — the kind of activity that has nothing to do with actual trading skill.</p>
            <p className="text-base leading-7 text-zinc-300">Closing a position before the three-minute mark may flag that trade as a rule violation, so build this into your strategy from the start rather than treating it as an afterthought.</p>
            <p className="text-base leading-7 text-zinc-300">Up to 4 warnings are recorded for this rule — reach a 4th violation, and your challenge is breached.</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }} className="mt-8 rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-8 backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10"><CalendarClock className="h-7 w-7 text-[#D4AF37]" /></div>
          <h2 className="mt-6 text-2xl font-extrabold text-white">5-Day Activity Requirement</h2>
          <div className="mt-4 space-y-3">
            <p className="text-base leading-7 text-zinc-300">Your account must remain active. Place at least one trade every 5 consecutive calendar days to keep your evaluation or funded account in good standing.</p>
            <p className="text-base leading-7 text-zinc-300">This exists to ensure evaluation and funded capital is allocated to traders who are genuinely active and committed, rather than accounts sitting idle indefinitely.</p>
            <p className="text-base leading-7 text-zinc-300">If 5 consecutive calendar days pass without a trade, the inactivity rule is triggered and your account status may be affected. If you're planning an extended break from trading, contact support beforehand.</p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
