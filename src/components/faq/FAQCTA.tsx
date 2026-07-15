"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FAQCTA() {
  return (
    <section className="relative overflow-hidden bg-black py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,.1),transparent_55%)]" />
      <div className="relative mx-auto max-w-4xl px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="relative overflow-hidden rounded-[40px] border border-[#D4AF37]/25 bg-white/[0.03] px-10 py-12 text-center backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_70%)]" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold text-white">Still have questions?</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">Our support team is ready to help you every step of the way.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contact"><Button className="bg-[#D4AF37] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5D573]">Contact Support</Button></Link>
              <Button className="border border-[#D4AF37] bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-[#D4AF37] hover:text-black">Start Your Challenge</Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
