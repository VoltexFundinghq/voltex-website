import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const ids: string[] = body.ids ?? [];
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "No accounts selected" }, { status: 400 });

  const serviceClient = createServiceClient();

  const accountsQuery = await serviceClient.from("trading_accounts").select("id, login, status").in("id", ids);
  const accounts = ((accountsQuery.data ?? []) as unknown as { id: string; login: string; status: string }[]);

  const deletedLogins: string[] = [];
  const skipped: { login: string; reason: string }[] = [];

  for (const account of accounts) {
    if (!["available", "expired"].includes(account.status)) {
      skipped.push({ login: account.login, reason: `not eligible (currently ${account.status})` });
      continue;
    }

    // Real, server-side safety check per account — never trust that
    // the client-side eligibility filter alone is enough.
    const historyQuery = await serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("trading_account_id", account.id);
    if ((historyQuery.count ?? 0) > 0) {
      skipped.push({ login: account.login, reason: "has real trader history" });
      continue;
    }

    const { error } = await serviceClient.from("trading_accounts").delete().eq("id", account.id);
    if (error) {
      skipped.push({ login: account.login, reason: "database error" });
      continue;
    }

    deletedLogins.push(account.login);
  }

  return NextResponse.json({ deletedCount: deletedLogins.length, deletedLogins, skipped });
}
