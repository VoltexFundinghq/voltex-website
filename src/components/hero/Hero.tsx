import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Banknote, ShieldCheck, Clock, Headphones, Lock, User } from "lucide-react";

const features = [
  {
    icon: Banknote,
    eyebrow: "UP TO",
    title: "₦3,000,000",
    subtitle: "Simulated Funding",
  },
  {
    icon: ShieldCheck,
    eyebrow: "UP TO",
    title: "90%",
    subtitle: "Profit Split",
  },
  {
    icon: Clock,
    eyebrow: "FAST",
    title: "Payouts",
    subtitle: "Within 24 Hours",
  },
  {
    icon: Headphones,
    eyebrow: "24/7",
    title: "Trader Support",
    subtitle: "We're Here for You",
  },
  {
    icon: Lock,
    eyebrow: "FAIR & TRANSPARENT",
    title: "Rules",
    subtitle: "No Hidden Terms",
  },
];

const avatarColors = ["bg-amber-700", "bg-rose-700", "bg-emerald-700", "bg-sky-700"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(212,175,55,.18),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(212,175,55,.08),transparent_35%)]"></div>

      {/* Background candlestick silhouettes */}
      <svg
        className="pointer-events-none absolute -left-16 bottom-0 h-[440px] w-[560px] opacity-[0.15]"
        viewBox="0 0 560 440"
        fill="none"
      >
        <line x1="40" y1="260" x2="40" y2="360" stroke="#D4AF37" strokeWidth="2" />
        <rect x="28" y="280" width="24" height="60" fill="#D4AF37" />

        <line x1="100" y1="220" x2="100" y2="330" stroke="#D4AF37" strokeWidth="2" />
        <rect x="88" y="240" width="24" height="70" fill="#D4AF37" />

        <line x1="160" y1="180" x2="160" y2="300" stroke="#D4AF37" strokeWidth="2" />
        <rect x="148" y="200" width="24" height="55" fill="#D4AF37" />

        <line x1="220" y1="150" x2="220" y2="270" stroke="#D4AF37" strokeWidth="2" />
        <rect x="208" y="165" width="24" height="80" fill="#D4AF37" />

        <line x1="280" y1="100" x2="280" y2="230" stroke="#D4AF37" strokeWidth="2" />
        <rect x="268" y="120" width="24" height="65" fill="#D4AF37" />

        <line x1="340" y1="70" x2="340" y2="190" stroke="#D4AF37" strokeWidth="2" />
        <rect x="328" y="90" width="24" height="75" fill="#D4AF37" />

        <line x1="400" y1="30" x2="400" y2="150" stroke="#D4AF37" strokeWidth="2" />
        <rect x="388" y="50" width="24" height="60" fill="#D4AF37" />

        <line x1="460" y1="0" x2="460" y2="110" stroke="#D4AF37" strokeWidth="2" />
        <rect x="448" y="15" width="24" height="70" fill="#D4AF37" />
      </svg>

      {/* Faint curved golden light streaks */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
        viewBox="0 0 1600 900"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="heroStreakA" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="1" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M-100,700 C300,600 500,400 800,350 C1100,300 1300,150 1700,50"
          stroke="url(#heroStreakA)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M-100,800 C350,720 550,500 900,430"
          stroke="url(#heroStreakA)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-12 px-8 py-10">

        <div className="max-w-xl">

          <div className="mb-5 inline-flex rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2 text-sm text-[#D4AF37]">
            🇳🇬 Nigerian Prop Trading Firm
          </div>

          <h1 className="mb-5 text-5xl font-extrabold leading-tight">
            TRADE BIGGER,
            <br />
            KEEP MORE,
            <br />
            <span className="text-[#D4AF37]">
              SCALE FASTER
            </span>
          </h1>

          <p className="mb-5 text-base leading-7 text-zinc-400">
            Voltex Funding empowers traders with up to{" "}
            <span className="font-semibold text-[#D4AF37]">
              ₦3,000,000
            </span>{" "}
            in simulated funding and industry-leading trading conditions—giving you the capital and confidence to scale your trading career.
          </p>

          <div className="flex gap-4">

            <Button className="bg-[#D4AF37] px-7 py-3.5 text-base text-black hover:bg-[#F5D573]">
              Start Challenge
            </Button>

            <Button className="border border-[#D4AF37] bg-transparent px-7 py-3.5 text-base text-white hover:bg-[#D4AF37] hover:text-black">
              View Pricing
            </Button>

          </div>

          {/* Social proof */}
          <div className="mt-7 flex items-center gap-4">
            <div className="flex -space-x-3">
              {avatarColors.map((bg, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0a0a0a] ${bg}`}
                >
                  <User className="h-4 w-4 text-white/80" />
                </div>
              ))}
            </div>

            <p className="text-sm text-zinc-400">
              Trusted by 2,500+ traders
            </p>
          </div>

        </div>

        {/* Dashboard image */}
        <div className="relative h-[440px] w-[460px] flex-shrink-0">

          <div className="absolute -inset-16 rounded-[64px] bg-[#D4AF37]/25 blur-[130px]" />
          <div className="absolute -inset-6 rounded-[48px] bg-[#D4AF37]/30 blur-[80px]" />

          <svg
            className="pointer-events-none absolute -inset-24 h-[calc(100%+12rem)] w-[calc(100%+12rem)] overflow-visible"
            viewBox="0 0 900 900"
            fill="none"
          >
            <defs>
              <linearGradient id="dashStreak" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
                <stop offset="45%" stopColor="#D4AF37" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#F5D573" stopOpacity="0" />
              </linearGradient>
              <filter id="dashStreakBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>
            <path
              d="M80,820 C300,650 350,450 500,320 C610,220 680,140 810,60"
              stroke="url(#dashStreak)"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#dashStreakBlur)"
            />
          </svg>

          <div className="absolute inset-0 origin-center rotate-[7deg] overflow-hidden rounded-[38px] border-2 border-[#D4AF37]/40 shadow-[0_40px_120px_rgba(0,0,0,.65),0_0_90px_rgba(212,175,55,.25)]">
            <Image
              src="/dashboard-preview.png"
              alt="Voltex Funding dashboard preview"
              fill
              className="object-cover"
              priority
            />
          </div>

        </div>

      </div>

      {/* Feature strip */}
      <div className="relative mx-auto max-w-7xl border-t border-[#D4AF37]/10 px-8 py-7">
        <div className="grid grid-cols-1 divide-y divide-[#D4AF37]/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
          {features.map(({ icon: Icon, eyebrow, title, subtitle }) => (
            <div
              key={subtitle}
              className="flex items-center gap-4 px-5 py-5 first:pl-0 last:pr-0"
            >
              <Icon className="h-9 w-9 flex-shrink-0 text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]" />

              <div>
                <p className="text-xs font-semibold tracking-wide text-[#D4AF37]">
                  {eyebrow}
                </p>
                <p className="mt-0.5 text-base font-bold text-white">
                  {title}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}