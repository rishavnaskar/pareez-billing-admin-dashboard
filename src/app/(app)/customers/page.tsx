"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Activity,
  Wallet,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  Eye,
  Cake,
  Phone,
} from "lucide-react";
import { format } from "date-fns";

import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Select, Label } from "@/components/ui/input";
import { Badge, TierBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Spinner, LoadingState, EmptyState, SegmentedControl } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";
import { MessageDialog, type MessageRecipient } from "@/components/MessageDialog";

import { getBillsForCustomer, getWalletTransactions } from "@/lib/firestore";
import { ageFromDob, daysUntilBirthday } from "@/lib/analytics";
import { formatINR, formatNumber } from "@/lib/currency";
import { exportToExcel, exportToPDF, type TableColumn } from "@/lib/export";
import type { Customer, Bill, WalletTransaction, MembershipTier } from "@/lib/types";

// ── customer export columns ───────────────────────────────────────────────────
const customerColumns: TableColumn<Customer>[] = [
  { header: "Name", value: (c) => c.name },
  { header: "Phone", value: (c) => c.phone ?? "" },
  { header: "Tier", value: (c) => c.wallet.tier },
  { header: "Balance", value: (c) => c.wallet.balance },
  { header: "Lifetime Spend", value: (c) => c.wallet.lifetimeSpend },
  { header: "Lifetime Earned", value: (c) => c.wallet.lifetimeEarned },
  { header: "Lifetime Redeemed", value: (c) => c.wallet.lifetimeRedeemed },
  { header: "Joined", value: (c) => format(c.createdAt, "dd MMM yyyy") },
];

type SortKey = "spendDesc" | "balanceDesc" | "nameAsc" | "recent";

// ── wallet txn tone ───────────────────────────────────────────────────────────
function txnTone(
  type: WalletTransaction["type"]
): "green" | "red" | "amber" | "slate" | "blue" {
  if (type === "credit" || type === "welcome_bonus") return "green";
  if (type === "debit") return "red";
  if (type === "adjustment") return "amber";
  if (type === "tier_downgrade") return "slate";
  return "blue";
}

// ── customer detail drawer ────────────────────────────────────────────────────
function CustomerDrawer({
  customer,
  onClose,
  onMessage,
}: {
  customer: Customer | null;
  onClose: () => void;
  onMessage: (r: MessageRecipient) => void;
}) {
  const [tab, setTab] = useState<"bills" | "wallet">("bills");
  const [bills, setBills] = useState<Bill[]>([]);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    setBills([]);
    setTxns([]);
    setTab("bills");
    Promise.all([
      getBillsForCustomer(customer.id),
      getWalletTransactions(customer.id),
    ])
      .then(([b, t]) => {
        setBills(b);
        setTxns(t);
      })
      .finally(() => setLoading(false));
  }, [customer]);

  if (!customer) return null;

  const age = ageFromDob(customer.dateOfBirth);
  const daysLeft = daysUntilBirthday(customer.dateOfBirth);
  const w = customer.wallet;

  return (
    <Dialog
      open={!!customer}
      onClose={onClose}
      size="xl"
      title={
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-900 dark:text-slate-100">{customer.name}</span>
          <TierBadge tier={w.tier} />
        </span>
      }
      description={
        <span className="flex flex-wrap items-center gap-3 text-sm">
          {customer.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </span>
          )}
          {age !== null && <span>Age {age}</span>}
          {daysLeft !== null && (
            <span className="flex items-center gap-1">
              <Cake className="h-3.5 w-3.5 text-brand-500" />
              {daysLeft === 0 ? "Birthday today!" : `Birthday in ${daysLeft}d`}
            </span>
          )}
          <span className="text-muted">
            Joined {format(customer.createdAt, "dd MMM yyyy")}
          </span>
        </span>
      }
    >
      {/* wallet summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        <div className="rounded-xl bg-brand-50 dark:bg-brand-500/10 p-3 text-center">
          <p className="text-xs text-muted mb-1">Balance</p>
          <p className="text-lg font-bold text-brand-700 dark:text-brand-300">{formatINR(w.balance)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-center">
          <p className="text-xs text-muted mb-1">Lifetime Spend</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatINR(w.lifetimeSpend)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-center">
          <p className="text-xs text-muted mb-1">Earned</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatINR(w.lifetimeEarned)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-center">
          <p className="text-xs text-muted mb-1">Redeemed</p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatINR(w.lifetimeRedeemed)}</p>
        </div>
      </div>

      {/* message button */}
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onMessage({
              name: customer.name,
              phone: customer.phone,
              vars: { tier: w.tier, balance: formatINR(w.balance) },
              defaultTemplateId: "loyalty-balance",
            })
          }
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </Button>
      </div>

      {/* tab toggle */}
      <SegmentedControl
        options={[
          { value: "bills", label: `Bills (${bills.length})` },
          { value: "wallet", label: `Wallet History (${txns.length})` },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : tab === "bills" ? (
        bills.length === 0 ? (
          <EmptyState title="No bills found" description="This customer has no recorded bills." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Bill #</TH>
                <TH>Date</TH>
                <TH>Amount</TH>
                <TH>Payment</TH>
                <TH>Cashback</TH>
              </TR>
            </THead>
            <TBody>
              {bills.map((b) => (
                <TR key={b.id}>
                  <TD className="font-mono text-xs">{b.billNumber}</TD>
                  <TD className="whitespace-nowrap text-xs">
                    {format(b.createdAt, "dd MMM yyyy")}
                  </TD>
                  <TD className="font-semibold">{formatINR(b.netPayableAmount ?? b.totalAmount)}</TD>
                  <TD>
                    <Badge tone="slate" className="uppercase">
                      {b.paymentMethod}
                    </Badge>
                  </TD>
                  <TD className="text-emerald-600 dark:text-emerald-400">
                    {b.cashbackEarned > 0 ? `+${formatINR(b.cashbackEarned)}` : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )
      ) : txns.length === 0 ? (
        <EmptyState title="No transactions" description="No wallet transactions recorded." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Type</TH>
              <TH>Amount</TH>
              <TH>Description</TH>
              <TH>Balance After</TH>
              <TH>Date</TH>
            </TR>
          </THead>
          <TBody>
            {txns.map((t) => {
              const isCredit = t.type === "credit" || t.type === "welcome_bonus";
              const isDebit = t.type === "debit";
              return (
                <TR key={t.id}>
                  <TD>
                    <Badge tone={txnTone(t.type)} className="capitalize">
                      {t.type.replace("_", " ")}
                    </Badge>
                  </TD>
                  <TD
                    className={
                      isCredit
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : isDebit
                        ? "font-semibold text-red-600 dark:text-red-400"
                        : "font-semibold text-amber-600 dark:text-amber-400"
                    }
                  >
                    {isCredit ? "+" : isDebit ? "-" : ""}
                    {formatINR(t.amount)}
                  </TD>
                  <TD className="max-w-[200px] truncate text-xs">{t.description}</TD>
                  <TD>{formatINR(t.balanceAfter)}</TD>
                  <TD className="whitespace-nowrap text-xs">
                    {format(t.createdAt, "dd MMM yyyy")}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </Dialog>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const { customers, isLoading } = useData();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | MembershipTier>("all");
  const [sort, setSort] = useState<SortKey>("spendDesc");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [msgRecipient, setMsgRecipient] = useState<MessageRecipient | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);

  // ── stats ──
  const now = Date.now();
  const activeCount = useMemo(
    () =>
      customers.filter(
        (c) => now - c.wallet.lastActivityAt.getTime() <= 60 * 24 * 60 * 60 * 1000
      ).length,
    [customers, now]
  );
  const totalLiability = useMemo(
    () => customers.reduce((s, c) => s + c.wallet.balance, 0),
    [customers]
  );
  const avgSpend = useMemo(
    () =>
      customers.length
        ? customers.reduce((s, c) => s + c.wallet.lifetimeSpend, 0) / customers.length
        : 0,
    [customers]
  );

  // ── filter + sort ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = customers.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q);
      const matchTier = tierFilter === "all" || c.wallet.tier === tierFilter;
      return matchSearch && matchTier;
    });

    result = [...result].sort((a, b) => {
      if (sort === "spendDesc")
        return b.wallet.lifetimeSpend - a.wallet.lifetimeSpend;
      if (sort === "balanceDesc") return b.wallet.balance - a.wallet.balance;
      if (sort === "nameAsc") return a.name.localeCompare(b.name);
      if (sort === "recent")
        return (
          b.wallet.lastActivityAt.getTime() - a.wallet.lastActivityAt.getTime()
        );
      return 0;
    });

    return result;
  }, [customers, search, tierFilter, sort]);

  function openMessage(c: Customer) {
    setMsgRecipient({
      name: c.name,
      phone: c.phone,
      vars: {
        tier: c.wallet.tier,
        balance: formatINR(c.wallet.balance),
      },
      defaultTemplateId: "loyalty-balance",
    });
    setMsgOpen(true);
  }

  if (isLoading && customers.length === 0) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Customers"
          value={formatNumber(customers.length)}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Active (60d)"
          value={formatNumber(activeCount)}
          icon={<Activity className="h-5 w-5" />}
          tone="green"
          hint={`${customers.length ? Math.round((activeCount / customers.length) * 100) : 0}% of total`}
        />
        <StatCard
          label="Wallet Liability"
          value={formatINR(totalLiability)}
          icon={<Wallet className="h-5 w-5" />}
          tone="amber"
          hint="Sum of all balances"
        />
        <StatCard
          label="Avg Lifetime Spend"
          value={formatINR(avgSpend)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="purple"
        />
      </div>

      {/* toolbar */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Search</Label>
              <Input
                placeholder="Name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-36">
              <Label>Tier</Label>
              <Select
                value={tierFilter}
                onChange={(e) =>
                  setTierFilter(e.target.value as "all" | MembershipTier)
                }
              >
                <option value="all">All tiers</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </Select>
            </div>
            <div className="w-48">
              <Label>Sort</Label>
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="spendDesc">Lifetime Spend (High)</option>
                <option value="balanceDesc">Wallet Balance (High)</option>
                <option value="nameAsc">Name A–Z</option>
                <option value="recent">Most Recent</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  exportToExcel(filtered, customerColumns, "customers");
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
                  exportToPDF(filtered, customerColumns, "customers", {
                    title: "Customers Report",
                    summary: [
                      { label: "Total", value: String(filtered.length) },
                      { label: "Wallet Liability", value: formatINR(filtered.reduce((s, c) => s + c.wallet.balance, 0)) },
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
            Showing {filtered.length} of {customers.length} customers
          </p>
        </CardContent>
      </Card>

      {/* table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No customers found"
                description="Try adjusting your search or filters."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Phone</TH>
                  <TH>Tier</TH>
                  <TH>Balance</TH>
                  <TH>Lifetime Spend</TH>
                  <TH>Last Active</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((c) => (
                  <TR key={c.id} className="cursor-pointer">
                    <TD
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-brand-600"
                      onClick={() => setSelectedCustomer(c)}
                    >
                      {c.name}
                    </TD>
                    <TD className="text-muted">{c.phone ?? "—"}</TD>
                    <TD>
                      <TierBadge tier={c.wallet.tier} />
                    </TD>
                    <TD className="font-semibold text-brand-700 dark:text-brand-300">
                      {formatINR(c.wallet.balance)}
                    </TD>
                    <TD>{formatINR(c.wallet.lifetimeSpend)}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted">
                      {format(c.wallet.lastActivityAt, "dd MMM yyyy")}
                    </TD>
                    <TD>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openMessage(c)}
                          title="Send message"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Message
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCustomer(c)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* customer detail drawer */}
      <CustomerDrawer
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onMessage={(r) => {
          setMsgRecipient(r);
          setMsgOpen(true);
        }}
      />

      {/* message dialog */}
      <MessageDialog
        open={msgOpen}
        onClose={() => {
          setMsgOpen(false);
          setMsgRecipient(null);
        }}
        recipient={msgRecipient}
      />
    </div>
  );
}
