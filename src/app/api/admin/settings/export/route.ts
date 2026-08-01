import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

// A genuine, safe, read-only export of real operational tables — NOT
// a full database backup/restore system (which we don't have and
// would be dangerous to fake).
export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();
  const [users, challenges, purchases, accounts, payouts] = await Promise.all([
    serviceClient.from("users").select("id, email, full_name, created_at, is_admin, kyc_status"),
    serviceClient.from("user_challenges").select("*"),
    serviceClient.from("challenge_purchases").select("*"),
    serviceClient.from("trading_accounts").select("id, login, server, account_size, status, pa_label, created_at"),
    serviceClient.from("payout_requests").select("*"),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    exportedBy: admin.email,
    users: users.data,
    challenges: challenges.data,
    purchases: purchases.data,
    tradingAccounts: accounts.data,
    payouts: payouts.data,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="voltex-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
