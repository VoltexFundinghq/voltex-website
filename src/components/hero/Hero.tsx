import { Button } from "@/components/ui/button";
import { Banknote, ShieldCheck, Clock, Headphones, Lock } from "lucide-react";

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

export default function Hero() {
  return (
    <section className="relative overflow-hidden">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(212,175,55,.18),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(212,175,55,.08),transparent_35%)]"></div>

      {/* Background candlestick staircase */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
        viewBox="0 0 1600 900"
        fill="none"
        preserveAspectRatio="none"
      >
        <line x1="60" y1="760" x2="60" y2="860" stroke="#D4AF37" strokeWidth="2" />
        <rect x="48" y="780" width="24" height="60" fill="#D4AF37" />

        <line x1="140" y1="700" x2="140" y2="820" stroke="#D4AF37" strokeWidth="2" />
        <rect x="128" y="720" width="24" height="70" fill="#D4AF37" />

        <line x1="220" y1="620" x2="220" y2="760" stroke="#D4AF37" strokeWidth="2" />
        <rect x="208" y="650" width="24" height="70" fill="#D4AF37" />

        <line x1="300" y1="560" x2="300" y2="700" stroke="#D4AF37" strokeWidth="2" />
        <rect x="288" y="580" width="24" height="80" fill="#D4AF37" />

        <line x1="380" y1="480" x2="380" y2="620" stroke="#D4AF37" strokeWidth="2" />
        <rect x="368" y="510" width="24" height="70" fill="#D4AF37" />

        <line x1="460" y1="400" x2="460" y2="540" stroke="#D4AF37" strokeWidth="2" />
        <rect x="448" y="430" width="24" height="70" fill="#D4AF37" />

        <line x1="540" y1="320" x2="540" y2="460" stroke="#D4AF37" strokeWidth="2" />
        <rect x="528" y="350" width="24" height="70" fill="#D4AF37" />

        <line x1="620" y1="240" x2="620" y2="380" stroke="#D4AF37" strokeWidth="2" />
        <rect x="608" y="270" width="24" height="70" fill="#D4AF37" />

        <line x1="700" y1="180" x2="700" y2="300" stroke="#D4AF37" strokeWidth="2" />
        <rect x="688" y="210" width="24" height="60" fill="#D4AF37" />
      </svg>

      <div className="relative mx-auto flex max-w-[1440px] min-h-[600px] items-stretch justify-between gap-12 px-8 py-10">

        <div className="max-w-xl">

          <div className="mb-5 inline-flex rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2 text-base text-[#D4AF37]">
            🇳🇬 Nigerian Prop Trading Firm
          </div>

          <h1 className="mb-5 text-6xl font-extrabold leading-tight">
            TRADE BIGGER,
            <br />
            KEEP MORE,
            <br />
            <span className="text-[#D4AF37]">
              SCALE FASTER
            </span>
          </h1>

          <p className="mb-5 text-lg leading-8 text-zinc-400">
            Voltex Funding empowers traders with up to{" "}
            <span className="font-semibold text-[#D4AF37]">
              ₦3,000,000
            </span>{" "}
            in simulated funding and industry-leading trading conditions—giving you the capital and confidence to scale your trading career.
          </p>

          <div className="flex gap-4">

            <Button className="bg-[#D4AF37] px-8 py-4 text-lg text-black hover:bg-[#F5D573]">
              Start Challenge
            </Button>

            <Button className="border border-[#D4AF37] bg-transparent px-8 py-4 text-lg text-white hover:bg-[#D4AF37] hover:text-black">
              View Pricing
            </Button>

          </div>

        </div>

        {/* Dashboard image — frame hugs the image's actual rendered size */}
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dashboard-preview.png"
              alt="Voltex Funding dashboard preview"
              className="h-full w-auto max-w-full rounded-[38px] border-2 border-[#D4AF37]/40 shadow-[0_40px_120px_rgba(0,0,0,.65)]"
            />
          </div>
        </div>

      </div>

      {/* Feature strip */}
      <div className="relative mx-auto max-w-[1440px] border-t border-[#D4AF37]/10 px-8 py-7">
        <div className="grid grid-cols-1 divide-y divide-[#D4AF37]/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
          {features.map(({ icon: Icon, eyebrow, title, subtitle }) => (
            <div
              key={subtitle}
              className="flex items-center gap-4 px-5 py-5 first:pl-0 last:pr-0"
            >
              <Icon className="h-10 w-10 flex-shrink-0 text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]" />

              <div>
                <p className="text-sm font-semibold tracking-wide text-[#D4AF37]">
                  {eyebrow}
                </p>
                <p className="mt-0.5 text-lg font-bold text-white">
                  {title}
                </p>
                <p className="mt-0.5 text-base text-zinc-500">
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