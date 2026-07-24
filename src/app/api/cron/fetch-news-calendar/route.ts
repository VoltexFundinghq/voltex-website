import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Fetches today's ForexFactory economic calendar via JBlanked's News
 * API (github.com/jblanked/JB-News), storing only HIGH-IMPACT events —
 * that's the only tier our News Trading rule actually cares about.
 * Triggered once daily by Vercel Cron (see vercel.json) — sufficient
 * since we check trades RETROSPECTIVELY against this stored schedule,
 * never live.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.JBLANKED_API_KEY;
  if (!apiKey) {
    console.error("JBLANKED_API_KEY not configured");
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const response = await fetch("https://www.jblanked.com/news/api/forex-factory/calendar/today/", {
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error("JBlanked fetch failed:", response.status, await response.text());
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 502 });
  }

  const events = await response.json();
  const serviceClient = createServiceClient();

  let stored = 0;
  for (const event of events) {
    const impact = (event.Impact ?? event.impact ?? "").toString();
    if (impact.toLowerCase() !== "high") continue; // only high-impact events matter for this rule

    const rawDate = event.Date ?? event.date;
    if (!rawDate) continue;

    // JBlanked's confirmed format: "YYYY.MM.DD HH:MM"
    const isoLike = rawDate.replace(/\./g, "-").replace(" ", "T") + ":00Z";
    const eventTime = new Date(isoLike);
    if (isNaN(eventTime.getTime())) continue;

    const { error } = await (serviceClient.from("news_events") as any)
      .upsert(
        {
          event_name: event.Name ?? event.name,
          currency: event.Currency ?? event.currency,
          impact: "High",
          event_time: eventTime.toISOString(),
        },
        { onConflict: "event_name,currency,event_time", ignoreDuplicates: true }
      );

    if (!error) stored++;
  }

  return NextResponse.json({ status: "ok", totalEvents: events.length, highImpactStored: stored });
}
