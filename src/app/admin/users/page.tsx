import { createServiceClient } from "@/lib/supabase/service";

interface UserRow {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  kyc_status: string;
  is_admin: boolean;
  created_at: string;
}

async function getAllUsers(): Promise<UserRow[]> {
  const serviceClient = createServiceClient();
  const query = await serviceClient
    .from("users")
    .select("id, full_name, username, email, phone, country, kyc_status, is_admin, created_at")
    .order("created_at", { ascending: false });

  const rows = query.data as UserRow[] | null;
  if (query.error || !rows) {
    console.error("getAllUsers failed:", query.error);
    return [];
  }
  return rows;
}

function kycBadge(status: string) {
  if (status === "verified") return "bg-emerald-400/10 text-emerald-400";
  if (status === "rejected") return "bg-red-400/10 text-red-400";
  return "bg-white/5 text-zinc-400";
}

export default async function UsersPage() {
  const users = await getAllUsers();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="mt-1 text-sm text-zinc-500">{users.length} registered account{users.length === 1 ? "" : "s"}</p>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No users registered yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">KYC</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-zinc-300">
                    {u.full_name ?? "—"}
                    {u.is_admin && <span className="ml-2 rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-medium text-[#D4AF37]">ADMIN</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500">{u.username ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{u.country ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${kycBadge(u.kyc_status)}`}>
                      {u.kyc_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
