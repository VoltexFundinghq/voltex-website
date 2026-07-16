"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Banknote, Percent, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const trustPoints = [
  { icon: Banknote, label: "Up to N3,000,000 Simulated Funding" },
  { icon: Percent, label: "80% Profit Split" },
  { icon: Clock, label: "Payouts Within 24 Hours" },
  { icon: ShieldCheck, label: "Transparent Trading Rules" },
];

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-black py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(212,175,55,.12),transparent_55%)]" />
      <div className="relative mx-auto max-w-[1440px] px-8">

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">READY TO GET FUNDED?</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-6xl">
            Your Trading Journey <span className="text-[#D4AF37]">Starts Here.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Join Voltex Funding and prove your consistency with transparent rules, fair evaluations, and simulated capital of up to{" "}
            <span className="font-semibold text-[#D4AF37]">N3,000,000</span>.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/challenges">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button className="rounded-full bg-[#D4AF37] px-10 py-6 text-lg font-semibold text-black shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:bg-[#F5D573]">Start Your Challenge</Button>
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Phone: auto-scrolling ticker, no cards */}
        <div className="relative mt-16 overflow-hidden sm:hidden" style={{ WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)", maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
          <div className="flex w-max animate-[voltex-marquee-cta_20s_linear_infinite]">
            {[...trustPoints, ...trustPoints].map((point, i) => {
              const Icon = point.icon;
              return (
                <div key={i} className="flex flex-shrink-0 items-center gap-3.5 pr-12">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10">
                    <Icon className="h-5 w-5 text-[#D4AF37]" />
                  </div>
                  <p className="whitespace-nowrap text-base font-semibold text-zinc-100">{point.label}</p>
                </div>
              );
            })}
          </div>
        </div>
        <style>{`
          @keyframes voltex-marquee-cta {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>

        {/* Tablet/Desktop: existing grid, unchanged */}
        <div className="mx-auto mt-16 hidden max-w-5xl sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {trustPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.label} className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10">
                  <Icon className="h-5 w-5 text-[#D4AF37]" />
                </div>
                <p className="text-base font-semibold text-zinc-100">{point.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
