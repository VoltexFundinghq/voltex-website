"use client";

import Link from "next/link";
import { ShieldCheck, Eye, Users, Target } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const values = [
  { icon: Eye, title: "Transparency", body: "Every rule, drawdown limit, and payout condition is disclosed upfront — no hidden clauses, no fine print designed to work against you." },
  { icon: ShieldCheck, title: "Fair Evaluation", body: "Our rules are built to identify genuine trading skill and discipline, not to trip traders up with arbitrary or unreasonable conditions." },
  { icon: Target, title: "Discipline Over Luck", body: "Our Balance-Based Trailing Drawdown and profit-split model are designed to reward consistent, risk-managed trading rather than one lucky trade." },
  { icon: Users, title: "Built for Nigeria", body: "From Naira-based pricing to local payment support, Voltex Funding is built around the needs of Nigerian traders first." },
];

function ValueCard({ v }: { v: (typeof values)[number] }) {
  const Icon = v.icon;
  return (
    <div className="flex h-full flex-col items-center rounded-2xl border border-[#D4AF37]/20 bg-white/[0.02] p-6 text-center backdrop-blur-xl transition-colors duration-300 hover:border-[#D4AF37]/50 sm:p-7">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10">
        <Icon className="h-5 w-5 text-[#D4AF37]" />
      </div>
      <h3 className="mt-4 text-base font-bold text-white">{v.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{v.body}</p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">ABOUT US</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">Built for Traders Who Take Their Craft Seriously.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">
              Voltex Funding is a Nigerian prop trading firm built on one idea: disciplined traders deserve a fair, transparent path to funded capital — without gimmicks, hidden rules, or unreasonable conditions.
            </p>
          </div>
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-10 sm:py-12">
        <div className="relative mx-auto max-w-[900px] px-5 text-center sm:px-8">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl md:text-3xl">Our Mission</h2>
          <div className="mt-5 space-y-4">
            <p className="text-base leading-7 text-zinc-400">
              We started Voltex Funding because too many trading challenges are built to fail traders rather than fund them — vague rules, drawdown models that punish good trading, and profit splits buried in fine print.
            </p>
            <p className="text-base leading-7 text-zinc-400">
              Our evaluation model is different. Every rule is published before you ever purchase a challenge. Our Balance-Based Trailing Drawdown rewards traders who grow their account consistently, rather than punishing them the moment floating profit dips. And when you pass, you keep 80% of what you earn — plain and simple.
            </p>
            <p className="text-base leading-7 text-zinc-400">
              We're a Nigerian company, built for Nigerian traders, and we intend to earn your trust one transparent rule at a time.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.06),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
          <h2 className="text-center text-xl font-extrabold text-white sm:text-2xl md:text-3xl">What We Stand For</h2>

          <div className="mt-8 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-5 px-5 sm:hidden [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {values.map((v) => (
              <div key={v.title} className="w-[78%] flex-shrink-0 snap-center">
                <ValueCard v={v} />
              </div>
            ))}
          </div>

          <div className="mt-8 hidden sm:mt-10 sm:grid sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {values.map((v) => (<ValueCard key={v.title} v={v} />))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[32px] border border-[#D4AF37]/25 bg-white/[0.03] px-6 py-10 text-center backdrop-blur-xl sm:rounded-[40px] sm:px-10 sm:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Ready to Prove Your Consistency?</h2>
              <p className="mx-auto mt-4 max-w-xl text-zinc-400">Join disciplined traders who trust Voltex Funding's transparent rules and fair evaluation model.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/challenges" className="w-full sm:w-auto"><Button className="w-full bg-[#D4AF37] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5D573] sm:w-auto">Start Your Challenge</Button></Link>
                <Link href="/trading-rules" className="w-full sm:w-auto"><Button className="w-full border border-[#D4AF37] bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-[#D4AF37] hover:text-black sm:w-auto">View Trading Rules</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
