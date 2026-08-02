import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMyChallenges } from "@/lib/database/customer-dashboard";
import CustomerHeader from "@/components/customer/CustomerHeader";
import Link from "next/link";

function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}
function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}
function statusBadge(status: string): string {
  if (status === "Passed") return "bg-emerald-400/10 text-emerald-400";
  if (status === "Failed") return "bg-red-400/10 text-red-400";
  if (status === "Funded") return "bg-[#D4AF37]/10 text-[#D4AF37]";
  return "bg-blue-400/10 text-blue-400";
}

export default async function ChallengesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challenges = await getMyChallenges(user.id);

  return (
    <div>
      <CustomerHeader title="Challenges" />
      <div className="p-4 sm:p-8">
        {challenges.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-zinc-400">You haven't purchased a challenge yet.</p>
            <Link href="/challenges" className="mt-4 inline-block rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#F5D573]">Browse Challenges</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-white">{fmtMoney(c.challengeSize)}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(c.status)}`}>{c.status}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Purchased {fmtDate(c.purchaseDate)}</p>
                <div className="mt-4 space-y-1 text-sm">
                  <p className="text-zinc-400">Equity: <span className="text-zinc-200">{fmtMoney(c.currentEquity)}</span></p>
                  <p className="text-zinc-400">Profit: <span className={c.currentProfit !== null && c.currentProfit < 0 ? "text-red-400" : "text-emerald-400"}>{fmtMoney(c.currentProfit)}</span></p>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Target Progress</span><span>{c.profitTargetProgressPercent}%</span></div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${Math.min(100, c.profitTargetProgressPercent)}%` }} /></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href="/dashboard/trading-accounts" className="flex-1 rounded-lg border border-white/10 py-1.5 text-center text-xs text-zinc-300 hover:bg-white/5">Open Account</Link>
                  <Link href="/trading-rules" className="flex-1 rounded-lg border border-white/10 py-1.5 text-center text-xs text-zinc-300 hover:bg-white/5">Rules</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
