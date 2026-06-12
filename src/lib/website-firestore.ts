import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type { WebEvent, WebEventType, WebBooking, WebBookingStatus } from "./types";

// ── helpers ──────────────────────────────────────────────────────────────────
function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// ── Web events ───────────────────────────────────────────────────────────────
function mapWebEvent(id: string, data: DocumentData): WebEvent {
  return {
    id,
    type: (s(data.type) || "pageview") as WebEventType,
    path: s(data.path) || "/",
    label: s(data.label),
    sessionId: s(data.sessionId),
    visitorId: s(data.visitorId),
    device: s(data.device) || "desktop",
    referrer: s(data.referrer),
    utmSource: s(data.utmSource),
    utmMedium: s(data.utmMedium),
    utmCampaign: s(data.utmCampaign),
    ts: toDate(data.ts),
  };
}

/** Events since `start`, newest first. 10k is Firestore's max limit — a salon site stays well under it. */
export async function getWebEvents(start: Date, max = 10000): Promise<WebEvent[]> {
  const snap = await getDocs(
    query(
      collection(db, "webEvents"),
      where("ts", ">=", Timestamp.fromDate(start)),
      orderBy("ts", "desc"),
      fbLimit(max)
    )
  );
  return snap.docs.map((d) => mapWebEvent(d.id, d.data()));
}

// ── Web bookings (appointment requests) ──────────────────────────────────────
function mapWebBooking(id: string, data: DocumentData): WebBooking {
  const status = s(data.status);
  return {
    id,
    name: s(data.name) || "Unknown",
    phone: s(data.phone),
    branchId: s(data.branchId),
    branchName: s(data.branchName),
    service: s(data.service),
    date: s(data.date),
    time: s(data.time),
    notes: s(data.notes),
    status: (["new", "contacted", "booked", "closed"].includes(status)
      ? status
      : "new") as WebBookingStatus,
    device: s(data.device),
    createdAt: toDate(data.createdAt),
  };
}

export async function getWebBookings(max = 500): Promise<WebBooking[]> {
  const snap = await getDocs(
    query(collection(db, "webBookings"), orderBy("createdAt", "desc"), fbLimit(max))
  );
  return snap.docs.map((d) => mapWebBooking(d.id, d.data()));
}

export async function updateWebBookingStatus(
  id: string,
  status: WebBookingStatus
): Promise<void> {
  await updateDoc(doc(db, "webBookings", id), { status });
}
