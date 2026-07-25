"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const AUTO_REFRESH_INTERVAL_SECONDS = 30;

export default function DashboardHeader() {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayName, setDisplayName] = useState<string>("Admin");

  const doRefresh = useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
    setLastSynced(new Date());
    setTimeout(() => setIsRefreshing(false), 600);
  }, [router]);

  useEffect(() => {
    const initial = new Date();
    setNow(initial);
    setLastSynced(initial);
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const refreshInterval = setInterval(doRefresh, AUTO_REFRESH_INTERVAL_SECONDS * 1000);
    return () => clearInterval(refreshInterval);
  }, [doRefresh]);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profileQuery = await supabase.from("users").select("full_name, username").eq("id", user.id).single();
      const profile = profileQuery.data as { full_name: string | null; username: string | null } | null;
      setDisplayName(profile?.username || profile?.full_name || user.email?.split("@")[0] || "Admin");
    }
    loadUser();
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-5 pl-16 sm:px-8 sm:pl-8 lg:pl-8">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Welcome back, {displayName}</h1>
        <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
          {now ? now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "—"}
          {" · "}
          {now ? now.toLocaleTimeString() : "—"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">Last synced</p>
          <p className="font-mono text-xs text-zinc-400">{lastSynced ? lastSynced.toLocaleTimeString() : "—"}</p>
        </div>
        <button
          onClick={doRefresh}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          title={`Refresh (auto-refreshes every ${AUTO_REFRESH_INTERVAL_SECONDS}s)`}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
