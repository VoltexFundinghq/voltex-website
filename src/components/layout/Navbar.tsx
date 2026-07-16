"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Challenges", href: "/challenges" },
  { label: "Rules", href: "/trading-rules" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full pt-2">
      <div className="w-full border-b border-[#D4AF37]/30 bg-[#090909]/95 py-1.5 shadow-[0_0_40px_rgba(212,175,55,.08)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
            <Image src="/logo.png" alt="Voltex Funding" width={666} height={375} priority className="h-16 w-auto brightness-110 drop-shadow-[0_0_20px_rgba(212,175,55,0.55)] sm:h-20 lg:h-28" />
          </Link>

          <nav className="ml-10 hidden items-center gap-10 lg:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.label} href={link.href} className={`relative text-lg ${isActive ? "font-semibold text-[#D4AF37]" : "text-white"}`}>
                  {link.label}
                  {isActive && <span className="absolute -bottom-2 left-0 h-[2px] w-full rounded-full bg-[#D4AF37]" />}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            <Link href="/login" className="flex items-center gap-2 rounded-xl px-4 py-2 text-lg font-medium text-white transition-all duration-300 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]">
              <User size={20} />
              Login
            </Link>
            <Link href="/challenges">
              <Button className="h-12 rounded-xl bg-[#D4AF37] px-7 text-lg font-semibold text-black hover:bg-[#F5D573]">Start Challenge →</Button>
            </Link>
          </div>

          <button onClick={() => setOpen(!open)} aria-label="Toggle menu" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D4AF37]/30 text-[#D4AF37] lg:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden border-t border-[#D4AF37]/20 lg:hidden">
              <div className="flex flex-col gap-1 px-5 py-5 sm:px-8">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link key={link.label} href={link.href} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-3 text-base ${isActive ? "bg-[#D4AF37]/10 font-semibold text-[#D4AF37]" : "text-white"}`}>
                      {link.label}
                    </Link>
                  );
                })}
                <div className="mt-3 flex flex-col gap-3 border-t border-[#D4AF37]/10 pt-4">
                  <Link href="/login" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/30 px-4 py-3 text-base font-medium text-white">
                    <User size={18} />
                    Login
                  </Link>
                  <Link href="/challenges" onClick={() => setOpen(false)}>
                    <Button className="w-full rounded-xl bg-[#D4AF37] py-3 text-base font-semibold text-black hover:bg-[#F5D573]">Start Challenge →</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
