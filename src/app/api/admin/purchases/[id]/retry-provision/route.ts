import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { getPurchaseDetail } from "@/lib/database/admin-purchases";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = await getPurchaseDetail(id);
  if (!detail || !detail.matchedChallengeId) {
    return NextResponse.json({ error: "No matching challenge found for this purchase" }, { status: 404 });
  }

  const serviceClient = createServiceClient();
  const sizeMatch = detail.purchase.challenge_size.match(/(\d+)k/i);
  const accountSize = sizeMatch ? Number(sizeMatch[1]) * 1000 : null;
  if (!accountSize) {
    return NextResponse.json({ error: "Could not determine account size" }, { status: 500 });
  }

  const { data: allocation, error } = await (serviceClient.rpc as any)("allocate_trading_account", {
    p_user_challenge_id: detail.matchedChallengeId,
    p_account_size: accountSize,
  });

  if (error || !allocation || allocation.length === 0) {
    return NextResponse.json({ error: "No available inventory for this size right now" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
