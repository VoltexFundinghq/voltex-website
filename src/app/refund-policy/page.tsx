"use client";

import Link from "next/link";
import { XCircle, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[900px] px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">LEGAL</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">Refund Policy</h1>
            <p className="mx-auto mt-4 text-sm text-zinc-500">Last updated: [Insert Date]</p>
          </div>
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-10 sm:py-12">
        <div className="relative mx-auto max-w-[800px] space-y-8 px-5 sm:px-8 sm:space-y-10">

          <div>
            <h2 className="text-base font-extrabold text-white sm:text-lg">Our Policy</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              When you purchase a Voltex Funding challenge, your account is provisioned and delivered instantly, giving you immediate access to trade. Because the account, trading conditions, and platform access are activated the moment your payment is confirmed, challenge fees are non-refundable once an account has been issued.
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              This policy exists to keep our pricing fair and sustainable for all traders — instant delivery means we cannot "undo" an activated evaluation the way a physical product return works.
            </p>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/20 bg-white/[0.02] p-6 backdrop-blur-xl sm:p-7">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 flex-shrink-0 text-[#D4AF37]" />
              <h3 className="text-base font-bold text-white">Non-Refundable Circumstances</h3>
            </div>
            <ul className="mt-4 space-y-2.5 pl-1">
              {["Change of mind after an account has been issued", "Failing Phase 1 or Phase 2 of your evaluation", "Breaching a trading rule, including drawdown or activity requirements", "Dissatisfaction with trading performance or results"].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-zinc-300">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#D4AF37]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/20 bg-white/[0.02] p-6 backdrop-blur-xl sm:p-7">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#D4AF37]" />
              <h3 className="text-base font-bold text-white">Exceptions We Will Review</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">We will review refund requests on a case-by-case basis for genuine billing issues, including:</p>
            <ul className="mt-4 space-y-2.5 pl-1">
              {["A duplicate or accidental double charge for the same challenge", "An unauthorized charge on your payment method", "A confirmed technical error that prevented your account from being delivered"].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-zinc-300">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#D4AF37]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-base font-extrabold text-white sm:text-lg">How to Request a Review</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              If you believe your situation falls under one of the exceptions above, please contact our support team with your order details and a description of the issue. We aim to review all requests promptly and fairly.
            </p>
          </div>

          <div className="text-center">
            <Link href="/contact" className="inline-block w-full sm:w-auto"><Button className="w-full bg-[#D4AF37] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5D573] sm:w-auto">Contact Support</Button></Link>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}
