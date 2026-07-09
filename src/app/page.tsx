import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* ================= NAVBAR ================= */}

      <header className="sticky top-0 z-50 border-b border-[#D4AF37]/20 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">

          {/* Logo */}

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4AF37] text-3xl font-black text-black">
              ⚡
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-wide">
                VOLTEX
              </h1>

              <p className="-mt-1 text-xs tracking-[0.4em] text-[#D4AF37]">
                FUNDING
              </p>
            </div>

          </div>

          {/* Navigation */}

          <nav className="hidden items-center gap-10 md:flex">

            <a className="text-[#D4AF37]" href="#">
              Home
            </a>

            <a
              className="transition hover:text-[#D4AF37]"
              href="#"
            >
              Challenges
            </a>

            <a
              className="transition hover:text-[#D4AF37]"
              href="#"
            >
              Pricing
            </a>

            <a
              className="transition hover:text-[#D4AF37]"
              href="#"
            >
              Rules
            </a>

            <a
              className="transition hover:text-[#D4AF37]"
              href="#"
            >
              FAQ
            </a>

          </nav>

          {/* Right Side */}

          <div className="flex items-center gap-4">

            <Button
              variant="ghost"
              className="text-white hover:bg-transparent hover:text-[#D4AF37]"
            >
              Login
            </Button>

            <Button className="bg-[#D4AF37] px-6 text-black hover:bg-yellow-400">
              Start Challenge
            </Button>

          </div>

        </div>
      </header>

      {/* ================= HERO ================= */}

      <section className="mx-auto flex max-w-7xl items-center justify-between gap-20 px-8 py-24">

        {/* Left */}

        <div className="max-w-xl">

          <div className="mb-8 inline-flex rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2 text-sm text-[#D4AF37]">
            🇳🇬 Nigerian Prop Trading Firm
          </div>

          <h2 className="mb-8 text-6xl font-extrabold leading-tight">

            TRADE BIGGER,

            <br />

            KEEP MORE,

            <br />

            <span className="text-[#D4AF37]">
              SCALE FASTER
            </span>

          </h2>

          <p className="mb-10 text-xl leading-9 text-zinc-400">

            Voltex Funding empowers traders with up to{" "}

            <span className="font-semibold text-[#D4AF37]">
              ₦3,000,000
            </span>

            {" "}in simulated funding and industry-leading trading
            conditions—giving you the capital and confidence to scale
            your trading career.

          </p>

          <div className="flex gap-5">

            <Button className="bg-[#D4AF37] px-8 py-6 text-lg text-black hover:bg-yellow-400">
              Start Challenge
            </Button>

            <Button
              className="border border-[#D4AF37] bg-transparent px-8 py-6 text-lg text-white hover:bg-[#D4AF37] hover:text-black"
            >
              View Pricing
            </Button>

          </div>

          <div className="mt-10 flex items-center gap-4">

            <div className="flex -space-x-3">

              <div className="h-12 w-12 rounded-full border-2 border-black bg-zinc-700"></div>

              <div className="h-12 w-12 rounded-full border-2 border-black bg-zinc-600"></div>

              <div className="h-12 w-12 rounded-full border-2 border-black bg-zinc-500"></div>

              <div className="h-12 w-12 rounded-full border-2 border-black bg-zinc-400"></div>

            </div>

            <div>

              <div className="text-yellow-400">
                ★★★★★
              </div>

              <p className="text-zinc-400">
                Trusted by 2,500+ traders
              </p>

            </div>

          </div>

        </div>

        {/* Dashboard */}

        <div className="relative">

          {/* Glow */}

          <div className="absolute -inset-6 rounded-[40px] bg-[#D4AF37]/20 blur-3xl"></div>

          {/* Dashboard */}

          <Image
            src="/hero-dashboard.png"
            alt="Voltex Dashboard"
            width={760}
            height={650}
            priority
            className="relative rounded-[30px] border border-[#D4AF37]/30 shadow-[0_0_60px_rgba(212,175,55,0.25)]"
          />

        </div>

      </section>

    </main>
  );
}