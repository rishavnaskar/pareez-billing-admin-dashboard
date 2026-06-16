"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  IndianRupee,
  Receipt,
  Users,
  TrendingUp,
  Wallet,
  Cake,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, TierBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { LoadingState, EmptyState, SegmentedControl } from "@/components/ui/misc";
import { StatCard } from "@/components/StatCard";
import {
  RevenueAreaChart,
  DonutChart,
  BarChartH,
} from "@/components/charts/Charts";
import {
  type RangeKey,
  billsInRange,
  computeKpis,
  rangeInterval,
  revenueByDay,
  revenueByMonth,
  paymentMethodBreakdown,
  tierDistribution,
  topServices,
  topCustomers,
  periodComparison,
  isBirthdayOn,
} from "@/lib/analytics";
import { formatINR, formatINRCompact } from "@/lib/currency";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

const PAYMENT_TONE: Record<string, "green" | "blue" | "brand"> = {
  cash: "green",
  card: "blue",
  upi: "brand",
};

export default function DashboardPage() {
  const { bills, customers, isLoading } = useData();
  const [range, setRange] = useState<RangeKey>("month");

  const filtered = useMemo(() => billsInRange(bills, range), [bills, range]);

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  const comparison = useMemo(
    () => (range !== "all" ? periodComparison(bills, range) : null),
    [bills, range]
  );

  const revenueTrend = useMemo(() => {
    if (range === "today" || range === "week" || range === "month") {
      const { start, end } = rangeInterval(range);
      return revenueByDay(filtered, start, end);
    } else {
      const { start, end } = rangeInterval(range);
      return revenueByMonth(filtered, start, end);
    }
  }, [filtered, range]);

  const paymentData = useMemo(
    () =>
      paymentMethodBreakdown(filtered)
        .filter((p) => p.value > 0)
        .map((p) => ({ name: p.method.toUpperCase(), value: p.value })),
    [filtered]
  );

  const tierData = useMemo(
    () =>
      tierDistribution(customers)
        .filter((t) => t.count > 0)
        .map((t) => ({ name: t.tier.charAt(0).toUpperCase() + t.tier.slice(1), value: t.count })),
    [customers]
  );

  const topServicesData = useMemo(
    () => topServices(filtered, 6) as Record<string, string | number>[],
    [filtered]
  );

  const todayBirthdays = useMemo(
    () => customers.filter((c) => isBirthdayOn(c.dateOfBirth)),
    [customers]
  );

  const topCustomersData = useMemo(
    () => topCustomers(filtered, customers, 8),
    [filtered, customers]
  );

  const recentBills = useMemo(() => bills.slice(0, 8), [bills]);

  const walletLiability = useMemo(
    () => customers.reduce((sum, c) => sum + (c.wallet?.balance ?? 0), 0),
    [customers]
  );

  if (isLoading && bills.length === 0) {
    return <LoadingState label="Loading dashboard…" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Overview</h1>
          <p className="mt-0.5 text-sm text-muted">Your salon performance at a glance</p>
        </div>
        <SegmentedControl
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
        />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Net Revenue"
          value={formatINRCompact(kpis.revenue)}
          icon={<IndianRupee className="h-5 w-5" />}
          hint={`Gross ${formatINRCompact(kpis.grossSales)}`}
          changePct={comparison?.changePct}
          tone="brand"
        />
        <StatCard
          label="Bills"
          value={kpis.billCount.toLocaleString("en-IN")}
          icon={<Receipt className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Unique Customers"
          value={kpis.uniqueCustomers.toLocaleString("en-IN")}
          icon={<Users className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Avg Ticket"
          value={formatINRCompact(kpis.avgTicket)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="purple"
        />
        <StatCard
          label="Wallet Liability"
          value={formatINRCompact(walletLiability)}
          icon={<Wallet className="h-5 w-5" />}
          hint="Outstanding wallet balances"
          tone="amber"
        />
      </div>

      {/* Revenue Trend + Payment Methods */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={revenueTrend} height={260} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentData.length > 0 ? (
              <DonutChart data={paymentData} height={260} money />
            ) : (
              <div className="flex h-[260px] items-center justify-center">
                <EmptyState title="No data" description="No bills in selected range" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Membership Tiers + Top Services + Birthdays */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Membership Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            {tierData.length > 0 ? (
              <DonutChart data={tierData} height={240} />
            ) : (
              <div className="flex h-[240px] items-center justify-center">
                <EmptyState title="No customers" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            {topServicesData.length > 0 ? (
              <BarChartH
                data={topServicesData}
                dataKey="revenue"
                nameKey="name"
                height={240}
                money
                color="#8b5cf6"
              />
            ) : (
              <div className="flex h-[240px] items-center justify-center">
                <EmptyState title="No services" description="No bills in selected range" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-brand-500" />
              Today&apos;s Birthdays
            </CardTitle>
            <Link
              href="/birthdays"
              className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {todayBirthdays.length === 0 ? (
              <EmptyState
                icon={<Cake className="h-8 w-8" />}
                title="No birthdays today"
                description="Check back tomorrow"
              />
            ) : (
              <ul className="divide-y divide-line">
                {todayBirthdays.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                      {c.phone && (
                        <p className="text-xs text-muted">{c.phone}</p>
                      )}
                    </div>
                    <TierBadge tier={c.wallet.tier} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top Customers</CardTitle>
          <Link
            href="/customers"
            className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {topCustomersData.length === 0 ? (
            <div className="px-6 py-10">
              <EmptyState title="No customers" description="No bills in selected range" />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-10 pl-6">#</TH>
                  <TH>Customer</TH>
                  <TH>Tier</TH>
                  <TH className="text-right">Visits</TH>
                  <TH className="text-right pr-6">Spend</TH>
                </TR>
              </THead>
              <TBody>
                {topCustomersData.map((c, i) => (
                  <TR key={c.id}>
                    <TD className="pl-6 text-muted font-medium">{i + 1}</TD>
                    <TD>
                      <Link
                        href="/customers"
                        className="font-medium text-slate-800 dark:text-slate-100 hover:text-brand-600 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.phone && (
                        <p className="text-xs text-muted">{c.phone}</p>
                      )}
                    </TD>
                    <TD>
                      <TierBadge tier={c.tier} />
                    </TD>
                    <TD className="text-right">{c.visits}</TD>
                    <TD className="text-right pr-6 font-medium">{formatINR(c.spend)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Bills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Bills</CardTitle>
          <Link
            href="/bills"
            className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentBills.length === 0 ? (
            <div className="px-6 py-10">
              <EmptyState
                icon={<Receipt className="h-8 w-8" />}
                title="No bills yet"
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-6">Bill #</TH>
                  <TH>Customer</TH>
                  <TH>Branch</TH>
                  <TH>Payment</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right pr-6">Time</TH>
                </TR>
              </THead>
              <TBody>
                {recentBills.map((bill) => (
                  <TR key={bill.id}>
                    <TD className="pl-6 font-mono text-xs font-medium text-slate-600 dark:text-slate-300">
                      {bill.billNumber}
                    </TD>
                    <TD>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{bill.customerName}</p>
                      {bill.customerPhone && (
                        <p className="text-xs text-muted">{bill.customerPhone}</p>
                      )}
                    </TD>
                    <TD className="text-muted">{bill.branchName}</TD>
                    <TD>
                      <Badge tone={PAYMENT_TONE[bill.paymentMethod] ?? "slate"}>
                        <CreditCard className="h-3 w-3" />
                        {bill.paymentMethod.toUpperCase()}
                      </Badge>
                    </TD>
                    <TD className="text-right font-semibold text-slate-800 dark:text-slate-100">
                      {formatINR(bill.netPayableAmount || bill.totalAmount)}
                    </TD>
                    <TD className="text-right pr-6 text-muted text-xs">
                      {format(bill.createdAt, "dd MMM, HH:mm")}
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
