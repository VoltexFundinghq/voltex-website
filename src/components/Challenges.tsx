import { Button } from "@/components/ui/button";
import {
  Percent,
  TrendingDown,
  ShieldAlert,
  MonitorSmartphone,
  Clock,
} from "lucide-react";

const challenges = [
  { size: "₦200,000", fee: "₦8,900", comingSoon: false },
  { size: "₦300,000", fee: "₦13,900", comingSoon: false },
  { size: "₦500,000", fee: "₦22,900", comingSoon: false, popular: true },
  { size: "₦700,000", fee: "₦27,900", comingSoon: false },
  { size: "₦800,000", fee: "₦34,900", comingSoon: false },
  { size: "₦1,000,000", fee: null, comingSoon: true },
  { size: "₦2,000,000", fee: null, comingSoon: true },
  { size: "₦3,000,000", fee: null, comingSoon: true },
];

const stats = [
  { icon: Percent, label: "Profit Split", value: "90%" },
  { icon: TrendingDown, label: "Daily Drawdown", value: "10%" },
  { icon: ShieldAlert, label: "Max Drawdown", value: "20%" },
  { icon: MonitorSmartphone, label: "Platform", value: "MT5" },
];

export default function Challenges() {
  return (
    <section className="relative overflow-hidden bg-black py-24">

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_50%)]" />

      <div className="relative mx-auto max-w-[1440px] px-8">

        {/* Section heading */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-5xl font-extrabold text-white">
            Choose Your <span className="text-[#D4AF37]">Challenge</span>
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Pick the account size that matches your ambition — same fair rules, same 90% profit split, every tier.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {challenges.map((challenge) => (
            <div
              key={challenge.size}
              className={`group relative flex flex-col rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 ${
                challenge.popular
                  ? "border-[#D4AF37]/50 bg-[#D4AF37]/[0.05] shadow-[0_0_50px_rgba(212,175,55,0.15)] hover:border-[#D4AF37]/70 hover:shadow-[0_25px_70px_rgba(212,175,55,0.25)]"
                  : "border-[#D4AF37]/15 bg-white/[0.02] hover:border-[#D4AF37]/50 hover:bg-white/[0.04] hover:shadow-[0_20px_60px_rgba(212,175,55,0.15)]"
              } ${challenge.comingSoon ? "opacity-80" : ""}`}
            >

              {challenge.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4AF37] px-4 py-1 text-[11px] font-bold tracking-wide text-black shadow-lg">
                  MOST POPULAR
                </div>
              )}

              {/* Account size */}
              <p className="text-xs text-zinc-500">Account Size</p>
              <p className="mt-1 text-2xl font-bold text-white">{challenge.size}</p>

              <div className="my-5 h-px bg-[#D4AF37]/10" />

              {/* Fee or coming soon */}
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

              {/* Stats */}
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

              {/* CTA */}
              {challenge.comingSoon ? (
                <button
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.02] py-3 text-sm font-semibold text-zinc-500"
                >
                  Coming Soon
                </button>
              ) : (
                <Button className="mt-6 w-full bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573]">
                  Buy Challenge
                </Button>
              )}

            </div>
          ))}
        </div>

      </div>

    </section>
  );
}
