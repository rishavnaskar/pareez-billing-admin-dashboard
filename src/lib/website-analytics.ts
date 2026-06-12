import { eachDayOfInterval, format, isSameDay, startOfDay, subDays } from "date-fns";
import type { WebBooking, WebEvent } from "./types";

/**
 * Pure aggregation helpers for the Website analytics page.
 * Input: raw `webEvents` / `webBookings` docs written by pareezsalon.com.
 */

export type WebRangeKey = "7d" | "30d" | "90d";

export const WEB_RANGE_DAYS: Record<WebRangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function webRangeStart(key: WebRangeKey, now = new Date()): Date {
  return startOfDay(subDays(now, WEB_RANGE_DAYS[key] - 1));
}

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/services": "Services",
  "/gallery": "Gallery",
  "/locations": "Locations",
  "/locations/garfa": "Garfa branch",
  "/locations/jadavpur": "Jadavpur branch",
  "/book": "Book appointment",
  "/about": "About",
};

export function pageName(path: string): string {
  return PAGE_NAMES[path] ?? path;
}

// ── KPIs ─────────────────────────────────────────────────────────────────────
export interface WebKpis {
  pageViews: number;
  visitors: number;
  sessions: number;
  whatsappClicks: number;
  callClicks: number;
  directionsClicks: number;
  socialClicks: number;
  bookingRequests: number;
  /** sessions that produced a WhatsApp click, call or booking request */
  convertedSessions: number;
  conversionRate: number; // convertedSessions / sessions
}

const CONTACT_TYPES = new Set(["whatsapp_click", "call_click", "booking_submitted"]);

export function computeWebKpis(events: WebEvent[], bookingsInRange: number): WebKpis {
  const views = events.filter((e) => e.type === "pageview");
  const sessions = new Set(views.map((e) => e.sessionId)).size;
  const convertedSessions = new Set(
    events.filter((e) => CONTACT_TYPES.has(e.type)).map((e) => e.sessionId)
  ).size;
  return {
    pageViews: views.length,
    visitors: new Set(views.map((e) => e.visitorId)).size,
    sessions,
    whatsappClicks: events.filter((e) => e.type === "whatsapp_click").length,
    callClicks: events.filter((e) => e.type === "call_click").length,
    directionsClicks: events.filter((e) => e.type === "directions_click").length,
    socialClicks: events.filter(
      (e) => e.type === "instagram_click" || e.type === "facebook_click"
    ).length,
    bookingRequests: bookingsInRange,
    convertedSessions,
    conversionRate: sessions > 0 ? convertedSessions / sessions : 0,
  };
}

// ── Time series ──────────────────────────────────────────────────────────────
export function trafficByDay(
  events: WebEvent[],
  start: Date,
  end: Date
): Record<string, string | number>[] {
  const views = events.filter((e) => e.type === "pageview");
  return eachDayOfInterval({ start, end }).map((day) => {
    const dayViews = views.filter((e) => isSameDay(e.ts, day));
    return {
      label: format(day, "d MMM"),
      views: dayViews.length,
      visitors: new Set(dayViews.map((e) => e.visitorId)).size,
    };
  });
}

export function viewsByHour(events: WebEvent[]): Record<string, string | number>[] {
  const counts = new Array<number>(24).fill(0);
  for (const e of events) {
    if (e.type === "pageview") counts[e.ts.getHours()]++;
  }
  return counts.map((views, h) => ({
    hour: `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`,
    views,
  }));
}

// ── Breakdowns ───────────────────────────────────────────────────────────────
export function topPages(events: WebEvent[], max = 8): Record<string, string | number>[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.type === "pageview") counts.set(e.path, (counts.get(e.path) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([path, views]) => ({ page: pageName(path), views }));
}

function sourceName(e: WebEvent): string {
  const src = (e.utmSource || e.referrer).toLowerCase();
  if (!src) return "Direct / typed in";
  if (src.includes("instagram")) return "Instagram";
  if (src.includes("facebook") || src === "fb" || src.includes("fb.com")) return "Facebook";
  if (src.includes("google")) return "Google";
  if (src.includes("whatsapp") || src === "wa") return "WhatsApp";
  if (src.includes("bing")) return "Bing";
  return e.utmSource || e.referrer;
}

/** Where sessions came from — each session attributed to its first known source. */
export function trafficSources(events: WebEvent[]): { name: string; value: number }[] {
  const bySession = new Map<string, string>();
  // events arrive newest-first; iterate backwards so the earliest event wins
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type !== "pageview" || bySession.has(e.sessionId)) continue;
    bySession.set(e.sessionId, sourceName(e));
  }
  const counts = new Map<string, number>();
  for (const name of bySession.values()) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

export function deviceBreakdown(events: WebEvent[]): { name: string; value: number }[] {
  const bySession = new Map<string, string>();
  for (const e of events) {
    if (e.type === "pageview" && !bySession.has(e.sessionId))
      bySession.set(e.sessionId, e.device);
  }
  const counts = new Map<string, number>();
  for (const d of bySession.values()) counts.set(d, (counts.get(d) ?? 0) + 1);
  const order = ["mobile", "desktop", "tablet"];
  return [...counts.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([name, value]) => ({ name: name[0].toUpperCase() + name.slice(1), value }));
}

// ── Funnel ───────────────────────────────────────────────────────────────────
export interface FunnelStep {
  label: string;
  count: number;
  pctOfFirst: number;
}

export function bookingFunnel(events: WebEvent[]): FunnelStep[] {
  const sessions = new Set(
    events.filter((e) => e.type === "pageview").map((e) => e.sessionId)
  ).size;
  const bookPage = new Set(
    events
      .filter((e) => e.type === "pageview" && e.path === "/book")
      .map((e) => e.sessionId)
  ).size;
  const contacted = new Set(
    events
      .filter((e) => e.type === "whatsapp_click" || e.type === "call_click")
      .map((e) => e.sessionId)
  ).size;
  const booked = new Set(
    events.filter((e) => e.type === "booking_submitted").map((e) => e.sessionId)
  ).size;
  const pct = (n: number) => (sessions > 0 ? n / sessions : 0);
  return [
    { label: "Visited the website", count: sessions, pctOfFirst: 1 },
    { label: "Opened the booking page", count: bookPage, pctOfFirst: pct(bookPage) },
    { label: "Tapped WhatsApp / Call", count: contacted, pctOfFirst: pct(contacted) },
    { label: "Sent a booking request", count: booked, pctOfFirst: pct(booked) },
  ];
}

// ── Booking insights ─────────────────────────────────────────────────────────
export function bookingsInRange(bookings: WebBooking[], start: Date): WebBooking[] {
  return bookings.filter((b) => b.createdAt >= start);
}

function countBy(
  bookings: WebBooking[],
  key: (b: WebBooking) => string
): Record<string, string | number>[] {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const k = key(b) || "—";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, requests]) => ({ name, requests }));
}

export function requestedServices(bookings: WebBooking[]): Record<string, string | number>[] {
  return countBy(bookings, (b) => b.service);
}

export function requestedBranches(bookings: WebBooking[]): { name: string; value: number }[] {
  return countBy(bookings, (b) => b.branchName).map((r) => ({
    name: String(r.name),
    value: Number(r.requests),
  }));
}

export function requestedTimeSlots(bookings: WebBooking[]): Record<string, string | number>[] {
  const counts = countBy(bookings, (b) => b.time);
  // chronological slot order reads better than by count
  const slotMinutes = (t: string): number => {
    const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t);
    if (!m) return 9999;
    let h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) h += 12;
    return h * 60 + parseInt(m[2], 10);
  };
  return counts.sort((a, b) => slotMinutes(String(a.name)) - slotMinutes(String(b.name)));
}
