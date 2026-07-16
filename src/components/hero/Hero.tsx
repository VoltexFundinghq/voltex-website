import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Banknote, ShieldCheck, Clock, Headphones, Lock } from "lucide-react";

const features = [
  { icon: Banknote, eyebrow: "UP TO", title: "N3,000,000", subtitle: "Simulated Funding" },
  { icon: ShieldCheck, eyebrow: "UP TO", title: "80%", subtitle: "Profit Split" },
  { icon: Clock, eyebrow: "FAST", title: "Payouts", subtitle: "Within 24 Hours" },
  { icon: Headphones, eyebrow: "24/7", title: "Trader Support", subtitle: "We're Here for You" },
  { icon: Lock, eyebrow: "FAIR & TRANSPARENT", title: "Rules", subtitle: "No Hidden Terms" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(212,175,55,.18),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(212,175,55,.08),transparent_35%)]"></div>

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-10 px-8 py-10 lg:min-h-[600px] lg:flex-row lg:items-stretch lg:justify-between lg:gap-12">
        <div className="max-w-xl">
          <div className="mb-5 inline-flex rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2 text-base text-[#D4AF37]">
            🇳🇬 Nigerian Prop Trading Firm
          </div>
          <h1 className="mb-5 text-5xl font-extrabold leading-tight sm:text-6xl">
            TRADE BIGGER,<br />KEEP MORE,<br />
            <span className="text-[#D4AF37]">SCALE FASTER</span>
          </h1>
          <p className="mb-5 text-lg leading-8 text-zinc-400">
            Voltex Funding empowers traders with up to{" "}
            <span className="font-semibold text-[#D4AF37]">N3,000,000</span>{" "}
            in simulated funding and industry-leading trading conditions—giving you the capital and confidence to scale your trading career.
          </p>
          <div className="flex flex-nowrap gap-3 sm:gap-4">
            <Link href="/challenges" className="flex-1 sm:flex-none">
              <Button className="w-full whitespace-nowrap bg-[#D4AF37] px-4 py-3 text-sm text-black hover:bg-[#F5D573] sm:w-auto sm:px-8 sm:py-4 sm:text-lg">Start Challenge</Button>
            </Link>
            <Link href="/challenges" className="flex-1 sm:flex-none">
              <Button className="w-full whitespace-nowrap border border-[#D4AF37] bg-transparent px-4 py-3 text-sm text-white hover:bg-[#D4AF37] hover:text-black sm:w-auto sm:px-8 sm:py-4 sm:text-lg">View Challenges</Button>
            </Link>
          </div>
        </div>

        {/* Mobile/tablet: scales proportionally to full width, height follows naturally, zero distortion */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dashboard-preview.png" alt="Voltex Funding dashboard preview" className="h-auto w-full rounded-[28px] border-2 border-[#D4AF37]/40 shadow-[0_40px_120px_rgba(0,0,0,.65)] lg:hidden" />

        {/* Desktop: fixed-height, fits the row exactly as before */}
        <div className="relative hidden lg:block lg:min-w-0 lg:flex-1">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dashboard-preview.png" alt="Voltex Funding dashboard preview" className="h-full w-auto max-w-full rounded-[38px] border-2 border-[#D4AF37]/40 shadow-[0_40px_120px_rgba(0,0,0,.65)]" />
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1440px] border-t border-[#D4AF37]/10 px-8 py-7">

        {/* Phone: auto-scrolling ticker, no cards, no manual swipe */}
        <div className="relative overflow-hidden sm:hidden" style={{ WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)", maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
          <div className="flex w-max animate-[voltex-marquee_22s_linear_infinite]">
            {[...features, ...features].map(({ icon: Icon, eyebrow, title, subtitle }, i) => (
              <div key={i} className="flex flex-shrink-0 items-center gap-3 pr-10">
                <Icon className="h-9 w-9 flex-shrink-0 text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]" />
                <div>
                  <p className="text-xs font-semibold tracking-wide text-[#D4AF37]">{eyebrow}</p>
                  <p className="mt-0.5 text-base font-bold text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes voltex-marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>

        {/* Tablet/Desktop: existing divided strip, unchanged */}
        <div className="hidden sm:grid sm:grid-cols-2 sm:divide-x sm:divide-[#D4AF37]/10 lg:grid-cols-5">
          {features.map(({ icon: Icon, eyebrow, title, subtitle }) => (
            <div key={subtitle} className="flex items-center gap-4 px-5 py-5 first:pl-0 last:pr-0">
              <Icon className="h-10 w-10 flex-shrink-0 text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]" />
              <div>
                <p className="text-sm font-semibold tracking-wide text-[#D4AF37]">{eyebrow}</p>
                <p className="mt-0.5 text-lg font-bold text-white">{title}</p>
                <p className="mt-0.5 text-base text-zinc-500">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
