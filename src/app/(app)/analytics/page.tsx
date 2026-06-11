"use client";

import { useState, useMemo } from "react";
import { BarChart2, TrendingUp, Wallet, Tag, Users, IndianRupee } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingState, EmptyState, SegmentedControl } from "@/components/ui/misc";
import { StatCard } from "@/components/StatCard";
import {
  MultiLineChart,
  BarChartV,
  BarChartH,
} from "@/components/charts/Charts";
import {
  type RangeKey,
  billsInRange,
  computeKpis,
  rangeInterval,
  revenueByDay,
  revenueByMonth,
  salesByWeekday,
  salesByHour,
  customerGrowth,
  revenueByBranch,
  topStaff,
} from "@/lib/analytics";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/currency";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

export default function AnalyticsPage() {
  const { bills, customers, isLoading } = useData();
  const [range, setRange] = useState<RangeKey>("year");

  const filtered = useMemo(() => billsInRange(bills, range), [bills, range]);

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  const timelineData = useMemo((): Record<string, string | number>[] => {
    if (range === "today" || range === "week" || range === "month") {
      const { start, end } = rangeInterval(range);
      return revenueByDay(filtered, start, end);
    } else {
      const { start, end } = rangeInterval(range);
      return revenueByMonth(filtered, start, end);
    }
  }, [filtered, range]);

  const weekdayData = useMemo(
    () => salesByWeekday(filtered) as Record<string, string | number>[],
    [filtered]
  );

  const hourData = useMemo(
    () => salesByHour(filtered) as Record<string, string | number>[],
    [filtered]
  );

  const growthData = useMemo(
    () => customerGrowth(customers, bills, 12) as Record<string, string | number>[],
    [customers, bills]
  );

  const branchData = useMemo(
    () => revenueByBranch(filtered) as Record<string, string | number>[],
    [filtered]
  );

  const staffData = useMemo(
    () => topStaff(filtered, 8) as Record<string, string | number>[],
    [filtered]
  );

  const loyaltyStats = useMemo(() => {
    const totalBalance = customers.reduce((s, c) => s + (c.wallet?.balance ?? 0), 0);
    const totalEarned = customers.reduce((s, c) => s + (c.wallet?.lifetimeEarned ?? 0), 0);
    const totalRedeemed = customers.reduce((s, c) => s + (c.wallet?.lifetimeRedeemed ?? 0), 0);
    const redemptionRate = totalEarned > 0 ? totalRedeemed / totalEarned : 0;
    const avgBalance = customers.length > 0 ? totalBalance / customers.length : 0;
    return { totalBalance, totalEarned, totalRedeemed, redemptionRate, avgBalance };
  }, [customers]);

  if (isLoading && bills.length === 0) {
    return <LoadingState label="Loading analytics…" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted">Deep-dive into your salon&apos;s performance</p>
        </div>
        <SegmentedControl
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
        />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Gross Sales"
          value={formatINRCompact(kpis.grossSales)}
          icon={<IndianRupee className="h-5 w-5" />}
          hint="Before discounts & wallet"
          tone="brand"
        />
        <StatCard
          label="Net Revenue"
          value={formatINRCompact(kpis.revenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          hint="Cash actually collected"
          tone="green"
        />
        <StatCard
          label="Wallet Redeemed"
          value={formatINRCompact(kpis.walletRedeemed)}
          icon={<Wallet className="h-5 w-5" />}
          tone="purple"
        />
        <StatCard
          label="Total Discounts"
          value={formatINRCompact(kpis.totalDiscount)}
          icon={<Tag className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      {/* Revenue & Bills Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue &amp; Bills Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiLineChart
            data={timelineData}
            lines={[
              { key: "revenue", name: "Revenue (₹)", color: "#db2777" },
              { key: "bills", name: "Bills", color: "#3b82f6" },
            ]}
            height={300}
          />
        </CardContent>
      </Card>

      {/* Sales by Weekday + Sales by Hour */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartV
              data={weekdayData}
              dataKey="revenue"
              nameKey="day"
              height={260}
              money
              color="#ec4899"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Hour of Day</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartV
              data={hourData}
              dataKey="bills"
              nameKey="hour"
              height={260}
              color="#8b5cf6"
            />
          </CardContent>
        </Card>
      </div>

      {/* Customer Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-500" />
            Customer Growth (12 months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MultiLineChart
            data={growthData}
            lines={[
              { key: "newCustomers", name: "New Customers", color: "#10b981" },
              { key: "activeCustomers", name: "Active Customers", color: "#3b82f6" },
            ]}
            height={280}
          />
        </CardContent>
      </Card>

      {/* Revenue by Branch + Top Staff */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            {branchData.length > 0 ? (
              <BarChartH
                data={branchData}
                dataKey="revenue"
                nameKey="branchName"
                height={Math.max(200, branchData.length * 50)}
                money
                color="#3b82f6"
              />
            ) : (
              <EmptyState
                icon={<BarChart2 className="h-8 w-8" />}
                title="No branch data"
                description="No bills in selected range"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Staff by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {staffData.length > 0 ? (
              <BarChartH
                data={staffData}
                dataKey="revenue"
                nameKey="name"
                height={Math.max(200, staffData.length * 50)}
                money
                color="#f59e0b"
              />
            ) : (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No staff data"
                description="Staff names are captured from bill line items. Bills with no staff name assigned will not appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-brand-500" />
            Loyalty Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-muted">Total Wallet Liability</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900">
                {formatINR(loyaltyStats.totalBalance)}
              </p>
              <p className="mt-0.5 text-xs text-muted">Outstanding balances</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-muted">Lifetime Cashback Earned</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900">
                {formatINR(loyaltyStats.totalEarned)}
              </p>
              <p className="mt-0.5 text-xs text-muted">Across all customers</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-muted">Total Redeemed</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900">
                {formatINR(loyaltyStats.totalRedeemed)}
              </p>
              <p className="mt-0.5 text-xs text-muted">Cashback used in bills</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-muted">Redemption Rate</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900">
                {formatPercent(loyaltyStats.redemptionRate)}
              </p>
              <p className="mt-0.5 text-xs text-muted">Redeemed / earned</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-muted">Avg Balance / Customer</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900">
                {formatINR(loyaltyStats.avgBalance)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Across {customers.length.toLocaleString("en-IN")} customers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
