import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  format,
  isWithinInterval,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns";
import type { Bill, Customer, MembershipTier, PaymentMethod } from "./types";

export type RangeKey = "today" | "week" | "month" | "year" | "all";

export function rangeInterval(key: RangeKey, now = new Date()): { start: Date; end: Date } {
  switch (key) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "all":
    default:
      return { start: new Date(0), end: endOfDay(now) };
  }
}

export function billsInRange(bills: Bill[], key: RangeKey, now = new Date()): Bill[] {
  if (key === "all") return bills;
  const { start, end } = rangeInterval(key, now);
  return bills.filter((b) => isWithinInterval(b.createdAt, { start, end }));
}

export interface Kpis {
  revenue: number; // sum of netPayableAmount (actual cash collected)
  grossSales: number; // sum of totalAmount
  billCount: number;
  uniqueCustomers: number;
  avgTicket: number;
  cashbackEarned: number;
  walletRedeemed: number;
  totalDiscount: number;
}

export function computeKpis(bills: Bill[]): Kpis {
  const revenue = sum(bills, (b) => b.netPayableAmount ?? b.totalAmount);
  const grossSales = sum(bills, (b) => b.totalAmount);
  const billCount = bills.length;
  const uniqueCustomers = new Set(bills.map((b) => b.customerId)).size;
  return {
    revenue,
    grossSales,
    billCount,
    uniqueCustomers,
    avgTicket: billCount ? grossSales / billCount : 0,
    cashbackEarned: sum(bills, (b) => b.cashbackEarned),
    walletRedeemed: sum(bills, (b) => b.walletAmountUsed),
    totalDiscount: sum(bills, (b) => b.discountAmount),
  };
}

/** Revenue per day across an interval (zero-filled). */
export function revenueByDay(
  bills: Bill[],
  start: Date,
  end: Date
): { date: string; label: string; revenue: number; bills: number }[] {
  const days = eachDayOfInterval({ start, end });
  const buckets = new Map<string, { revenue: number; bills: number }>();
  for (const d of days) buckets.set(format(d, "yyyy-MM-dd"), { revenue: 0, bills: 0 });
  for (const b of bills) {
    const key = format(b.createdAt, "yyyy-MM-dd");
    const cur = buckets.get(key);
    if (cur) {
      cur.revenue += b.netPayableAmount ?? b.totalAmount;
      cur.bills += 1;
    }
  }
  return days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const v = buckets.get(key)!;
    return { date: key, label: format(d, "d MMM"), revenue: v.revenue, bills: v.bills };
  });
}

/** Revenue per month across an interval (zero-filled). */
export function revenueByMonth(
  bills: Bill[],
  start: Date,
  end: Date
): { date: string; label: string; revenue: number; bills: number }[] {
  const months = eachMonthOfInterval({ start, end });
  const buckets = new Map<string, { revenue: number; bills: number }>();
  for (const m of months) buckets.set(format(m, "yyyy-MM"), { revenue: 0, bills: 0 });
  for (const b of bills) {
    const key = format(b.createdAt, "yyyy-MM");
    const cur = buckets.get(key);
    if (cur) {
      cur.revenue += b.netPayableAmount ?? b.totalAmount;
      cur.bills += 1;
    }
  }
  return months.map((m) => {
    const key = format(m, "yyyy-MM");
    const v = buckets.get(key)!;
    return { date: key, label: format(m, "MMM yy"), revenue: v.revenue, bills: v.bills };
  });
}

export function paymentMethodBreakdown(
  bills: Bill[]
): { method: PaymentMethod; value: number; count: number }[] {
  const methods: PaymentMethod[] = ["cash", "card", "upi"];
  return methods.map((method) => {
    const subset = bills.filter((b) => b.paymentMethod === method);
    return {
      method,
      value: sum(subset, (b) => b.netPayableAmount ?? b.totalAmount),
      count: subset.length,
    };
  });
}

export function tierDistribution(
  customers: Customer[]
): { tier: MembershipTier; count: number; value: number }[] {
  const tiers: MembershipTier[] = ["bronze", "silver", "gold", "platinum"];
  return tiers.map((tier) => {
    const subset = customers.filter((c) => c.wallet.tier === tier);
    return {
      tier,
      count: subset.length,
      value: sum(subset, (c) => c.wallet.lifetimeSpend),
    };
  });
}

/** Top services by frequency & revenue (services are free-text in bills). */
export function topServices(
  bills: Bill[],
  topN = 10
): { name: string; count: number; revenue: number }[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const b of bills) {
    for (const s of b.services) {
      const name = (s.serviceName || "Unnamed").trim();
      const cur = map.get(name) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += (s.price || 0) - (s.discountAmount || 0);
      map.set(name, cur);
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
}

/** Top staff by revenue handled (from services[].staffName). */
export function topStaff(
  bills: Bill[],
  topN = 10
): { name: string; count: number; revenue: number }[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const b of bills) {
    for (const s of b.services) {
      if (!s.staffName) continue;
      const name = s.staffName.trim();
      const cur = map.get(name) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += (s.price || 0) - (s.discountAmount || 0);
      map.set(name, cur);
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
}

export function topCustomers(
  bills: Bill[],
  customers: Customer[],
  topN = 10
): { id: string; name: string; phone?: string; spend: number; visits: number; tier: MembershipTier }[] {
  const map = new Map<string, { spend: number; visits: number }>();
  for (const b of bills) {
    const cur = map.get(b.customerId) ?? { spend: 0, visits: 0 };
    cur.spend += b.totalAmount;
    cur.visits += 1;
    map.set(b.customerId, cur);
  }
  const byId = new Map(customers.map((c) => [c.id, c]));
  return [...map.entries()]
    .map(([id, v]) => {
      const c = byId.get(id);
      return {
        id,
        name: c?.name ?? "Unknown",
        phone: c?.phone,
        spend: v.spend,
        visits: v.visits,
        tier: c?.wallet.tier ?? "bronze",
      };
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, topN);
}

/** Revenue per branch. */
export function revenueByBranch(
  bills: Bill[]
): { branchId: string; branchName: string; revenue: number; bills: number }[] {
  const map = new Map<string, { branchName: string; revenue: number; bills: number }>();
  for (const b of bills) {
    const cur = map.get(b.branchId) ?? { branchName: b.branchName || b.branchId, revenue: 0, bills: 0 };
    cur.revenue += b.netPayableAmount ?? b.totalAmount;
    cur.bills += 1;
    map.set(b.branchId, cur);
  }
  return [...map.entries()]
    .map(([branchId, v]) => ({ branchId, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Sales by day-of-week (0=Sun..6=Sat) for a heatmap/bar. */
export function salesByWeekday(bills: Bill[]): { day: string; revenue: number; bills: number }[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const acc = labels.map((day) => ({ day, revenue: 0, bills: 0 }));
  for (const b of bills) {
    const i = b.createdAt.getDay();
    acc[i].revenue += b.netPayableAmount ?? b.totalAmount;
    acc[i].bills += 1;
  }
  return acc;
}

/** Sales by hour of day (0..23). */
export function salesByHour(bills: Bill[]): { hour: string; bills: number; revenue: number }[] {
  const acc = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, "0")}:00`,
    bills: 0,
    revenue: 0,
  }));
  for (const b of bills) {
    const h = b.createdAt.getHours();
    acc[h].bills += 1;
    acc[h].revenue += b.netPayableAmount ?? b.totalAmount;
  }
  return acc;
}

/** New vs returning customers per month for the last N months. */
export function customerGrowth(
  customers: Customer[],
  bills: Bill[],
  months = 12,
  now = new Date()
): { label: string; newCustomers: number; activeCustomers: number }[] {
  const start = startOfMonth(subDays(now, months * 31));
  const buckets = eachMonthOfInterval({ start, end: now });
  const firstBillByCustomer = new Map<string, Date>();
  for (const b of [...bills].sort((a, b2) => a.createdAt.getTime() - b2.createdAt.getTime())) {
    if (!firstBillByCustomer.has(b.customerId)) firstBillByCustomer.set(b.customerId, b.createdAt);
  }
  return buckets.map((m) => {
    const mStart = startOfMonth(m);
    const mEnd = endOfMonth(m);
    const newCustomers = customers.filter((c) =>
      isWithinInterval(c.createdAt, { start: mStart, end: mEnd })
    ).length;
    const activeCustomers = new Set(
      bills
        .filter((b) => isWithinInterval(b.createdAt, { start: mStart, end: mEnd }))
        .map((b) => b.customerId)
    ).size;
    return { label: format(m, "MMM yy"), newCustomers, activeCustomers };
  });
}

/** Compare current period vs the immediately preceding one. */
export function periodComparison(
  bills: Bill[],
  key: Exclude<RangeKey, "all">,
  now = new Date()
): { current: number; previous: number; changePct: number } {
  const { start, end } = rangeInterval(key, now);
  const span = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - span - 1);
  const prevEnd = new Date(start.getTime() - 1);
  const current = sum(
    bills.filter((b) => isWithinInterval(b.createdAt, { start, end })),
    (b) => b.netPayableAmount ?? b.totalAmount
  );
  const previous = sum(
    bills.filter((b) => isWithinInterval(b.createdAt, { start: prevStart, end: prevEnd })),
    (b) => b.netPayableAmount ?? b.totalAmount
  );
  const changePct = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
  return { current, previous, changePct };
}

// ── birthdays ────────────────────────────────────────────────────────────────
/** Does a YYYY-MM-DD birthday fall on `ref` month/day? */
export function isBirthdayOn(dob: string | undefined, ref = new Date()): boolean {
  if (!dob) return false;
  const parts = dob.split("-");
  if (parts.length < 3) return false;
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return m === ref.getMonth() + 1 && d === ref.getDate();
}

/** Days until the next occurrence of a birthday from `ref`. */
export function daysUntilBirthday(dob: string | undefined, ref = new Date()): number | null {
  if (!dob) return null;
  const parts = dob.split("-");
  if (parts.length < 3) return null;
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  let next = new Date(ref.getFullYear(), m, d);
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (next < today) next = new Date(ref.getFullYear() + 1, m, d);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export function ageFromDob(dob?: string, ref = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  let age = ref.getFullYear() - d.getFullYear();
  const md = ref.getMonth() - d.getMonth();
  if (md < 0 || (md === 0 && ref.getDate() < d.getDate())) age--;
  return age;
}

// ── tiny helpers ─────────────────────────────────────────────────────────────
function sum<T>(arr: T[], f: (x: T) => number): number {
  let s = 0;
  for (const x of arr) s += f(x) || 0;
  return s;
}
