"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Eye,
  Globe,
  MessageCircle,
  MousePointerClick,
  Phone,
  RefreshCw,
  Users,
  UserX,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { LoadingState, EmptyState, SegmentedControl, Spinner } from "@/components/ui/misc";
import { StatCard } from "@/components/StatCard";
import { MultiLineChart, BarChartV, BarChartH, DonutChart } from "@/components/charts/Charts";
import {
  getWebEvents,
  getWebBookings,
  updateWebBookingStatus,
} from "@/lib/website-firestore";
import {
  type WebRangeKey,
  webRangeStart,
  computeWebKpis,
  trafficByDay,
  viewsByHour,
  topPages,
  trafficSources,
  deviceBreakdown,
  bookingFunnel,
  bookingsInRange,
  requestedServices,
  requestedBranches,
  requestedTimeSlots,
} from "@/lib/website-analytics";
import { formatNumber, formatPercent } from "@/lib/currency";
import type { WebBooking, WebBookingStatus, WebEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

const SITE_URL = "https://pareezsalon.com";

const RANGE_OPTIONS: { value: WebRangeKey; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const STATUS_META: Record<WebBookingStatus, { label: string; tone: "blue" | "amber" | "green" | "slate" }> = {
  new: { label: "New", tone: "blue" },
  contacted: { label: "Contacted", tone: "amber" },
  booked: { label: "Booked", tone: "green" },
  closed: { label: "Closed", tone: "slate" },
};

function waReplyLink(b: WebBooking): string {
  const phone = b.phone.replace(/[^\d]/g, "").replace(/^0+/, "");
  const intl = phone.length === 10 ? `91${phone}` : phone;
  const msg = `Hi ${b.name}! This is Pareez Salon — about your ${b.service} appointment request for ${b.date} at ${b.time} (${b.branchName}). `;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

function Funnel({ steps }: { steps: { label: string; count: number; pctOfFirst: number }[] }) {
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{s.label}</span>
            <span className="text-muted">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatNumber(s.count)}</span>
              {i > 0 && <span className="ml-2 text-xs">{formatPercent(s.pctOfFirst)}</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
              style={{ width: `${Math.max(s.pctOfFirst * 100, s.count > 0 ? 2 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WebsitePage() {
  const [range, setRange] = useState<WebRangeKey>("30d");
  const [events, setEvents] = useState<WebEvent[]>([]);
  const [bookings, setBookings] = useState<WebBooking[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (rangeKey: WebRangeKey) => {
    setLoading(true);
    setError(null);
    try {
      const [ev, bk] = await Promise.all([
        getWebEvents(webRangeStart(rangeKey)),
        getWebBookings(),
      ]);
      setEvents(ev);
      setBookings(bk);
    } catch (err) {
      setError((err as Error).message ?? "Failed to load website analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const start = useMemo(() => webRangeStart(range), [range]);
  const rangeBookings = useMemo(() => bookingsInRange(bookings, start), [bookings, start]);
  const kpis = useMemo(
    () => computeWebKpis(events, rangeBookings.length),
    [events, rangeBookings]
  );
  const timeline = useMemo(() => trafficByDay(events, start, new Date()), [events, start]);
  const pages = useMemo(() => topPages(events), [events]);
  const sources = useMemo(() => trafficSources(events), [events]);
  const devices = useMemo(() => deviceBreakdown(events), [events]);
  const hours = useMemo(() => viewsByHour(events), [events]);
  const funnel = useMemo(() => bookingFunnel(events), [events]);
  const services = useMemo(() => requestedServices(rangeBookings), [rangeBookings]);
  const branches = useMemo(() => requestedBranches(rangeBookings), [rangeBookings]);
  const slots = useMemo(() => requestedTimeSlots(rangeBookings), [rangeBookings]);
  const newCount = useMemo(() => bookings.filter((b) => b.status === "new").length, [bookings]);

  const setStatus = async (id: string, status: WebBookingStatus) => {
    setSavingId(id);
    const prev = bookings;
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    try {
      await updateWebBookingStatus(id, status);
    } catch {
      setBookings(prev);
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading && events.length === 0 && bookings.length === 0) {
    return <LoadingState label="Loading website analytics…" />;
  }

  const noData = events.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Website
            {newCount > 0 && <Badge tone="blue">{newCount} new request{newCount > 1 ? "s" : ""}</Badge>}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Traffic, conversions &amp; appointment requests from{" "}
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 hover:underline"
            >
              pareezsalon.com
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
          <button
            onClick={() => void load(range)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh"
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {noData ? (
        <EmptyState
          icon={<Globe className="h-8 w-8" />}
          title="No website data yet"
          description="Analytics start collecting as soon as the updated website is deployed and gets its first visitor. Check back shortly."
        />
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Page Views"
              value={formatNumber(kpis.pageViews)}
              icon={<Eye className="h-5 w-5" />}
              hint={`${formatNumber(kpis.sessions)} visits (sessions)`}
              tone="brand"
            />
            <StatCard
              label="Unique Visitors"
              value={formatNumber(kpis.visitors)}
              icon={<Users className="h-5 w-5" />}
              hint="Distinct people on the site"
              tone="blue"
            />
            <StatCard
              label="Booking Requests"
              value={formatNumber(kpis.bookingRequests)}
              icon={<CalendarCheck className="h-5 w-5" />}
              hint="Sent via the booking form"
              tone="green"
            />
            <StatCard
              label="Visit → Contact Rate"
              value={formatPercent(kpis.conversionRate)}
              icon={<MousePointerClick className="h-5 w-5" />}
              hint="Visits that tapped WhatsApp, call or booked"
              tone="purple"
            />
          </div>

          {/* Secondary KPI strip — contact actions + form drop-off */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Form Started, Not Booked"
              value={formatNumber(kpis.abandonedForms)}
              icon={<UserX className="h-5 w-5" />}
              hint={
                kpis.formStarts > 0
                  ? `${formatPercent(kpis.abandonmentRate)} of ${formatNumber(kpis.formStarts)} who started filling`
                  : "Filled the form but didn't tap Book"
              }
              tone="amber"
            />
            <StatCard
              label="WhatsApp Clicks"
              value={formatNumber(kpis.whatsappClicks)}
              icon={<MessageCircle className="h-5 w-5" />}
              tone="green"
            />
            <StatCard
              label="Call Clicks"
              value={formatNumber(kpis.callClicks)}
              icon={<Phone className="h-5 w-5" />}
              tone="blue"
            />
            <StatCard
              label="Directions Opened"
              value={formatNumber(kpis.directionsClicks)}
              icon={<Globe className="h-5 w-5" />}
              hint={`${formatNumber(kpis.socialClicks)} Instagram/Facebook taps`}
              tone="purple"
            />
          </div>

          {/* Traffic over time */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <MultiLineChart
                data={timeline}
                lines={[
                  { key: "views", name: "Page views", color: "#ec4899" },
                  { key: "visitors", name: "Visitors", color: "#3b82f6" },
                ]}
                height={300}
              />
            </CardContent>
          </Card>

          {/* Funnel + Top pages */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Booking Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <Funnel steps={funnel} />
                <p className="mt-4 text-xs text-muted">
                  Of every visit, how many reach the booking page and actually get in touch.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Visited Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartH
                  data={pages}
                  dataKey="views"
                  nameKey="page"
                  height={Math.max(200, pages.length * 40)}
                  color="#8b5cf6"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sources + Devices + Hours */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Where Visitors Come From</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart data={sources.slice(0, 6)} height={260} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart data={devices} height={260} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Views by Hour of Day</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartV data={hours} dataKey="views" nameKey="hour" height={260} color="#f59e0b" />
              </CardContent>
            </Card>
          </div>

          {/* Booking insights */}
          {rangeBookings.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Most Requested Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartH
                    data={services.slice(0, 8)}
                    dataKey="requests"
                    nameKey="name"
                    height={Math.max(200, Math.min(services.length, 8) * 44)}
                    color="#ec4899"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Requests by Branch</CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutChart data={branches} height={260} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preferred Time Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartV
                    data={slots}
                    dataKey="requests"
                    nameKey="name"
                    height={260}
                    color="#10b981"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Appointment requests inbox — always visible, even with no traffic data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-brand-500" />
            Appointment Requests
            <span className="text-xs font-normal text-muted">
              from the website booking form (also arrive on WhatsApp)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="h-8 w-8" />}
              title="No booking requests yet"
              description="When a customer fills the booking form on pareezsalon.com, the request appears here with their name, phone, service and preferred slot."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Received</TH>
                  <TH>Customer</TH>
                  <TH>Branch</TH>
                  <TH>Service</TH>
                  <TH>Requested Slot</TH>
                  <TH>Notes</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {bookings.map((b) => (
                  <TR key={b.id} className={cn(b.status === "new" && "bg-blue-50/40")}>
                    <TD className="whitespace-nowrap text-xs text-muted">
                      {formatDistanceToNow(b.createdAt, { addSuffix: true })}
                    </TD>
                    <TD>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{b.name}</div>
                      <div className="text-xs text-muted">{b.phone}</div>
                    </TD>
                    <TD className="whitespace-nowrap">{b.branchName}</TD>
                    <TD>{b.service}</TD>
                    <TD className="whitespace-nowrap">
                      {b.date ? format(new Date(b.date), "d MMM") : "—"} · {b.time}
                    </TD>
                    <TD className="max-w-[180px] truncate text-xs text-muted" title={b.notes}>
                      {b.notes || "—"}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        <Badge tone={STATUS_META[b.status].tone}>{STATUS_META[b.status].label}</Badge>
                        <select
                          value={b.status}
                          disabled={savingId === b.id}
                          onChange={(e) => void setStatus(b.id, e.target.value as WebBookingStatus)}
                          className="rounded-md border border-line bg-white dark:bg-slate-800 px-1.5 py-1 text-xs text-slate-600 dark:text-slate-300"
                        >
                          {(Object.keys(STATUS_META) as WebBookingStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_META[s].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TD>
                    <TD>
                      <a
                        href={waReplyLink(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 transition-colors hover:bg-emerald-100"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Reply
                      </a>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
