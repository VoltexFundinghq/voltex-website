"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const sections = [
  { title: "1. Introduction", body: ["This Privacy Policy explains how Voltex Funding (\"we\", \"us\", \"our\") collects, uses, and protects your personal information when you use our website and evaluation programs.", "By using Voltex Funding, you agree to the collection and use of information in accordance with this policy."] },
  { title: "2. Information We Collect", body: ["We may collect personal information you provide directly to us, including your name, email address, phone number, and billing information when you purchase a challenge.", "We may also collect information necessary to verify your identity and process payments, and trading activity data generated on your MetaTrader 5 (MT5) account for the purpose of evaluating your challenge or funded account."] },
  { title: "3. How We Use Your Information", body: ["We use the information we collect to provide and manage your challenge and funded accounts, process payments and payouts, communicate with you about your account, and improve our platform and services.", "We do not use your personal information for purposes unrelated to operating and supporting your Voltex Funding account."] },
  { title: "4. Sharing Your Information", body: ["We may share your information with trusted third parties necessary to operate our services, such as payment processors and the trading platform provider (MetaTrader 5).", "We do not sell your personal information to third parties for marketing purposes."] },
  { title: "5. Data Security", body: ["We take reasonable technical and organizational measures to protect your personal information from unauthorized access, loss, or misuse.", "No method of transmission or storage is completely secure, and we cannot guarantee absolute security of your information."] },
  { title: "6. Your Rights", body: ["Depending on applicable law, including Nigeria's Data Protection Regulation (NDPR), you may have the right to access, correct, or request deletion of your personal information.", "To exercise any of these rights, please contact us using the details on our Contact page."] },
  { title: "7. Cookies", body: ["Our website may use cookies or similar technologies to improve your browsing experience and understand how our site is used.", "You can control cookie preferences through your browser settings."] },
  { title: "8. Changes to This Policy", body: ["We may update this Privacy Policy from time to time. Changes will be posted on this page, and continued use of our services after changes are posted constitutes acceptance of the updated policy."] },
  { title: "9. Contact Us", body: ["If you have any questions about this Privacy Policy or how your data is handled, please reach out through our Contact page."] },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden bg-black pb-8 pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1000px] px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D4AF37]">LEGAL</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">Privacy Policy</h1>
            <p className="mx-auto mt-4 text-sm text-zinc-500">Last updated: [Insert Date]</p>
          </motion.div>
          <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }} className="mx-auto mt-8 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-12">
        <div className="relative mx-auto max-w-[800px] px-8">
          <div className="space-y-8">
            {sections.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.03 }}>
                <h2 className="text-lg font-extrabold text-white">{s.title}</h2>
                <div className="mt-3 space-y-3">
                  {s.body.map((p, pi) => (<p key={pi} className="text-sm leading-7 text-zinc-400">{p}</p>))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
