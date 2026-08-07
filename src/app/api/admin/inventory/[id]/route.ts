import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getInventoryDetail } from "@/lib/database/admin-inventory";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = await getInventoryDetail(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(detail);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const accountQuery = await serviceClient.from("trading_accounts").select("status").eq("id", id).single();
  const account = accountQuery.data as { status: string } | null;
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!["available", "expired"].includes(account.status)) {
    return NextResponse.json({ error: "Only accounts that were never assigned, or are already confirmed deleted by Exness, can be permanently removed." }, { status: 400 });
  }

  // Real safety check, not just a status assumption — refuse if ANY
  // real challenge (active, passed, failed — any history at all)
  // ever referenced this account.
  const historyQuery = await serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("trading_account_id", id);
  if ((historyQuery.count ?? 0) > 0) {
    return NextResponse.json({ error: "This account has real trader history attached and cannot be permanently deleted." }, { status: 400 });
  }

  const { error } = await serviceClient.from("trading_accounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
