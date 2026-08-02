"use client";

import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function CustomerHeader({ title }: { title: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const query = await supabase.from("notifications").select("id, title, message, is_read, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
      setNotifications((query.data as Notification[]) ?? []);
    }
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAllRead() {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await (supabase.from("notifications") as any).update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-5 pl-16 sm:px-8 sm:pl-8 lg:pl-8">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
        <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">{today}</p>
      </div>
      <div className="relative" ref={ref}>
        <button onClick={() => { setOpen(!open); if (!open) markAllRead(); }} className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white">
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4AF37] text-[10px] font-bold text-black">{unreadCount}</span>}
        </button>
        {open && (
          <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-white/10 bg-[#0a0a0a] py-2 shadow-xl">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-600">No notifications yet.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="border-b border-white/5 px-4 py-3 last:border-0">
                    <p className="text-sm text-zinc-200">{n.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{n.message}</p>
                    <p className="mt-1 text-[11px] text-zinc-700">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
