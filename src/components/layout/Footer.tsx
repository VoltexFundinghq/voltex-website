"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Send, MessageCircle, Mail, Phone, Clock, Zap } from "lucide-react";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const socialLinks = [
  { icon: XIcon, label: "Twitter (X)", href: "#" },
  { icon: InstagramIcon, label: "Instagram", href: "#" },
  { icon: Send, label: "Telegram", href: "#" },
  { icon: MessageCircle, label: "Discord", href: "#" },
  { icon: LinkedinIcon, label: "LinkedIn", href: "#" },
];
const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Blog", href: "#" },
];
const resourceLinks = [
  { label: "Trading Rules", href: "/trading-rules" },
  { label: "FAQ", href: "/faq" },
  { label: "Challenge Programs", href: "/challenges" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <Link href={href} className="group relative inline-block text-base text-zinc-300 transition-colors duration-300 hover:text-[#D4AF37]">
        {label}
        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#D4AF37] transition-all duration-300 group-hover:w-full" />
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-black pt-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,.06),transparent_55%)]" />
      <div className="relative mx-auto max-w-[1440px] px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="sm:col-span-2 lg:col-span-1">
            <Image src="/logo.png" alt="Voltex Funding" width={666} height={375} className="h-[130px] w-auto" />
            <p className="mt-4 max-w-xs text-base leading-7 text-zinc-300">
              Voltex Funding provides Nigerian traders with transparent simulated funding programs designed to reward consistency, discipline, and responsible risk management.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    whileHover={{ y: -2, scale: 1.12 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] text-[#D4AF37] transition-all duration-[250ms] hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/10 hover:shadow-[0_0_24px_rgba(212,175,55,0.65)]"
                  >
                    <Icon className="h-5 w-5" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.08 }}>
            <h4 className="text-sm font-bold uppercase tracking-[0.25em] text-[#D4AF37]">Company</h4>
            <ul className="mt-4 space-y-2.5">
              {companyLinks.map((link) => (<FooterLink key={link.label} label={link.label} href={link.href} />))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.16 }}>
            <h4 className="text-sm font-bold uppercase tracking-[0.25em] text-[#D4AF37]">Resources</h4>
            <ul className="mt-4 space-y-2.5">
              {resourceLinks.map((link) => (<FooterLink key={link.label} label={link.label} href={link.href} />))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.24 }}>
            <h4 className="text-sm font-bold uppercase tracking-[0.25em] text-[#D4AF37]">Support</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="mailto:support@voltexfunding.com" className="flex items-center gap-2.5 text-base text-zinc-300 transition-colors duration-300 hover:text-[#D4AF37]">
                  <Mail className="h-5 w-5 flex-shrink-0 text-[#D4AF37]" />
                  support@voltexfunding.com
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-base text-zinc-300">
                <Phone className="h-5 w-5 flex-shrink-0 text-[#D4AF37]" />
                +234 XXX XXX XXXX
              </li>
            </ul>
            <div className="mt-5">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                <Clock className="h-4 w-4" />
                Business Hours
              </p>
              <p className="mt-2 text-base leading-7 text-zinc-300">
                Monday – Friday
                <br />
                9:00 AM – 6:00 PM (WAT)
              </p>
            </div>
            <div className="mt-5">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                <Zap className="h-4 w-4" />
                Response Time
              </p>
              <p className="mt-2 text-base leading-7 text-zinc-300">Within 24 Hours</p>
            </div>
          </motion.div>
        </div>
        <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/25 to-transparent" />
        <div className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm leading-5 text-zinc-400">
            © 2026 Voltex Funding.
            <br className="sm:hidden" /> All Rights Reserved.
          </p>
          <p className="text-sm text-zinc-400">Built for disciplined Nigerian traders.</p>
        </div>
        <div className="border-t border-white/5 py-5">
          <div className="mx-auto max-w-[860px] text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Risk Disclosure</p>
            <p className="mt-2 text-[13px] leading-6 text-zinc-400">
              Voltex Funding provides simulated evaluation programs designed to assess trading skills. We do not provide brokerage services, investment advice, or manage client funds. All trading activities conducted during the evaluation are performed in a simulated environment. Trading involves substantial risk, and past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
