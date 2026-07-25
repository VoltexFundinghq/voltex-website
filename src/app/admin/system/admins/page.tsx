import { createServiceClient } from "@/lib/supabase/service";

interface AdminRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

async function getAdmins(): Promise<AdminRow[]> {
  const serviceClient = createServiceClient();
  const query = await serviceClient
    .from("users")
    .select("id, email, full_name, created_at")
    .eq("is_admin", true)
    .order("created_at", { ascending: true });

  const rows = query.data as AdminRow[] | null;
  if (query.error || !rows) return [];
  return rows;
}

export default async function AdminsPage() {
  const admins = await getAdmins();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admins</h1>
        <p className="mt-1 text-sm text-zinc-500">{admins.length} account{admins.length === 1 ? "" : "s"} with admin access</p>
      </div>

      {admins.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No admin accounts found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Admin Since</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-zinc-300">{a.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{a.email}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
