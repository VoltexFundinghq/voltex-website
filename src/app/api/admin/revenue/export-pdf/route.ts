import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getAllRevenueForExport, getRevenueSummary } from "@/lib/database/admin-revenue";
import { buildPdfReport } from "@/lib/services/pdf/report-builder";

export async function GET() {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rows, summary] = await Promise.all([getAllRevenueForExport(), getRevenueSummary()]);

  const pdf = await buildPdfReport({
    title: "Revenue Report",
    summaryStats: [
      { label: "Total Revenue", value: `NGN ${summary.totalRevenue.toLocaleString()}` },
      { label: "Monthly Revenue", value: `NGN ${summary.monthlyRevenue.toLocaleString()}` },
      { label: "Gross / Net Revenue", value: `NGN ${summary.grossRevenue.toLocaleString()} / NGN ${summary.netRevenue.toLocaleString()}` },
      { label: "Revenue Growth", value: `${summary.revenueGrowthPercent}%` },
      { label: "Average Order Value", value: `NGN ${summary.averageOrderValue.toLocaleString()}` },
    ],
    tableHeaders: ["Date", "Trader", "Email", "Country", "Challenge", "Amount"],
    tableRows: rows.map((r: any) => [new Date(r.Date).toLocaleDateString(), r.Trader, r.Email, r.Country, r.Challenge, `NGN ${Number(r.Amount).toLocaleString()}`]),
  });

  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="voltex-revenue-${new Date().toISOString().slice(0, 10)}.pdf"` } });
}
