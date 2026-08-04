import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getPayoutDetail } from "@/lib/database/admin-payout-requests";
import { buildPdfReport } from "@/lib/services/pdf/report-builder";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = await getPayoutDetail(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdf = await buildPdfReport({
    title: `Payout Receipt — ${detail.trader.name ?? detail.trader.email}`,
    summaryStats: [
      { label: "Trader", value: `${detail.trader.name ?? "—"} (${detail.trader.email})` },
      { label: "MT5 Account", value: detail.tradingAccount.login ?? "—" },
      { label: "Total Profit", value: `NGN ${detail.profitBreakdown.totalProfit.toLocaleString()}` },
      { label: "Profit Split", value: `${detail.profitBreakdown.profitSplitPercent}%` },
      { label: "Amount Paid", value: `NGN ${detail.profitBreakdown.requestedAmount.toLocaleString()}` },
      { label: "Status", value: detail.status },
    ],
    tableHeaders: ["Step", "Timestamp"],
    tableRows: detail.timeline.map((t) => [t.label, t.timestamp ? new Date(t.timestamp).toLocaleString() : "Not yet reached"]),
  });

  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="voltex-payout-receipt-${id.slice(0, 8)}.pdf"` } });
}
