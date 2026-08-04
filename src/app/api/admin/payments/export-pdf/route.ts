import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getAllPaymentsForExport, getPaymentStats, getPaymentAnalytics } from "@/lib/database/admin-payments";
import { buildPdfReport } from "@/lib/services/pdf/report-builder";

export async function GET() {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rows, stats, analytics] = await Promise.all([getAllPaymentsForExport(), getPaymentStats(), getPaymentAnalytics()]);

  const pdf = await buildPdfReport({
    title: "Payments Report",
    summaryStats: [
      { label: "Payments Today", value: String(stats.totalToday) },
      { label: "Today's Revenue", value: `NGN ${stats.todaysRevenue.toLocaleString()}` },
      { label: "Pending / Successful / Failed / Refunded", value: `${stats.pending} / ${stats.successful} / ${stats.failed} / ${stats.refunded}` },
      { label: "Average Order Value", value: `NGN ${analytics.averageOrderValue.toLocaleString()}` },
      { label: "Conversion Rate", value: `${analytics.conversionRatePercent}%` },
    ],
    tableHeaders: ["Date", "Trader", "Email", "Challenge", "Amount", "Status", "Reference"],
    tableRows: rows.map((r: any) => [new Date(r.Date).toLocaleDateString(), r.Trader, r.Email, r.Challenge, `NGN ${Number(r.Amount).toLocaleString()}`, r.Status, r.Reference]),
  });

  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="voltex-payments-${new Date().toISOString().slice(0, 10)}.pdf"` } });
}
