import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { reviewStatus, adminNotes } = body;

  if (!["pending_review", "reviewed", "escalated", "resolved"].includes(reviewStatus)) {
    return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("violation_reviews") as any)
    .upsert(
      {
        user_challenge_id: id,
        review_status: reviewStatus,
        admin_notes: adminNotes ?? null,
        reviewed_at: reviewStatus !== "pending_review" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_challenge_id" }
    );

  if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  return NextResponse.json({ success: true });
}
