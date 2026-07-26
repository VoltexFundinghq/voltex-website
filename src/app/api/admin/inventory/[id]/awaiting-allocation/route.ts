import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { getAwaitingAllocationForSize } from "@/lib/database/admin-inventory";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();
  const accountQuery = await serviceClient.from("trading_accounts").select("account_size").eq("id", id).single();
  const account = accountQuery.data as { account_size: number } | null;
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const waiting = await getAwaitingAllocationForSize(account.account_size);
  return NextResponse.json({ waiting });
}
