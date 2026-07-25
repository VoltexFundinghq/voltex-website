import { createServiceClient } from "@/lib/supabase/service";

interface SlotRow {
  slot_label: string;
  current_user_challenge_id: string | null;
  assigned_at: string | null;
}

interface ChallengeInfo {
  id: string;
  account_login: string | null;
  last_known_check_at: string | null;
}

async function getSlotData(): Promise<{ slot: SlotRow; challenge: ChallengeInfo | null }[]> {
  const serviceClient = createServiceClient();
  const slotsQuery = await serviceClient
    .from("vps_slots")
    .select("slot_label, current_user_challenge_id, assigned_at")
    .order("slot_label");

  const slots = slotsQuery.data as SlotRow[] | null;
  if (slotsQuery.error || !slots) return [];

  const challengeIds = slots.map((s) => s.current_user_challenge_id).filter((id): id is string => !!id);
  const challengesQuery = challengeIds.length > 0
    ? await serviceClient.from("user_challenges").select("id, account_login, last_known_check_at").in("id", challengeIds)
    : { data: [] as any[] };

  const challengesById = new Map((challengesQuery.data as ChallengeInfo[] ?? []).map((c) => [c.id, c]));

  return slots.map((slot) => ({
    slot,
    challenge: slot.current_user_challenge_id ? challengesById.get(slot.current_user_challenge_id) ?? null : null,
  }));
}

function healthStatus(lastCheckAt: string | null): { label: string; className: string } {
  if (!lastCheckAt) return { label: "No data", className: "bg-white/5 text-zinc-500" };
  const secondsAgo = (Date.now() - new Date(lastCheckAt).getTime()) / 1000;
  if (secondsAgo < 30) return { label: "Healthy", className: "bg-emerald-400/10 text-emerald-400" };
  if (secondsAgo < 120) return { label: "Delayed", className: "bg-amber-400/10 text-amber-400" };
  return { label: "Stale", className: "bg-red-400/10 text-red-400" };
}

export default async function VPSMonitoringPage() {
  const data = await getSlotData();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">VPS Monitoring</h1>
        <p className="mt-1 text-sm text-zinc-500">Real-time status of each terminal slot watching a live account</p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No slots registered yet — they appear here automatically once a poller checks in for the first time.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map(({ slot, challenge }) => {
            const health = healthStatus(challenge?.last_known_check_at ?? null);
            return (
              <div key={slot.slot_label} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-zinc-300">{slot.slot_label}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${health.className}`}>{health.label}</span>
                </div>
                {challenge ? (
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-zinc-400">Watching: <span className="font-mono text-zinc-300">{challenge.account_login ?? "—"}</span></p>
                    <p className="text-xs text-zinc-600">
                      Last check: {challenge.last_known_check_at ? new Date(challenge.last_known_check_at).toLocaleTimeString() : "never"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-600">Idle — no account currently assigned</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
