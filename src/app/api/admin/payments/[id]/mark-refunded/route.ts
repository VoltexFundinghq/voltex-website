import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

// Bookkeeping only — does NOT trigger any real refund through PalmPay.
// Use only after you've already manually refunded the customer
// through PalmPay's own tools.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const { error } = await (serviceClient.from("challenge_purchases") as any).update({ payment_status: "refunded" }).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  return NextResponse.json({ success: true });
}
