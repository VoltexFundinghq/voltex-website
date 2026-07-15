"use client";

import { motion, Variants } from "framer-motion";
import { Wallet, PieChart, Clock3, ShieldCheck } from "lucide-react";

const trustItems = [
  { icon: Wallet, label: "Up to ₦3,000,000 Simulated Funding" },
  { icon: PieChart, label: "80% Profit Split" },
  { icon: Clock3, label: "Payouts Within 24 Hours" },
  { icon: ShieldCheck, label: "Transparent Trading Rules" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const trustRowVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const trustItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function FinalCTASection() {
  return (
    <section className="relative overflow-hidden bg-black py-24 sm:py-28 lg:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.55) 0%, rgba(212,175,55,0) 70%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="relative rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-14 text-center shadow-[0_0_60px_-15px_rgba(212,175,55,0.25)] sm:px-12 sm:py-16 lg:px-20 lg:py-20"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Ready to Get Funded?
          </span>

          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your Trading Journey{" "}
            <span className="bg-gradient-to-r from-[#D4AF37] via-[#F1D683] to-[#D4AF37] bg-clip-text text-transparent">
              Starts Here.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            Join Voltex Funding and prove your consistency through
            transparent rules, fair evaluations, and simulated funding of up
            to ₦3,000,000.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row">
            <motion.a
              href="#pricing"
              whileHover={{ scale: 1.045 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="inline-flex items-center justify-center rounded-full bg-[#D4AF37] px-9 py-4 text-sm font-semibold uppercase tracking-wide text-black shadow-[0_0_30px_-5px_rgba(212,175,55,0.6)] transition-shadow duration-300 hover:shadow-[0_0_45px_-5px_rgba(212,175,55,0.85)]"
            >
              Start Your Challenge
            </motion.a>

            <motion.a
              href="#challenges"
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors duration-300 hover:text-[#D4AF37]"
            >
              View Challenge Programs
              <span aria-hidden="true">→</span>
            </motion.a>
          </div>

          <motion.div
            variants={trustRowVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-14 grid grid-cols-1 gap-6 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4"
          >
            {trustItems.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={trustItemVariants}
                className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:text-left lg:flex-col lg:text-center"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/5">
                  <Icon className="h-5 w-5 text-[#D4AF37]" strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium text-white/70">
                  {label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
