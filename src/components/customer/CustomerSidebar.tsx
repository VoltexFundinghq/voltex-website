"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu, X, LogOut, LayoutDashboard, Trophy, Wallet, Award, Banknote, User, LifeBuoy,
} from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Challenges", href: "/dashboard/challenges", icon: Trophy },
  { label: "Trading Accounts", href: "/dashboard/trading-accounts", icon: Wallet },
  { label: "Certificates", href: "/dashboard/certificates", icon: Award },
  { label: "Payouts", href: "/dashboard/payouts", icon: Banknote },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
];

export default function CustomerSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-start justify-between px-2">
        <Link href="/dashboard" className="block" onClick={() => setIsOpen(false)}>
          <Image src="/logo.png" alt="Voltex Funding" width={666} height={375} priority className="h-20 w-auto brightness-[1.3] drop-shadow-[0_0_18px_rgba(212,175,55,0.5)]" />
          <p className="mt-2 text-sm text-zinc-400">My Account</p>
        </Link>
        <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden">
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-[#D4AF37]/10 font-medium text-[#D4AF37]" : "text-zinc-200 hover:bg-white/5 hover:text-white"}`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <form action={signOutAction}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-red-400/10 hover:text-red-400">
            <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            Logout
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0a0a0a] text-zinc-300 lg:hidden">
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <aside className="hidden w-[280px] flex-shrink-0 border-r border-[#D4AF37]/15 bg-[#0a0a0a] px-4 py-6 lg:block">{content}</aside>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[280px] border-r border-[#D4AF37]/15 bg-[#0a0a0a] px-4 py-6">{content}</aside>
        </div>
      )}
    </>
  );
}
