import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { getPurchaseDetail } from "@/lib/database/admin-purchases";
import { sendChallengeCredentialsEmail } from "@/lib/services/email/templates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = await getPurchaseDetail(id);
  if (!detail || !detail.provision.mt5Login) {
    return NextResponse.json({ error: "No assigned account to send credentials for" }, { status: 404 });
  }

  const serviceClient = createServiceClient();
  const accountQuery = await serviceClient
    .from("trading_accounts")
    .select("login, password, server, broker")
    .eq("login", detail.provision.mt5Login)
    .single();

  const account = accountQuery.data as any;
  if (!account) return NextResponse.json({ error: "Account details not found" }, { status: 404 });

  await sendChallengeCredentialsEmail(detail.customer.email, {
    challengeName: detail.purchase.challenge_size,
    login: account.login,
    password: account.password,
    server: account.server,
    broker: account.broker,
  });

  return NextResponse.json({ success: true });
}
