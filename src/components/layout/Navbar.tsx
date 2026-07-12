"use client";

import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="w-full pt-4">
      <div className="w-full border-b border-[#D4AF37]/30 bg-[#090909]/95 py-2 shadow-[0_0_40px_rgba(212,175,55,.08)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8">

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Voltex Funding"
              width={666}
              height={375}
              priority
              className="h-32 w-auto drop-shadow-[0_0_14px_rgba(212,175,55,0.35)]"
            />
          </Link>

          {/* Navigation */}
          <nav className="ml-10 hidden items-center gap-10 lg:flex">

            <Link href="/" className="relative text-base font-semibold text-[#D4AF37]">
              Home
              <span className="absolute -bottom-2 left-0 h-[2px] w-full rounded-full bg-[#D4AF37]" />
            </Link>

            <Link href="#" className="text-base">Challenges</Link>
            <Link href="#" className="text-base">Pricing</Link>
            <Link href="#" className="text-base">Rules</Link>
            <Link href="#" className="text-base">FAQ</Link>

          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-5">

            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-base font-medium text-white transition-all duration-300 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
            >
              <User size={18} />
              Login
            </Link>

            <Button className="h-11 rounded-xl bg-[#D4AF37] px-6 text-base font-semibold text-black hover:bg-[#F5D573]">
              Start Challenge →
            </Button>

          </div>

        </div>
      </div>
    </header>
  );
}