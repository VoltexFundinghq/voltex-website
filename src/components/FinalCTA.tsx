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
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">READY TO GET FUNDED?</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-6xl">
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
        </motion.div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point, i) => {
            const Icon = point.icon;
            return (
              <motion.div key={point.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.06 }} className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10">
                  <Icon className="h-5 w-5 text-[#D4AF37]" />
                </div>
                <p className="text-base font-semibold text-zinc-100">{point.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
