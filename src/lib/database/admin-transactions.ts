import { createServiceClient } from "@/lib/supabase/service";

export type TransactionType = "Payment" | "Refund" | "Payout";

export interface TransactionRow {
  id: string;
  timestamp: string;
  type: TransactionType;
  traderName: string | null;
  email: string;
  amount: number;
  gateway: string;
  reference: string | null;
  status: string;
  createdBy: string;
}

export interface TransactionDetail {
  id: string;
  type: TransactionType;
  timestamp: string;
  amount: number;
  status: string;
  createdBy: string;
  reason: string | null;
  linkedPurchaseId: string | null;
  linkedPayoutId: string | null;
  auditTrail: { label: string; timestamp: string | null }[];
}

async function collectTransactions(serviceClient: ReturnType<typeof createServiceClient>): Promise<TransactionRow[]> {
  const rows: TransactionRow[] = [];

  const purchasesQuery = await serviceClient.from("challenge_purchases").select("id, user_id, price_paid, payment_status, payment_reference, created_at, refunded_at, refunded_by");
  const purchases = ((purchasesQuery.data ?? []) as unknown as any[]);

  const payoutsQuery = await serviceClient.from("payout_requests").select("id, user_id, amount, status, requested_at, approved_at, approved_by, processed_at, paid_by");
  const payouts = ((payoutsQuery.data ?? []) as unknown as any[]);

  const userIds = [...new Set([...purchases.map((p) => p.user_id), ...payouts.map((p) => p.user_id)])];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, email, full_name").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  for (const p of purchases) {
    const user = userById.get(p.user_id);
    rows.push({
      id: `purchase-${p.id}`,
      timestamp: p.created_at,
      type: "Payment",
      traderName: user?.full_name ?? null,
      email: user?.email ?? "unknown",
      amount: Number(p.price_paid),
      gateway: "PalmPay",
      reference: p.payment_reference,
      status: p.payment_status,
      createdBy: "System",
    });
    if (p.payment_status === "refunded" && p.refunded_at) {
      rows.push({
        id: `refund-${p.id}`,
        timestamp: p.refunded_at,
        type: "Refund",
        traderName: user?.full_name ?? null,
        email: user?.email ?? "unknown",
        amount: Number(p.price_paid),
        gateway: "PalmPay",
        reference: p.payment_reference,
        status: "completed",
        createdBy: p.refunded_by ?? "Admin",
      });
    }
  }

  for (const p of payouts) {
    const user = userById.get(p.user_id);
    rows.push({
      id: `payout-${p.id}`,
      timestamp: p.requested_at,
      type: "Payout",
      traderName: user?.full_name ?? null,
      email: user?.email ?? "unknown",
      amount: Number(p.amount),
      gateway: "Manual Transfer",
      reference: null,
      status: p.status,
      createdBy: p.status === "pending" ? "System" : (p.paid_by ?? p.approved_by ?? "Admin"),
    });
  }

  return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getTransactionsPage(params: { search?: string; filter?: string; page: number; pageSize: number }) {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let rows = await collectTransactions(serviceClient);

  const filterMap: Record<string, TransactionType> = { payments: "Payment", refunds: "Refund", payouts: "Payout" };
  if (filterMap[filter]) rows = rows.filter((r) => r.type === filterMap[filter]);

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((r) => (r.email ?? "").toLowerCase().includes(term) || (r.traderName ?? "").toLowerCase().includes(term) || (r.reference ?? "").toLowerCase().includes(term));
  }

  const totalCount = rows.length;
  const pageItems = rows.slice((page - 1) * pageSize, page * pageSize);
  return { transactions: pageItems, totalCount };
}

export async function getTransactionDetail(id: string): Promise<TransactionDetail | null> {
  const serviceClient = createServiceClient();
  const [kind, realId] = id.split("-");

  if (kind === "purchase" || kind === "refund") {
    const query = await serviceClient.from("challenge_purchases").select("*").eq("id", realId).single();
    const p = query.data as any;
    if (!p) return null;

    const isRefund = kind === "refund";
    return {
      id,
      type: isRefund ? "Refund" : "Payment",
      timestamp: isRefund ? p.refunded_at : p.created_at,
      amount: Number(p.price_paid),
      status: isRefund ? "completed" : p.payment_status,
      createdBy: isRefund ? (p.refunded_by ?? "Admin") : "System",
      reason: isRefund ? "Manually marked refunded by admin, after a real refund was processed through PalmPay directly." : null,
      linkedPurchaseId: p.id,
      linkedPayoutId: null,
      auditTrail: [
        { label: "Purchase Created", timestamp: p.created_at },
        { label: "Payment Confirmed", timestamp: p.payment_confirmed_at },
        ...(isRefund ? [{ label: "Marked Refunded", timestamp: p.refunded_at }] : []),
      ],
    };
  }

  if (kind === "payout") {
    const query = await serviceClient.from("payout_requests").select("*").eq("id", realId).single();
    const p = query.data as any;
    if (!p) return null;

    return {
      id,
      type: "Payout",
      timestamp: p.requested_at,
      amount: Number(p.amount),
      status: p.status,
      createdBy: p.paid_by ?? p.approved_by ?? "System",
      reason: null,
      linkedPurchaseId: null,
      linkedPayoutId: p.id,
      auditTrail: [
        { label: "Request Submitted", timestamp: p.requested_at },
        { label: "Approved", timestamp: p.approved_at },
        { label: "Paid", timestamp: p.processed_at },
      ],
    };
  }

  return null;
}

export async function getAllTransactionsForExport() {
  const serviceClient = createServiceClient();
  const rows = await collectTransactions(serviceClient);
  return rows.map((r) => ({
    Time: new Date(r.timestamp).toISOString(),
    Type: r.type,
    Trader: r.traderName ?? "",
    Email: r.email,
    Amount: r.amount,
    Gateway: r.gateway,
    Reference: r.reference ?? "",
    Status: r.status,
    "Created By": r.createdBy,
  }));
}
