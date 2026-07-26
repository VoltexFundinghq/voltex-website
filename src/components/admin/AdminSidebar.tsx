"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu, X, ChevronDown, LogOut,
  LayoutDashboard, Users, Receipt, Activity, CheckCircle2, XCircle, Trophy,
  Package, ListChecks, Server, CreditCard, TrendingUp, ArrowLeftRight, Banknote,
  ShieldAlert, Eye, FileText, Building2, Mail, Settings, UserCog,
} from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

const ICON_MAP = {
  LayoutDashboard, Users, Receipt, Activity, CheckCircle2, XCircle, Trophy,
  Package, ListChecks, Server, CreditCard, TrendingUp, ArrowLeftRight, Banknote,
  ShieldAlert, Eye, FileText, Building2, Mail, Settings, UserCog,
} as const;

type IconName = keyof typeof ICON_MAP;

interface NavItem {
  label: string;
  href: string;
  iconName: IconName;
  badge?: number;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D4AF37] px-1.5 text-[11px] font-bold text-black">
      {count > 99 ? "99+" : count}
    </span>
  );
}

const BASE_ITEM_CLASS = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors";
const INACTIVE_CLASS = "text-zinc-200 hover:bg-white/5 hover:text-white";
const ACTIVE_CLASS = "bg-[#D4AF37]/10 text-[#D4AF37] font-medium";

export default function AdminSidebar({ navGroups }: { navGroups: NavGroup[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Auto-expand whichever group contains the current page, every time
  // the route changes — so the active section is never left collapsed.
  useEffect(() => {
    const activeGroup = navGroups.find((g) => g.label && g.items.some((item) => pathname === item.href));
    if (activeGroup?.label) {
      setExpandedGroups((prev) => new Set(prev).add(activeGroup.label!));
    }
  }, [pathname, navGroups]);

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-start justify-between px-2">
        <Link href="/admin" className="block" onClick={() => setIsOpen(false)}>
          <Image
            src="/logo.png"
            alt="Voltex Funding"
            width={666}
            height={375}
            priority
            className="h-20 w-auto brightness-[1.3] drop-shadow-[0_0_18px_rgba(212,175,55,0.5)]"
          />
          <p className="mt-2 text-sm text-zinc-400">Operations Centre</p>
        </Link>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navGroups.map((group, i) => {
          if (!group.label) {
            return (
              <div key={i} className="mb-3 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICON_MAP[item.iconName];
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`${BASE_ITEM_CLASS} ${isActive ? ACTIVE_CLASS : INACTIVE_CLASS}`}>
                      <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                      {typeof item.badge === "number" && <Badge count={item.badge} />}
                    </Link>
                  );
                })}
              </div>
            );
          }

          const isExpanded = expandedGroups.has(group.label);
          const groupHasActive = group.items.some((item) => pathname === item.href);

          return (
            <div key={i}>
              <button
                onClick={() => toggleGroup(group.label!)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
              >
                <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${groupHasActive ? "text-[#D4AF37]" : "text-zinc-400"}`}>{group.label}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  strokeWidth={2}
                />
              </button>
              {isExpanded && (
                <div className="mt-0.5 space-y-0.5 pb-2">
                  {group.items.map((item) => {
                    const Icon = ICON_MAP[item.iconName];
                    const isActive = pathname === item.href;
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`${BASE_ITEM_CLASS} ${isActive ? ACTIVE_CLASS : INACTIVE_CLASS}`}>
                        <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{item.label}</span>
                        {typeof item.badge === "number" && <Badge count={item.badge} />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-red-400/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0a0a0a] text-zinc-300 lg:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <aside className="hidden w-[288px] flex-shrink-0 border-r border-[#D4AF37]/15 bg-[#0a0a0a] px-4 py-6 lg:block">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[280px] border-r border-[#D4AF37]/15 bg-[#0a0a0a] px-4 py-6">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
