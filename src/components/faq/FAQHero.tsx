"use client";

import { motion } from "framer-motion";

export default function FAQHero() {
  return (
    <section className="relative overflow-hidden bg-black pb-8 pt-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
      <div className="relative mx-auto max-w-[1440px] px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">FAQ</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">Frequently Asked Questions</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">
            Everything you need to know about Voltex Funding, our evaluation process, payouts, trading rules, and funded accounts.
          </p>
        </motion.div>
        <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }} className="mx-auto mt-8 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
      </div>
    </section>
  );
}
