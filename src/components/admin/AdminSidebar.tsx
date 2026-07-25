"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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

export default function AdminSidebar({ navGroups }: { navGroups: NavGroup[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
    <>
      <div className="mb-6 flex items-center justify-between px-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">Voltex Funding</p>
          <p className="mt-0.5 text-sm text-zinc-500">Operations Centre</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>
      <nav className="space-y-1">
        {navGroups.map((group, i) => {
          if (!group.label) {
            return (
              <div key={i} className="mb-3 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
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

          return (
            <div key={i}>
              <button
                onClick={() => toggleGroup(group.label!)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">{group.label}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-zinc-600 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  strokeWidth={2}
                />
              </button>
              {isExpanded && (
                <div className="mt-0.5 space-y-0.5 pb-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                      >
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
    </>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0a0a0a] text-zinc-300 lg:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <aside className="hidden w-[288px] flex-shrink-0 overflow-y-auto border-r border-[#D4AF37]/15 bg-[#0a0a0a] px-4 py-6 lg:block">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[280px] overflow-y-auto border-r border-[#D4AF37]/15 bg-[#0a0a0a] px-4 py-6">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
