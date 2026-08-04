import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getAllTransactionsForExport } from "@/lib/database/admin-transactions";
import { buildPdfReport } from "@/lib/services/pdf/report-builder";

export async function GET() {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getAllTransactionsForExport();
  const payments = rows.filter((r: any) => r.Type === "Payment" && r.Status === "completed");
  const refunds = rows.filter((r: any) => r.Type === "Refund");
  const payouts = rows.filter((r: any) => r.Type === "Payout" && r.Status === "completed");

  const pdf = await buildPdfReport({
    title: "Transactions Ledger",
    summaryStats: [
      { label: "Total Transactions", value: String(rows.length) },
      { label: "Completed Payments", value: `${payments.length} (NGN ${payments.reduce((s: number, r: any) => s + Number(r.Amount), 0).toLocaleString()})` },
      { label: "Refunds", value: `${refunds.length} (NGN ${refunds.reduce((s: number, r: any) => s + Number(r.Amount), 0).toLocaleString()})` },
      { label: "Paid Payouts", value: `${payouts.length} (NGN ${payouts.reduce((s: number, r: any) => s + Number(r.Amount), 0).toLocaleString()})` },
    ],
    tableHeaders: ["Time", "Type", "Trader", "Amount", "Gateway", "Status", "Created By"],
    tableRows: rows.map((r: any) => [new Date(r.Time).toLocaleDateString(), r.Type, r.Trader || r.Email, `NGN ${Number(r.Amount).toLocaleString()}`, r.Gateway, r.Status, r["Created By"]]),
  });

  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="voltex-transactions-${new Date().toISOString().slice(0, 10)}.pdf"` } });
}
