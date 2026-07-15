"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const categories = ["General", "Challenge", "Payouts", "Accounts", "Payments"];

const faqData: Record<string, { q: string; a: string[] }[]> = {
  General: [
    { q: "What is Voltex Funding?", a: ["Voltex Funding is a Nigerian prop trading firm that offers simulated evaluation programs for traders. Instead of risking your own capital from day one, you purchase a challenge account, prove your trading skill across a two-phase evaluation, and are then granted access to a funded account.", "Our model is built around transparency and consistency rather than gambling-style risk-taking. Every rule, from drawdown limits to profit splits, is disclosed upfront so you always know exactly what's expected of you before you begin.", "We currently support account sizes from N200,000 to N800,000, with larger N1,000,000, N2,000,000, and N3,000,000 accounts launching soon, all traded through MetaTrader 5."] },
    { q: "Is Voltex Funding a broker?", a: ["No. Voltex Funding is not a licensed broker, and we do not provide brokerage services, investment advice, or manage client funds on your behalf.", "All challenge and funded accounts operate in a simulated trading environment. This means the profit and loss figures you see reflect your trading performance and skill, but they are not tied to real capital being placed in live financial markets on your behalf by us.", "For full details on how this distinction works, please refer to the Risk Disclosure at the bottom of our homepage, which explains our model in plain terms."] },
    { q: "Who can join Voltex Funding?", a: ["Anyone who can complete our purchase process and meet the minimum requirements to trade is welcome to apply for a Voltex Funding challenge.", "You'll need a supported payment method to purchase your challenge, access to MetaTrader 5 on desktop, web, or mobile, and a stable internet connection to trade consistently.", "As with most financial platforms, you're expected to be of legal age in your jurisdiction to enter into an agreement with us. If you have questions about your specific eligibility, our support team is happy to confirm before you purchase."] },
    { q: "Can traders outside Nigeria participate?", a: ["Voltex Funding is built first and foremost for Nigerian traders — our pricing is in Naira, and our support and payment methods are tailored to the Nigerian market.", "That said, we understand interest often comes from outside Nigeria as well. If you're located internationally and want to participate, we recommend reaching out to our support team directly to confirm payment options and eligibility for your specific country before purchasing a challenge."] },
  ],
  Challenge: [
    { q: "How do I become funded?", a: ["Every Voltex Funding account uses a two-phase evaluation model. First, choose a challenge account size that matches your trading style. Second, trade Phase 1 and grow your balance by 10% while respecting the maximum drawdown limit. Third, move on to Phase 2 and reach the same 10% target under the exact same rules.", "A fresh account is issued to you immediately after you pass each phase, and again after every approved payout on your funded account — so you always start each new stage from a clean, full starting balance.", "Once you pass both phases without breaching any rules, your funded account is issued. The same maximum drawdown rule that applied in Phase 1 and Phase 2 continues to apply on your funded account too — nothing changes once you move to the next stage."] },
    { q: "What is the profit target?", a: ["The profit target is 10% of your account's starting balance, and it applies separately to Phase 1 and Phase 2 — each phase is a fresh account, so the 10% target is calculated from the same original starting balance both times, not compounded on top of your Phase 1 ending balance.", "For example, on a N500,000 account, you'd need to reach N550,000 to pass Phase 1. Once you pass, a new Phase 2 account is issued at the same N500,000 starting balance, and you'll need to reach N550,000 again to complete Phase 2.", "There's no requirement to hit the target in a specific number of trades or days in either phase — consistency and risk management matter more than speed. For the full breakdown of every trading rule, see our Trading Rules page."] },
    { q: "Is there a time limit?", a: ["No. Voltex Funding challenges have no minimum or maximum time limit in either phase, so you're never racing against a countdown to hit your profit target.", "This is intentional — we'd rather you trade your own strategy at a sustainable pace than force rushed, high-risk decisions just to beat a deadline.", "The one thing to keep in mind is our account activity rule: you do need to place at least one trade every five calendar days to keep your evaluation active."] },
    { q: "How long does account delivery take?", a: ["Your Phase 1 challenge account is delivered instantly after a successful payment — there's no manual review or waiting period before you can start trading.", "You'll receive your MT5 login credentials via email and inside your Voltex Funding dashboard immediately after checkout, so you can log in and begin your evaluation the same day you purchase.", "If you don't receive your credentials within a few minutes of payment confirmation, check your spam folder first, and contact our support team if it still hasn't arrived."] },
  ],
  Payouts: [
    { q: "What is the profit split?", a: ["A payout becomes eligible once your profit reaches at least 10% of your account's starting balance — that's the minimum threshold before any payout can be requested.", "Once eligible, funded traders keep up to 80% of eligible profit, up to the payout cap that applies to that request.", "Your first payout is capped at 10% of your account's starting balance — the same amount that made you eligible in the first place. Every payout after that is capped at 50% of your account's starting balance. Any profit earned above the applicable cap is removed before your 80% share is calculated — it isn't carried over to a later payout.", "For example, on a N500,000 account, your first payout caps eligible profit at N50,000. If you've actually earned N80,000 by that point, the N30,000 above the cap is removed, and your 80% split is calculated on the remaining N50,000."] },
    { q: "How often can I request payouts?", a: ["You can request a payout as soon as your profit reaches the eligibility threshold of 10% of your account's starting balance.", "Once a payout request is approved, you can continue trading immediately on a freshly issued funded account — you don't need to wait for the payout to be fully completed before you resume trading.", "After each payout is completed, a 72-hour cooldown applies before you can request your next payout."] },
    { q: "How long do payouts take?", a: ["Once approved, payouts are completed within 24 hours.", "After that completion, a 72-hour cooldown applies before you're able to request your next payout."] },
    { q: "What payment methods are supported?", a: ["We currently support local Nigerian bank transfers for both challenge purchases and payouts.", "We're actively working on adding more payment and payout methods over time as the platform grows."] },
  ],
  Accounts: [
    { q: "What account sizes are available?", a: ["We currently offer live challenge accounts at N200,000, N300,000, N500,000, N700,000, and N800,000.", "N1,000,000, N2,000,000, and N3,000,000 accounts are in development and will be launching soon."] },
    { q: "Can I have multiple challenge accounts?", a: ["Yes, you're allowed to hold multiple challenge accounts at the same time, whether that's several accounts of the same size or a mix of different sizes."] },
  ],
  Payments: [
    { q: "Which payment methods are accepted?", a: ["We currently accept local Nigerian bank transfers and card payments at checkout when purchasing a challenge."] },
    { q: "Can I get a refund?", a: ["Challenge fees are generally non-refundable once an evaluation has started. Specific exceptions and eligibility are outlined in our full Refund Policy page."] },
  ],
};

function animateScrollTo(targetY: number, duration: number) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  let startTime: number | null = null;
  function step(timestamp: number) {
    if (startTime === null) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    window.scrollTo(0, startY + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export default function FAQAccordion() {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [openId, setOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function handleCategoryClick(cat: string) {
    setActiveCategory(cat);
    setOpenId(null);
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      const targetY = el.getBoundingClientRect().top + window.scrollY - 96;
      animateScrollTo(targetY, 900);
    });
  }

  return (
    <section className="relative overflow-hidden bg-black py-12">
      <div className="relative mx-auto max-w-[1000px] px-8">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button key={cat} onClick={() => handleCategoryClick(cat)} className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${isActive ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_18px_rgba(212,175,55,0.35)]" : "border-white/10 text-zinc-400 hover:border-[#D4AF37]/40 hover:text-white"}`}>
                {cat}
              </button>
            );
          })}
        </div>
        <div ref={listRef} className="mt-10 space-y-4">
          {faqData[activeCategory].map((item, i) => {
            const id = `${activeCategory}-${i}`;
            const isOpen = openId === id;
            return (
              <motion.div key={id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.06 }} className="overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-white/[0.02] backdrop-blur-xl transition-colors duration-300 hover:border-[#D4AF37]/45">
                <button onClick={() => setOpenId(isOpen ? null : id)} className="flex w-full items-center justify-between gap-4 p-6 text-left">
                  <span className="text-base font-semibold text-white">{item.q}</span>
                  {isOpen ? <Minus className="h-5 w-5 flex-shrink-0 text-[#D4AF37]" /> : <Plus className="h-5 w-5 flex-shrink-0 text-[#D4AF37]" />}
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: "easeInOut" }}>
                      <div className="space-y-3 px-6 pb-6">
                        {item.a.map((para, pIdx) => (<p key={pIdx} className="text-sm leading-7 text-zinc-400">{para}</p>))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
