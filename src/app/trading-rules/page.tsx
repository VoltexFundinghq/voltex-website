"use client";
import { useEffect, useState } from "react";
import { motion, animate, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, Clock3, CalendarClock, CheckCircle2, Plus, Minus, XCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
const coreRules = [
  { value: 20, suffix: "%", title: "Balance-Based Trailing Drawdown", description: "Your maximum drawdown floor is set 20% below your highest CLOSED account balance — that peak only ever moves up when you close a trade at a new high, never from floating profit. But the floor itself is checked against your real-time balance at all times, including any trades still open — so a floating dip that reaches the floor is an immediate breach, even if that same trade would have gone on to recover and close in profit.", bullets: ["Peak only moves up from closed trades — never floating profit", "Your live balance, including open trades, is checked against the floor at all times", "A dip to or below the floor is an immediate breach — even if it would have recovered"], icon: ShieldCheck, featured: true },
  { value: 3, suffix: " Min", title: "Minimum Hold Time", description: "Every position must remain open for at least three minutes. Closing a trade sooner counts as a warning — three warnings are tolerated, but a fourth violation fails your challenge immediately.", bullets: ["Three warnings tolerated before failure", "A fourth violation immediately fails your challenge", "You receive an email alert at your second warning, before it's too late", "Applies across Phase 1, Phase 2, and your funded account"], icon: Clock3, featured: false },
  { value: 5, suffix: " Days", title: "Activity Requirement", description: "Place at least one trade every five calendar days to keep your challenge active.", bullets: ["Stay active", "Simple requirement", "Fair capital allocation"], icon: CalendarClock, featured: false },
];
const faqItems = [
  { q: "Profit Target", a: "You need to grow your account balance by 10% in each phase — Phase 1 and Phase 2 — to pass your evaluation. You trade on the same account for both phases: once you pass Phase 1, your balance simply resets to your original starting amount for Phase 2, so your full trading history stays visible in one place, and there's no new login to learn.", bullets: ["10% target in Phase 1", "10% target in Phase 2", "Same rules apply in both phases", "Same account carries you through both phases — no new login to learn, no history lost"], example: "On a N500,000 account, you need to reach N550,000 to complete each phase." },
  { q: "Maximum Drawdown", a: "This is the only overall risk limit on your account — set at 20%, calculated using our Balance-Based Trailing Drawdown model rather than a fixed, unmoving number.", bullets: ["Set at 20% below your highest closed balance", "Recalculates upward as your balance grows from closed trades", "Checked against your real-time balance, including floating trades still open", "A floating dip to the floor is an immediate breach, even if the trade would have recovered", "This is your only overall limit — there is no separate daily drawdown rule"] },
  { q: "Minimum Trading Days", a: "There's no minimum number of days you must trade.", bullets: ["No minimum required", "Just stay active every 5 days — see the Activity Requirement card above"] },
  { q: "No Time Limits", a: "You can take as long as you like to pass your evaluation.", bullets: ["No maximum time limit", "Applies to both phases", "Just remember the 5-day activity rule"] },
  { q: "Payout Schedule", a: "Payouts are processed within 24 hours once approved, with clear eligibility rules and caps that scale as your account grows. Your funded account stays with you long-term — the same account is used for every payout cycle going forward.", bullets: ["A payout becomes eligible once your profit reaches 10% of your account's starting balance", "Your first payout is capped at 10% of your account's starting balance", "Every payout after that is capped at 50% of your account's starting balance", "Profit above the applicable cap is forfeited, not carried over, before your 80% split is calculated", "Approved payouts are completed within 24 hours", "A 72-hour cooldown applies after each completed payout before you can request the next one", "Your funded account is yours to keep — it isn't replaced after each payout"], example: "On a N500,000 account, your first eligible payout is capped at N50,000. If you've earned N80,000, the N30,000 above the cap is removed before your 80% split is calculated on the remaining N50,000." },
  { q: "News Trading", a: "Trading around high-impact news events is allowed. The only requirement is a short holding period for any trade opened right before a release.", bullets: ["News trading is permitted, with no restriction on when you can enter a trade", "If you open a trade within 4 minutes before a high-impact release, that trade must stay open for at least 4 minutes after the release", "This prevents entering right before a spike and closing the instant it hits, rather than genuinely trading the move"] },
  { q: "Weekend Holding", a: "Weekend trading is available on BTC and ETH, since these markets remain open on Saturdays and Sundays — but no position may be left open across the weekend on any instrument.", bullets: ["Only BTC and ETH can be traded over the weekend", "No position may be held open across the weekend, on any instrument", "Exists to protect you and Voltex Funding from sharp weekend price gaps", "First occurrence: a warning. Second occurrence: a rule breach"] },
  { q: "Expert Advisors (EA)", a: "Yes, you're allowed to use Expert Advisors.", bullets: ["Must follow all trading rules", "Can't be used to exploit latency or bypass drawdown rules"] },
  { q: "Copy Trading", a: "Copy trading is allowed between multiple accounts you personally own, but not between accounts belonging to two different traders.", bullets: ["Allowed across your own multiple accounts", "Not allowed between two different traders' accounts", "Copying between different users is treated as a direct rule breach"] },
  { q: "Prohibited Trading Practices", a: "A few practices are never allowed on any Voltex Funding account:", bullets: ["Arbitrage, including latency arbitrage", "Latency exploitation of any kind", "Platform or execution abuse", "Account sharing or trading for someone else", "Reverse hedging across multiple accounts"] },
];
function Counter({ to, suffix }: { to: number; suffix: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, { duration: 1.4, ease: "easeOut", onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [to]);
  return (<span>{display}{suffix}</span>);
}
function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  e.currentTarget.style.setProperty("--mx", `${x}%`);
  e.currentTarget.style.setProperty("--my", `${y}%`);
}
function RuleCard({ rule }: { rule: (typeof coreRules)[number] }) {
  const Icon = rule.icon;
  return (
    <motion.div whileHover={{ y: -8, scale: 1.02 }} onMouseMove={handleCardMouseMove} className="group relative h-full overflow-hidden rounded-3xl p-[1px]">
      <motion.div className="pointer-events-none absolute -inset-[60%] opacity-0 transition-opacity duration-500 group-hover:opacity-[0.65]" style={{ background: "conic-gradient(from 0deg, transparent 0deg, #F5D573 8deg, transparent 40deg, transparent 360deg)" }} animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} />
      <div className={`relative z-10 h-full overflow-hidden rounded-[calc(1.5rem-1px)] border backdrop-blur-xl transition-colors duration-300 ${rule.featured ? "border-[#D4AF37]/60 bg-[#D4AF37]/[0.05] shadow-[0_0_60px_rgba(212,175,55,.18)]" : "border-[#D4AF37]/20 bg-white/[0.02]"}`}>
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(212,175,55,0.18), transparent 45%)" }} />
        <div className="relative p-6 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 sm:h-16 sm:w-16">
            <Icon className="h-7 w-7 text-[#D4AF37] sm:h-8 sm:w-8" />
          </div>
          <div className="mt-6 sm:mt-8">
            <h3 className="text-5xl font-black leading-none text-[#D4AF37] sm:text-6xl"><Counter to={rule.value} suffix={rule.suffix} /></h3>
            <h4 className="mt-3 text-xl font-bold leading-tight text-white sm:text-2xl">{rule.title}</h4>
          </div>
          <p className="mt-5 text-sm leading-7 text-zinc-400">{rule.description}</p>
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent sm:my-7" />
          <div className="space-y-3">
            {rule.bullets.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D4AF37]" />
                <span className="text-sm text-zinc-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
export default function TradingRulesPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="relative overflow-hidden bg-black pb-8 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">TRADING RULES</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">Trade With Confidence.<br />Transparent Rules.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">Everything you need to know before starting your Voltex Funding Challenge. Our rules are designed to reward disciplined traders—not trap them.</p>
          </div>
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>
      <section className="relative overflow-hidden bg-black pt-8 pb-16 sm:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(212,175,55,.05),transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
          <div className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory -mx-5 px-5 lg:hidden [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {coreRules.map((rule) => (
              <div key={rule.title} className="w-[86%] flex-shrink-0 snap-center sm:w-[420px]">
                <RuleCard rule={rule} />
              </div>
            ))}
          </div>
          <div className="hidden gap-6 lg:grid lg:grid-cols-3">
            {coreRules.map((rule) => (<RuleCard key={rule.title} rule={rule} />))}
          </div>
        </div>
      </section>
      <section className="relative overflow-hidden bg-black py-12 sm:py-16">
        <div className="relative mx-auto max-w-[900px] px-5 sm:px-8">
          <h2 className="text-center text-2xl font-extrabold text-white sm:text-3xl">Trading Rules FAQ</h2>
          <div className="mt-8 space-y-4 sm:mt-10">
            {faqItems.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={item.q} className="overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-white/[0.02] backdrop-blur-xl transition-colors duration-300 hover:border-[#D4AF37]/45">
                  <button onClick={() => setOpenIndex(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6">
                    <span className="text-base font-semibold text-white">{item.q}</span>
                    {isOpen ? <Minus className="h-5 w-5 flex-shrink-0 text-[#D4AF37]" /> : <Plus className="h-5 w-5 flex-shrink-0 text-[#D4AF37]" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                        <div className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
                          <p className="text-sm leading-7 text-zinc-400">{item.a}</p>
                          {item.bullets && (
                            <ul className="space-y-2 pl-1">
                              {item.bullets.map((b) => (
                                <li key={b} className="flex items-start gap-2.5">
                                  {item.q === "Prohibited Trading Practices" ? <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D4AF37]" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D4AF37]" />}
                                  <span className="text-sm leading-6 text-zinc-300">{b}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {item.example && (
                            <div className="rounded-xl border border-[#D4AF37]/20 bg-black/40 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Example</p>
                              <p className="mt-1.5 text-sm leading-6 text-zinc-400">{item.example}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="relative overflow-hidden bg-black py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[32px] border border-[#D4AF37]/25 bg-white/[0.03] px-6 py-10 text-center backdrop-blur-xl sm:rounded-[40px] sm:px-10 sm:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Ready to Start Your Challenge?</h2>
              <p className="mx-auto mt-4 max-w-xl text-zinc-400">Join disciplined traders who trust Voltex Funding's transparent rules and fair evaluation model.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/challenges" className="w-full sm:w-auto"><Button className="w-full bg-[#D4AF37] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5D573] sm:w-auto">Start Your Challenge</Button></Link>
                <Link href="/challenges" className="w-full sm:w-auto"><Button className="w-full border border-[#D4AF37] bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-[#D4AF37] hover:text-black sm:w-auto">View Challenge Programs</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
