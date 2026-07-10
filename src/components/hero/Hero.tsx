import { Button } from "@/components/ui/button";
import Dashboard from "./Dashboard";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(212,175,55,.18),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(212,175,55,.08),transparent_35%)]"></div>

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-20 px-8 py-24">

        <div className="max-w-xl">

          <div className="mb-8 inline-flex rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2 text-sm text-[#D4AF37]">
            🇳🇬 Nigerian Prop Trading Firm
          </div>

          <h1 className="mb-8 text-6xl font-extrabold leading-tight">
            TRADE BIGGER,
            <br />
            KEEP MORE,
            <br />
            <span className="text-[#D4AF37]">
              SCALE FASTER
            </span>
          </h1>

          <p className="mb-10 text-xl leading-9 text-zinc-400">
            Voltex Funding empowers traders with up to{" "}
            <span className="font-semibold text-[#D4AF37]">
              ₦3,000,000
            </span>{" "}
            in simulated funding and industry-leading trading conditions—giving you the capital and confidence to scale your trading career.
          </p>

          <div className="flex gap-5">

            <Button className="bg-[#D4AF37] px-8 py-6 text-lg text-black hover:bg-yellow-400">
              Start Challenge
            </Button>

            <Button className="border border-[#D4AF37] bg-transparent px-8 py-6 text-lg text-white hover:bg-[#D4AF37] hover:text-black">
              View Pricing
            </Button>

          </div>

        </div>

        <Dashboard />

      </div>

    </section>
  );
}
