import Link from "next/link";
import { Percent, Target, ShieldAlert, MonitorSmartphone, Clock } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { CHALLENGE_PRODUCTS, CHALLENGE_RULES } from "@/lib/config/challenges";
import { initiateChallengeCheckout } from "@/lib/services/purchases/checkout";
import type { ChallengeProduct } from "@/lib/types/challenge";

const stats = [
  { icon: Percent, label: "Profit Split", value: `${CHALLENGE_RULES.profit_split_percent}%` },
  { icon: Target, label: "Profit Target", value: `${CHALLENGE_RULES.profit_target_percent}%` },
  { icon: ShieldAlert, label: "Max Drawdown", value: `${CHALLENGE_RULES.max_drawdown_percent}%` },
  { icon: MonitorSmartphone, label: "Platform", value: CHALLENGE_RULES.platform },
];

function ChallengeCard({ challenge }: { challenge: ChallengeProduct }) {
  const comingSoon = challenge.status === "coming_soon" || challenge.challenge_fee === null;
  const buyAction = initiateChallengeCheckout.bind(null, challenge.id);

  return (
    <div className={`group relative flex h-full flex-col rounded-3xl border p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 sm:p-6 ${challenge.is_popular ? "border-[#D4AF37]/50 bg-[#D4AF37]/[0.05] shadow-[0_0_50px_rgba(212,175,55,0.15)] hover:border-[#D4AF37]/70 hover:shadow-[0_25px_70px_rgba(212,175,55,0.25)]" : "border-[#D4AF37]/15 bg-white/[0.02] hover:border-[#D4AF37]/50 hover:bg-white/[0.04] hover:shadow-[0_20px_60px_rgba(212,175,55,0.15)]"} ${comingSoon ? "opacity-80" : ""}`}>
      {challenge.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4AF37] px-4 py-1 text-[11px] font-bold tracking-wide text-black shadow-lg">
          MOST POPULAR
        </div>
      )}
      <p className="text-xs text-zinc-500">Account Size</p>
      <p className="mt-1 text-2xl font-bold text-white">N{challenge.account_size.toLocaleString()}</p>
      <div className="my-4 h-px bg-[#D4AF37]/10 sm:my-5" />
      {comingSoon ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/15 bg-white/[0.02] px-4 py-4 text-sm font-semibold text-zinc-400">
          <Clock className="h-4 w-4 text-[#D4AF37]" />
          Coming Soon
        </div>
      ) : (
        <div>
          <p className="text-xs text-zinc-500">Challenge Fee</p>
          <p className="mt-1 text-2xl font-extrabold text-[#D4AF37] sm:text-3xl">N{challenge.challenge_fee!.toLocaleString()}</p>
        </div>
      )}
      <div className="my-4 h-px bg-[#D4AF37]/10 sm:my-5" />
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
      {comingSoon ? (
        <button disabled className="mt-6 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.02] py-3 text-sm font-semibold text-zinc-500">
          Coming Soon
        </button>
      ) : (
        <form action={buyAction}>
          <Button type="submit" className="mt-6 w-full bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573]">Buy Challenge</Button>
        </form>
      )}
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">CHALLENGE PROGRAMS</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">Choose Your Challenge, Start Your Journey.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">Every Voltex Funding challenge follows the same transparent two-phase evaluation, the same fair rules, and the same 80% profit split — pick the account size that matches your ambition.</p>
          </div>
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">

          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-5 px-5 sm:hidden [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {CHALLENGE_PRODUCTS.map((challenge) => (
              <div key={challenge.id} className="w-[82%] flex-shrink-0 snap-center">
                <ChallengeCard challenge={challenge} />
              </div>
            ))}
          </div>

          <div className="hidden sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {CHALLENGE_PRODUCTS.map((challenge) => (<ChallengeCard key={challenge.id} challenge={challenge} />))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[32px] border border-[#D4AF37]/25 bg-white/[0.03] px-6 py-10 text-center backdrop-blur-xl sm:rounded-[40px] sm:px-10 sm:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Not Sure Which Challenge Is Right for You?</h2>
              <p className="mx-auto mt-4 max-w-xl text-zinc-400">Review our full trading rules before you begin, or reach out to our support team if you have any questions.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/trading-rules" className="w-full sm:w-auto"><Button className="w-full bg-[#D4AF37] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5D573] sm:w-auto">View Trading Rules</Button></Link>
                <Link href="/contact" className="w-full sm:w-auto"><Button className="w-full border border-[#D4AF37] bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-[#D4AF37] hover:text-black sm:w-auto">Contact Support</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
