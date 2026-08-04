import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getAllPayoutsForExport, getPayoutStats, getPayoutAnalytics } from "@/lib/database/admin-payout-requests";
import { buildPdfReport } from "@/lib/services/pdf/report-builder";

export async function GET() {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rows, stats, analytics] = await Promise.all([getAllPayoutsForExport(), getPayoutStats(), getPayoutAnalytics()]);

  const pdf = await buildPdfReport({
    title: "Payout Requests Report",
    summaryStats: [
      { label: "Pending / Approved / Rejected / Paid", value: `${stats.pending} / ${stats.approved} / ${stats.rejected} / ${stats.paid}` },
      { label: "Total Value", value: `NGN ${stats.totalValue.toLocaleString()}` },
      { label: "Average Payout", value: `NGN ${analytics.averagePayout.toLocaleString()}` },
      { label: "Total Paid", value: `NGN ${analytics.totalPaid.toLocaleString()}` },
      { label: "Average Processing Time", value: `${analytics.averageProcessingHours}h` },
    ],
    tableHeaders: ["Requested", "Trader", "Email", "Amount", "Status", "Approved By", "Paid By"],
    tableRows: rows.map((r: any) => [new Date(r.Requested).toLocaleDateString(), r.Trader, r.Email, `NGN ${Number(r.Amount).toLocaleString()}`, r.Status, r["Approved By"], r["Paid By"]]),
  });

  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="voltex-payouts-${new Date().toISOString().slice(0, 10)}.pdf"` } });
}
