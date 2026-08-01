import { createServiceClient } from "@/lib/supabase/service";

export interface EmailStats {
  totalSent: number;
  today: number;
  credentialEmails: number;
  riskAlerts: number;
}

export interface EmailRow {
  id: string;
  sentAt: string;
  recipientName: string | null;
  recipientEmail: string | null;
  subject: string;
  category: string;
}

const CATEGORY_KEYWORDS: { match: RegExp; category: string }[] = [
  { match: /credentials|welcome to funded|welcome to phase 2/i, category: "Credentials" },
  { match: /drawdown|hold time|weekend|inactivity/i, category: "Risk Alert" },
  { match: /phase 1 passed|challenge failed/i, category: "Challenge Lifecycle" },
  { match: /payout/i, category: "Payout" },
];

function categorize(title: string): string {
  for (const { match, category } of CATEGORY_KEYWORDS) {
    if (match.test(title)) return category;
  }
  return "General";
}

async function collectEmailEvents(serviceClient: ReturnType<typeof createServiceClient>): Promise<EmailRow[]> {
  const events: EmailRow[] = [];

  // Every notification row genuinely has a matching email sent
  // synchronously in the same function call (notifyTrader), confirmed
  // in check-account/route.ts and every admin action route tonight.
  const notificationsQuery = await serviceClient.from("notifications").select("id, user_id, title, created_at").order("created_at", { ascending: false });
  const notifications = ((notificationsQuery.data ?? []) as unknown as any[]);

  // Credential emails — sent directly at account assignment, never
  // logged as a notification row at all, so must be inferred
  // separately from the real assignment timestamp.
  const accountsQuery = await serviceClient.from("trading_accounts").select("id, login, assigned_at, status").not("assigned_at", "is", null);
  const accounts = ((accountsQuery.data ?? []) as unknown as any[]);
  const accountIds = accounts.map((a) => a.id);
  const challengesQuery = accountIds.length > 0
    ? await serviceClient.from("user_challenges").select("user_id, trading_account_id, created_at").in("trading_account_id", accountIds)
    : { data: [] as any[] };
  const userIdByAccount = new Map(((challengesQuery.data ?? []) as unknown as any[]).map((c) => [c.trading_account_id, c.user_id]));

  const allUserIds = new Set<string>();
  notifications.forEach((n) => allUserIds.add(n.user_id));
  accounts.forEach((a) => { const uid = userIdByAccount.get(a.id); if (uid) allUserIds.add(uid); });

  const usersQuery = allUserIds.size > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", [...allUserIds]) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  for (const n of notifications) {
    const user = userById.get(n.user_id);
    events.push({
      id: n.id,
      sentAt: n.created_at,
      recipientName: user?.full_name ?? null,
      recipientEmail: user?.email ?? null,
      subject: n.title,
      category: categorize(n.title),
    });
  }

  for (const a of accounts) {
    const uid = userIdByAccount.get(a.id);
    const user = uid ? userById.get(uid) : null;
    events.push({
      id: `credentials-${a.id}`,
      sentAt: a.assigned_at,
      recipientName: user?.full_name ?? null,
      recipientEmail: user?.email ?? null,
      subject: `Your Voltex Funding MT5 Account Details — ${a.login}`,
      category: "Credentials",
    });
  }

  return events.sort((x, y) => new Date(y.sentAt).getTime() - new Date(x.sentAt).getTime());
}

export async function getEmailStats(): Promise<EmailStats> {
  const serviceClient = createServiceClient();
  const events = await collectEmailEvents(serviceClient);
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  return {
    totalSent: events.length,
    today: events.filter((e) => e.sentAt >= todayStart).length,
    credentialEmails: events.filter((e) => e.category === "Credentials").length,
    riskAlerts: events.filter((e) => e.category === "Risk Alert").length,
  };
}

export async function getEmailEventsPage(params: { search?: string; category?: string; page: number; pageSize: number }) {
  const serviceClient = createServiceClient();
  const { search, category, page, pageSize } = params;

  let events = await collectEmailEvents(serviceClient);

  if (category && category !== "all") events = events.filter((e) => e.category === category);
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    events = events.filter((e) => (e.recipientEmail ?? "").toLowerCase().includes(term) || (e.recipientName ?? "").toLowerCase().includes(term) || e.subject.toLowerCase().includes(term));
  }

  const totalCount = events.length;
  const pageItems = events.slice((page - 1) * pageSize, page * pageSize);
  return { events: pageItems, totalCount };
}
