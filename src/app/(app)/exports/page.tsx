"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import { format } from "date-fns";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Sheet,
  CheckCircle2,
  IndianRupee,
  Receipt,
  TrendingUp,
  Coins,
  Link2,
  Users,
  Package,
  UserCheck,
  BarChart2,
  GitBranch,
  BookOpen,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/ui/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/misc";
import { StatCard } from "@/components/StatCard";
import {
  exportToExcel,
  exportToPDF,
  exportWorkbook,
  billColumns,
  type TableColumn,
} from "@/lib/export";
import {
  getSheetWebhook,
  pushToSheet,
} from "@/lib/google-sheets";
import {
  type RangeKey,
  billsInRange,
  rangeInterval,
  computeKpis,
  revenueByDay,
  revenueByMonth,
  revenueByBranch,
  topServices,
} from "@/lib/analytics";
import { formatINR, formatNumber } from "@/lib/currency";
import type { Customer, Product, Employee } from "@/lib/types";

// ── range helpers ─────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  all: "All Time",
};

function rangeSubtitle(key: RangeKey): string {
  if (key === "all") return "All time data";
  const { start, end } = rangeInterval(key);
  return `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`;
}

// ── column definitions ────────────────────────────────────────────────────────

const customerColumns: TableColumn<Customer>[] = [
  { header: "Name", value: (c) => c.name },
  { header: "Phone", value: (c) => c.phone ?? "" },
  { header: "Tier", value: (c) => c.wallet.tier },
  { header: "Wallet Balance", value: (c) => c.wallet.balance },
  { header: "Lifetime Spend", value: (c) => c.wallet.lifetimeSpend },
  { header: "Lifetime Earned", value: (c) => c.wallet.lifetimeEarned },
  { header: "Lifetime Redeemed", value: (c) => c.wallet.lifetimeRedeemed },
  { header: "Joined", value: (c) => format(c.createdAt, "dd MMM yyyy") },
];

const productColumns: TableColumn<Product>[] = [
  { header: "Name", value: (p) => p.name },
  { header: "Category", value: (p) => p.category },
  { header: "SKU", value: (p) => p.sku ?? "" },
  { header: "Price (₹)", value: (p) => p.price },
  { header: "Duration (min)", value: (p) => p.durationMinutes ?? "" },
  { header: "Active", value: (p) => (p.active ? "Yes" : "No") },
];

const employeeColumns: TableColumn<Employee>[] = [
  { header: "Name", value: (e) => e.name },
  { header: "Designation", value: (e) => e.designation ?? "" },
  { header: "Phone", value: (e) => e.phone ?? "" },
  { header: "Date of Birth", value: (e) => e.dateOfBirth ?? "" },
  { header: "Joined", value: (e) => e.joinedAt ?? "" },
  { header: "Active", value: (e) => (e.active ? "Yes" : "No") },
];

const revenueSummaryColumns: TableColumn<{ label: string; revenue: number; bills: number }>[] = [
  { header: "Date / Period", value: (r) => r.label },
  { header: "Revenue (₹)", value: (r) => r.revenue },
  { header: "Bills", value: (r) => r.bills },
];

const branchColumns: TableColumn<{ branchId: string; branchName: string; revenue: number; bills: number }>[] = [
  { header: "Branch", value: (r) => r.branchName },
  { header: "Revenue (₹)", value: (r) => r.revenue },
  { header: "Bills", value: (r) => r.bills },
];

// ── component ─────────────────────────────────────────────────────────────────

export default function ExportsPage() {
  const { bills, customers, products, employees, isLoading } = useData();
  const toast = useToast();

  const [range, setRange] = useState<RangeKey>("month");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sendingSheet, setSendingSheet] = useState<string | null>(null);

  // Read localStorage client-side only
  useEffect(() => {
    setSheetUrl(getSheetWebhook());
  }, []);

  // Filtered bills for the selected range
  const filtered = useMemo(() => billsInRange(bills, range), [bills, range]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  // Revenue summary rows
  const revenueSummaryRows = useMemo(() => {
    if (range === "today" || range === "week" || range === "month") {
      const { start, end } = rangeInterval(range);
      return revenueByDay(filtered, start, end);
    }
    const { start, end } = rangeInterval(range === "all" ? "year" : range);
    return revenueByMonth(filtered, start, end);
  }, [filtered, range]);

  const branchRows = useMemo(() => revenueByBranch(filtered), [filtered]);

  // ── export handlers ──────────────────────────────────────────────────────────

  function handleExport(fn: () => void) {
    try {
      fn();
      toast("Export started — check your downloads.", "success");
    } catch (err) {
      toast(`Export failed: ${(err as Error).message}`, "error");
    }
  }

  // Bills
  function exportBillsExcel() {
    handleExport(() =>
      exportToExcel(filtered, billColumns, `pareez-bills-${range}`, "Bills")
    );
  }

  function exportBillsPDF() {
    handleExport(() =>
      exportToPDF(filtered, billColumns, `pareez-bills-${range}`, {
        title: "Sales Report",
        subtitle: rangeSubtitle(range),
        summary: [
          { label: "Revenue", value: formatINR(kpis.revenue) },
          { label: "Bills", value: String(kpis.billCount) },
          { label: "Avg Ticket", value: formatINR(kpis.avgTicket) },
        ],
      })
    );
  }

  // Customers
  function exportCustomersExcel() {
    handleExport(() =>
      exportToExcel(customers, customerColumns, `pareez-customers-${range}`, "Customers")
    );
  }

  function exportCustomersPDF() {
    handleExport(() =>
      exportToPDF(customers, customerColumns, `pareez-customers-${range}`, {
        title: "Customers Report",
        subtitle: `Total customers: ${customers.length}`,
      })
    );
  }

  // Products
  function exportProductsExcel() {
    handleExport(() =>
      exportToExcel(products, productColumns, `pareez-products-${range}`, "Products")
    );
  }

  function exportProductsPDF() {
    handleExport(() =>
      exportToPDF(products, productColumns, `pareez-products-${range}`, {
        title: "Product Catalog",
      })
    );
  }

  // Employees
  function exportEmployeesExcel() {
    handleExport(() =>
      exportToExcel(employees, employeeColumns, `pareez-employees-${range}`, "Employees")
    );
  }

  function exportEmployeesPDF() {
    handleExport(() =>
      exportToPDF(employees, employeeColumns, `pareez-employees-${range}`, {
        title: "Employee Directory",
      })
    );
  }

  // Revenue summary
  function exportRevenueSummaryExcel() {
    handleExport(() =>
      exportToExcel(
        revenueSummaryRows,
        revenueSummaryColumns,
        `pareez-revenue-summary-${range}`,
        "Revenue"
      )
    );
  }

  function exportRevenueSummaryPDF() {
    handleExport(() =>
      exportToPDF(revenueSummaryRows, revenueSummaryColumns, `pareez-revenue-summary-${range}`, {
        title: "Revenue Summary",
        subtitle: rangeSubtitle(range),
      })
    );
  }

  // Branch performance
  function exportBranchExcel() {
    handleExport(() =>
      exportToExcel(branchRows, branchColumns, `pareez-branches-${range}`, "Branches")
    );
  }

  function exportBranchPDF() {
    handleExport(() =>
      exportToPDF(branchRows, branchColumns, `pareez-branches-${range}`, {
        title: "Branch Performance",
        subtitle: rangeSubtitle(range),
      })
    );
  }

  // Full workbook
  function exportFullWorkbook() {
    handleExport(() => {
      const kpiAoa: (string | number)[][] = [
        ["Metric", "Value"],
        ["Revenue (Net)", kpis.revenue],
        ["Gross Sales", kpis.grossSales],
        ["Bill Count", kpis.billCount],
        ["Unique Customers", kpis.uniqueCustomers],
        ["Avg Ticket", kpis.avgTicket],
        ["Cashback Earned", kpis.cashbackEarned],
        ["Wallet Redeemed", kpis.walletRedeemed],
        ["Total Discount", kpis.totalDiscount],
      ];

      const billsAoa: (string | number)[][] = [
        billColumns.map((c) => c.header),
        ...filtered.map((b) => billColumns.map((c) => c.value(b))),
      ];

      const customersAoa: (string | number)[][] = [
        customerColumns.map((c) => c.header),
        ...customers.map((r) => customerColumns.map((c) => c.value(r))),
      ];

      const productsAoa: (string | number)[][] = [
        productColumns.map((c) => c.header),
        ...products.map((r) => productColumns.map((c) => c.value(r))),
      ];

      const topServicesData = topServices(filtered, 20);
      const topServicesAoa: (string | number)[][] = [
        ["Service", "Count", "Revenue (₹)"],
        ...topServicesData.map((s) => [s.name, s.count, s.revenue]),
      ];

      exportWorkbook(
        [
          { name: "Summary KPIs", aoa: kpiAoa },
          { name: "Bills", aoa: billsAoa },
          { name: "Customers", aoa: customersAoa },
          { name: "Products", aoa: productsAoa },
          { name: "Top Services", aoa: topServicesAoa },
        ],
        `pareez-full-report-${range}`
      );
    });
  }

  // Google Sheets push
  async function handleSendToSheet(sheetName: string, headers: string[], rows: (string | number)[][]) {
    setSendingSheet(sheetName);
    try {
      const result = await pushToSheet({ sheet: sheetName, headers, rows, mode: "replace" });
      toast(result.message, result.ok ? "success" : "error");
    } catch (err) {
      toast(`Failed: ${(err as Error).message}`, "error");
    } finally {
      setSendingSheet(null);
    }
  }

  function sendBillsToSheet() {
    const headers = billColumns.map((c) => c.header);
    const rows = filtered.map((b) => billColumns.map((c) => c.value(b)));
    void handleSendToSheet("Bills", headers, rows);
  }

  function sendCustomersToSheet() {
    const headers = customerColumns.map((c) => c.header);
    const rows = customers.map((c) => customerColumns.map((col) => col.value(c)));
    void handleSendToSheet("Customers", headers, rows);
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Data Export Center</h1>
          <p className="mt-0.5 text-sm text-muted">
            {RANGE_LABEL[range]} · {rangeSubtitle(range)}
          </p>
        </div>
        <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>

      {/* KPI row */}
      {isLoading && bills.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Revenue"
            value={formatINR(kpis.revenue)}
            icon={<IndianRupee className="h-5 w-5" />}
            hint={`${kpis.billCount} bills`}
            tone="brand"
          />
          <StatCard
            label="Bills"
            value={formatNumber(kpis.billCount)}
            icon={<Receipt className="h-5 w-5" />}
            tone="blue"
          />
          <StatCard
            label="Avg Ticket"
            value={formatINR(kpis.avgTicket)}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="purple"
          />
          <StatCard
            label="Cashback Earned"
            value={formatINR(kpis.cashbackEarned)}
            icon={<Coins className="h-5 w-5" />}
            tone="amber"
          />
        </div>
      )}

      {/* Report cards grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Report Downloads
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* 1. Bills / Sales */}
          <ReportCard
            icon={<Receipt className="h-5 w-5 text-brand-600" />}
            title="Bills / Sales Report"
            description={`${filtered.length} bills in the selected period`}
            disabled={filtered.length === 0}
            onExcel={exportBillsExcel}
            onPDF={exportBillsPDF}
          />

          {/* 2. Customers */}
          <ReportCard
            icon={<Users className="h-5 w-5 text-blue-600" />}
            title="Customers Report"
            description={`${customers.length} total customers`}
            disabled={customers.length === 0}
            onExcel={exportCustomersExcel}
            onPDF={exportCustomersPDF}
          />

          {/* 3. Product Catalog */}
          <ReportCard
            icon={<Package className="h-5 w-5 text-emerald-600" />}
            title="Product Catalog"
            description={
              products.length === 0
                ? "No products found"
                : `${products.length} products / services`
            }
            disabled={products.length === 0}
            onExcel={exportProductsExcel}
            onPDF={exportProductsPDF}
          />

          {/* 4. Employees */}
          <ReportCard
            icon={<UserCheck className="h-5 w-5 text-purple-600" />}
            title="Employees"
            description={
              employees.length === 0
                ? "No employees found"
                : `${employees.length} staff members`
            }
            disabled={employees.length === 0}
            onExcel={exportEmployeesExcel}
            onPDF={exportEmployeesPDF}
          />

          {/* 5. Revenue Summary */}
          <ReportCard
            icon={<BarChart2 className="h-5 w-5 text-amber-600" />}
            title="Revenue Summary"
            description={`Day-by-day or month-by-month breakdown for ${RANGE_LABEL[range].toLowerCase()}`}
            disabled={filtered.length === 0}
            onExcel={exportRevenueSummaryExcel}
            onPDF={exportRevenueSummaryPDF}
          />

          {/* 6. Branch Performance */}
          <ReportCard
            icon={<GitBranch className="h-5 w-5 text-slate-600" />}
            title="Branch Performance"
            description={`${branchRows.length} branches with activity`}
            disabled={branchRows.length === 0}
            onExcel={exportBranchExcel}
            onPDF={exportBranchPDF}
          />
        </div>
      </div>

      {/* Full workbook */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand-600" />
            <CardTitle>Full Workbook</CardTitle>
          </div>
          <CardDescription>
            All data in a single .xlsx with multiple sheets: Summary KPIs, Bills, Customers,
            Products, and Top Services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportFullWorkbook} variant="primary">
            <Download className="h-4 w-4" />
            Download Full Workbook
          </Button>
        </CardContent>
      </Card>

      {/* Google Sheets section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-emerald-600" />
            <CardTitle>Google Sheets Integration</CardTitle>
            {sheetUrl ? (
              <Badge tone="green">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge tone="slate">Not Connected</Badge>
            )}
          </div>
          <CardDescription>
            Push live data directly to your Google Spreadsheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sheetUrl ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              No Google Sheet connected yet.{" "}
              <a href="/settings" className="font-semibold underline hover:text-amber-900">
                Go to Settings
              </a>{" "}
              to add your Apps Script URL.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={sendBillsToSheet}
                disabled={sendingSheet !== null || filtered.length === 0}
              >
                <Sheet className="h-4 w-4" />
                {sendingSheet === "Bills" ? "Sending…" : `Send Bills to Sheet (${filtered.length})`}
              </Button>
              <Button
                variant="outline"
                onClick={sendCustomersToSheet}
                disabled={sendingSheet !== null || customers.length === 0}
              >
                <Sheet className="h-4 w-4" />
                {sendingSheet === "Customers"
                  ? "Sending…"
                  : `Send Customers to Sheet (${customers.length})`}
              </Button>
            </div>
          )}
          {sheetUrl && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{sheetUrl}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── ReportCard sub-component ──────────────────────────────────────────────────

function ReportCard({
  icon,
  title,
  description,
  disabled,
  onExcel,
  onPDF,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  onExcel: () => void;
  onPDF: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onExcel}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onPDF}
          >
            <FileText className="h-4 w-4 text-red-500" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
