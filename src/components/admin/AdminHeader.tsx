"use client";

import { useRouter } from "next/navigation";
import { Search, Bell, RefreshCw } from "lucide-react";

export default function AdminHeader({ title }: { title: string }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="flex items-center justify-between border-b border-white/10 px-8 py-5">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-0.5 text-sm text-zinc-500">{today}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
          />
        </div>
        <button
          onClick={() => router.refresh()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          title="Notifications"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-3">
          <span className="text-sm font-medium text-[#D4AF37]">Admin</span>
        </div>
      </div>
    </div>
  );
}
