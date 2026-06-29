"use client";

import { Fragment, useState, useMemo } from "react";
import {
  Receipt,
  TrendingUp,
  Wallet,
  Gift,
  FileSpreadsheet,
  FileText,
  Share2,
} from "lucide-react";
import { format } from "date-fns";

import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Label } from "@/components/ui/input";
import { Badge, TierBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { LoadingState, EmptyState, SegmentedControl } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";

import { billsInRange, type RangeKey } from "@/lib/analytics";
import { formatINR } from "@/lib/currency";
import { exportToExcel, exportToPDF, billColumns } from "@/lib/export";
import { buildWhatsAppLink, billPublicUrl, generateBillShareMessage } from "@/lib/whatsapp";
import type { Bill, PaymentMethod } from "@/lib/types";

// ── range label helper ────────────────────────────────────────────────────────
const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  all: "All Time",
};

// ── payment badge tone ────────────────────────────────────────────────────────
function paymentTone(method: PaymentMethod): "green" | "blue" | "purple" {
  if (method === "cash") return "green";
  if (method === "card") return "blue";
  return "purple";
}

const MAX_ROWS = 200;

// ── bill detail dialog ────────────────────────────────────────────────────────
function BillDetailDialog({
  bill,
  onClose,
}: {
  bill: Bill | null;
  onClose: () => void;
}) {
  const { customers } = useData();
  if (!bill) return null;

  const serviceTotal = bill.services.reduce(
    (s, svc) => s + (svc.price - svc.discountAmount),
    0
  );
  // Same WhatsApp intent as the billing app's share: only the bill link
  // (no bill number / amount / services), plus header, thanks and socials.
  // Use the customer's CURRENT wallet balance (not the bill's historical
  // walletBalanceAfter, which goes stale once they earn/redeem on later visits)
  // so the cashback nudge reflects what's actually in their wallet today.
  const currentWalletBalance = bill.customerId
    ? customers.find((c) => c.id === bill.customerId)?.wallet.balance
    : undefined;
  const message = generateBillShareMessage(billPublicUrl(bill.id), currentWalletBalance);
  const waLink = buildWhatsAppLink(bill.customerPhone, message);

  return (
    <Dialog
      open={!!bill}
      onClose={onClose}
      size="lg"
      title={`Bill ${bill.billNumber}`}
      description={`${format(bill.createdAt, "dd MMM yyyy, HH:mm")} · ${bill.branchName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <Button variant="success">
                <Share2 className="h-4 w-4" />
                Share on WhatsApp
              </Button>
            </a>
          )}
        </>
      }
    >
      {/* header meta */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-5">
        <div>
          <span className="text-muted">Customer</span>
          <p className="font-medium text-slate-900 dark:text-slate-100">{bill.customerName}</p>
          {bill.customerPhone && (
            <p className="text-xs text-muted">{bill.customerPhone}</p>
          )}
        </div>
        <div>
          <span className="text-muted">Payment</span>
          <p className="mt-0.5">
            <Badge tone={paymentTone(bill.paymentMethod)} className="uppercase">
              {bill.paymentMethod}
            </Badge>
          </p>
        </div>
        <div>
          <span className="text-muted">Branch</span>
          <p className="font-medium text-slate-900 dark:text-slate-100">{bill.branchName}</p>
        </div>
        <div>
          <span className="text-muted">Tier at Purchase</span>
          <p className="mt-0.5">
            <TierBadge tier={bill.customerTierAtPurchase} />
          </p>
        </div>
      </div>

      {/* services table */}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
        Services
      </p>
      <Table>
        <THead>
          <TR>
            <TH>Service</TH>
            <TH>Staff</TH>
            <TH className="text-right">Price</TH>
            <TH className="text-right">Discount</TH>
            <TH className="text-right">Total</TH>
          </TR>
        </THead>
        <TBody>
          {bill.services.map((svc, i) => (
            <TR key={i}>
              <TD className="font-medium">{svc.serviceName}</TD>
              <TD className="text-muted text-xs">{svc.staffName ?? "—"}</TD>
              <TD className="text-right">{formatINR(svc.price)}</TD>
              <TD className="text-right text-red-500">
                {svc.discountAmount > 0
                  ? `- ${formatINR(svc.discountAmount)}`
                  : "—"}
              </TD>
              <TD className="text-right font-semibold">
                {formatINR(svc.price - svc.discountAmount)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {/* totals breakdown */}
      <div className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span>{formatINR(bill.subtotal)}</span>
        </div>
        {bill.discountAmount > 0 && (
          <div className="flex justify-between text-red-600 dark:text-red-400">
            <span>Discount</span>
            <span>- {formatINR(bill.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatINR(bill.totalAmount)}</span>
        </div>
        {bill.walletAmountUsed > 0 && (
          <div className="flex justify-between text-brand-600 dark:text-brand-400">
            <span>Wallet Used</span>
            <span>- {formatINR(bill.walletAmountUsed)}</span>
          </div>
        )}
        {(bill.depositAmountUsed ?? 0) > 0 && (
          <div className="flex justify-between text-brand-600 dark:text-brand-400">
            <span>Deposit Used</span>
            <span>- {formatINR(bill.depositAmountUsed ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-line pt-2 mt-2">
          <span>Net Payable</span>
          <span>{formatINR(bill.netPayableAmount ?? bill.totalAmount)}</span>
        </div>
        {bill.cashbackEarned > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs">
            <span>Cashback Earned</span>
            <span>+ {formatINR(bill.cashbackEarned)}</span>
          </div>
        )}
        {bill.walletBalanceAfter !== undefined && (
          <div className="flex justify-between text-muted text-xs">
            <span>Wallet Balance After</span>
            <span>{formatINR(bill.walletBalanceAfter)}</span>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function BillsPage() {
  const { bills, branches, isLoading } = useData();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [range, setRange] = useState<RangeKey>("month");
  const [branchFilter, setBranchFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentMethod>("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // apply filters
  const filtered = useMemo(() => {
    let result = billsInRange(bills, range);

    if (branchFilter !== "all") {
      result = result.filter((b) => b.branchId === branchFilter);
    }

    if (paymentFilter !== "all") {
      result = result.filter((b) => b.paymentMethod === paymentFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.billNumber.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          (b.customerPhone ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [bills, range, branchFilter, paymentFilter, search]);

  // stats from filtered set
  const totalBills = filtered.length;
  const grossRevenue = useMemo(
    () => filtered.reduce((s, b) => s + b.totalAmount, 0),
    [filtered]
  );
  const netCollected = useMemo(
    () => filtered.reduce((s, b) => s + (b.netPayableAmount ?? b.totalAmount), 0),
    [filtered]
  );
  const totalCashback = useMemo(
    () => filtered.reduce((s, b) => s + b.cashbackEarned, 0),
    [filtered]
  );

  const displayed = filtered.slice(0, MAX_ROWS);
  const isTruncated = filtered.length > MAX_ROWS;

  // Group the visible bills by calendar day, with per-day Total/Cash/Card/UPI
  // sums — mirrors the day sections in the billing app's Recent Bills.
  const dayGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        dayStart: number;
        bills: Bill[];
        totals: { overall: number; cash: number; card: number; upi: number };
      }
    >();
    for (const b of displayed) {
      const d = b.createdAt;
      const key = format(d, "dd MMM yyyy");
      let group = map.get(key);
      if (!group) {
        group = {
          dayStart: new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate()
          ).getTime(),
          bills: [],
          totals: { overall: 0, cash: 0, card: 0, upi: 0 },
        };
        map.set(key, group);
      }
      group.bills.push(b);
      // Per-day "Total / Cash / Card / UPI" are money collected at the counter,
      // so use net payable (after wallet + deposit redemption). The separate
      // "Gross Revenue" stat card already reports the pre-redemption figure.
      const net = b.netPayableAmount ?? b.totalAmount;
      group.totals.overall += net;
      group.totals[b.paymentMethod] += net;
    }
    return Array.from(map.entries())
      .map(([day, data]) => ({
        day,
        ...data,
        bills: [...data.bills].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        ),
      }))
      .sort((a, b) => b.dayStart - a.dayStart);
  }, [displayed]);

  if (isLoading && bills.length === 0) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Bills"
          value={totalBills.toLocaleString()}
          icon={<Receipt className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Gross Revenue"
          value={formatINR(grossRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Net Collected"
          value={formatINR(netCollected)}
          icon={<Wallet className="h-5 w-5" />}
          tone="green"
          hint="After wallet redemptions"
        />
        <StatCard
          label="Cashback Given"
          value={formatINR(totalCashback)}
          icon={<Gift className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      {/* toolbar */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Search</Label>
              <Input
                placeholder="Bill #, customer name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <Label>Date Range</Label>
              <SegmentedControl
                options={[
                  { value: "today", label: "Today" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                  { value: "year", label: "Year" },
                  { value: "all", label: "All" },
                ]}
                value={range}
                onChange={(v) => setRange(v as RangeKey)}
              />
            </div>
            <div className="w-44">
              <Label>Branch</Label>
              <Select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">All branches</option>
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-36">
              <Label>Payment</Label>
              <Select
                value={paymentFilter}
                onChange={(e) =>
                  setPaymentFilter(e.target.value as "all" | PaymentMethod)
                }
              >
                <option value="all">All methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  exportToExcel(filtered, billColumns, "bills");
                  toast("Excel exported", "success");
                }}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  exportToPDF(filtered, billColumns, "bills", {
                    title: "Bills Report",
                    subtitle: `Range: ${RANGE_LABELS[range]}`,
                    summary: [
                      { label: "Bills", value: String(filtered.length) },
                      { label: "Gross Revenue", value: formatINR(grossRevenue) },
                      { label: "Net Collected", value: formatINR(netCollected) },
                      { label: "Cashback Given", value: formatINR(totalCashback) },
                    ],
                  });
                  toast("PDF exported", "success");
                }}
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            {isTruncated
              ? `Showing first ${MAX_ROWS} of ${filtered.length} bills`
              : `Showing ${filtered.length} bill${filtered.length !== 1 ? "s" : ""}`}
            {" · "}{RANGE_LABELS[range]}
          </p>
        </CardContent>
      </Card>

      {/* table */}
      <Card>
        <CardContent className="p-0">
          {displayed.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No bills found"
                description="Try adjusting your filters or date range."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Bill #</TH>
                  <TH>Date</TH>
                  <TH>Customer</TH>
                  <TH>Branch</TH>
                  <TH>Services</TH>
                  <TH className="text-right">Gross</TH>
                  <TH className="text-right">Wallet</TH>
                  <TH className="text-right">Net</TH>
                  <TH className="text-right">Cashback</TH>
                  <TH>Payment</TH>
                  <TH>Tier</TH>
                </TR>
              </THead>
              <TBody>
                {dayGroups.map((group) => (
                  <Fragment key={group.day}>
                    <TR className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <TD colSpan={11} className="py-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {group.day}
                          </span>
                          <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              Total: {formatINR(group.totals.overall)}
                            </span>
                            <span>Cash: {formatINR(group.totals.cash)}</span>
                            <span>Card: {formatINR(group.totals.card)}</span>
                            <span>UPI: {formatINR(group.totals.upi)}</span>
                          </span>
                        </div>
                      </TD>
                    </TR>
                    {group.bills.map((b) => {
                      const serviceNames = b.services
                        .map((s) => s.serviceName)
                        .join(", ");
                      const truncated =
                        serviceNames.length > 40
                          ? serviceNames.slice(0, 40) + "…"
                          : serviceNames;
                      return (
                        <TR
                          key={b.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedBill(b)}
                        >
                          <TD className="font-mono text-xs text-brand-600 dark:text-brand-400">
                            {b.billNumber}
                          </TD>
                          <TD className="whitespace-nowrap text-xs text-muted">
                            {format(b.createdAt, "dd MMM yyyy HH:mm")}
                          </TD>
                          <TD className="font-medium text-slate-900 dark:text-slate-100 max-w-[140px] truncate">
                            {b.customerName}
                          </TD>
                          <TD className="text-xs text-muted max-w-[100px] truncate">
                            {b.branchName}
                          </TD>
                          <TD className="text-xs text-muted max-w-[160px] truncate">
                            {truncated}
                          </TD>
                          <TD className="text-right font-semibold">
                            {formatINR(b.totalAmount)}
                          </TD>
                          <TD className="text-right text-brand-600 dark:text-brand-400 text-xs">
                            {b.walletAmountUsed > 0
                              ? `- ${formatINR(b.walletAmountUsed)}`
                              : "—"}
                          </TD>
                          <TD className="text-right font-bold text-slate-900 dark:text-slate-100">
                            {formatINR(b.netPayableAmount ?? b.totalAmount)}
                          </TD>
                          <TD className="text-right text-emerald-600 dark:text-emerald-400 text-xs">
                            {b.cashbackEarned > 0
                              ? `+ ${formatINR(b.cashbackEarned)}`
                              : "—"}
                          </TD>
                          <TD>
                            <Badge
                              tone={paymentTone(b.paymentMethod)}
                              className="uppercase"
                            >
                              {b.paymentMethod}
                            </Badge>
                          </TD>
                          <TD>
                            <TierBadge tier={b.customerTierAtPurchase} />
                          </TD>
                        </TR>
                      );
                    })}
                  </Fragment>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* bill detail dialog */}
      <BillDetailDialog
        bill={selectedBill}
        onClose={() => setSelectedBill(null)}
      />
    </div>
  );
}
