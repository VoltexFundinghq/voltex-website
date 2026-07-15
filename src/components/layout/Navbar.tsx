"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
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
  return (
    <header className="w-full pt-2">
      <div className="w-full border-b border-[#D4AF37]/30 bg-[#090909]/95 py-1.5 shadow-[0_0_40px_rgba(212,175,55,.08)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-8">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="Voltex Funding" width={666} height={375} priority className="h-28 w-auto brightness-110 drop-shadow-[0_0_20px_rgba(212,175,55,0.55)]" />
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
          <div className="flex items-center gap-5">
            <Link href="/login" className="flex items-center gap-2 rounded-xl px-4 py-2 text-lg font-medium text-white transition-all duration-300 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]">
              <User size={20} />
              Login
            </Link>
            <Link href="/challenges">
              <Button className="h-12 rounded-xl bg-[#D4AF37] px-7 text-lg font-semibold text-black hover:bg-[#F5D573]">Start Challenge →</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
