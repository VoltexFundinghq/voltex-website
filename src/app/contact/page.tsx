"use client";

import { useState } from "react";
import { Mail, Phone, Clock } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const contactInfo = [
  { icon: Mail, title: "Email", value: "support@voltexfunding.com" },
  { icon: Phone, title: "Phone", value: "+234 XXX XXX XXXX" },
  { icon: Clock, title: "Business Hours", value: "Mon – Fri, 9:00 AM – 6:00 PM (WAT)" },
];

function InfoCard({ item }: { item: (typeof contactInfo)[number] }) {
  const Icon = item.icon;
  return (
    <div className="flex h-full flex-col items-center rounded-2xl border border-[#D4AF37]/20 bg-white/[0.02] p-6 text-center backdrop-blur-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10">
        <Icon className="h-5 w-5 text-[#D4AF37]" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">{item.title}</p>
      <p className="mt-1.5 break-words text-sm leading-6 text-zinc-300">{item.value}</p>
    </div>
  );
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">CONTACT US</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">We're Here to Help.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">
              Have a question about your challenge, payouts, or account? Reach out and our support team will get back to you.
            </p>
          </div>
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-8">
        <div className="relative mx-auto max-w-[1000px] px-5 sm:px-8">

          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-5 px-5 sm:hidden [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {contactInfo.map((item) => (
              <div key={item.title} className="w-[78%] flex-shrink-0 snap-center">
                <InfoCard item={item} />
              </div>
            ))}
          </div>

          <div className="hidden sm:grid sm:grid-cols-3 sm:gap-5">
            {contactInfo.map((item) => (<InfoCard key={item.title} item={item} />))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.08),transparent_55%)]" />
        <div className="relative mx-auto max-w-[700px] px-5 sm:px-8">
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-6 backdrop-blur-xl sm:p-10">
            {submitted ? (
              <div className="py-10 text-center">
                <p className="text-xl font-extrabold text-white">Message Received</p>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
                  Thanks for reaching out. Our support team will get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Name</label>
                    <input required type="text" className="mt-2 w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Email</label>
                    <input required type="email" className="mt-2 w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Subject</label>
                  <input required type="text" className="mt-2 w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="What's this about?" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Message</label>
                  <textarea required rows={5} className="mt-2 w-full resize-none rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/60 focus:outline-none" placeholder="Tell us how we can help..." />
                </div>
                <Button type="submit" className="w-full bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573]">
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
