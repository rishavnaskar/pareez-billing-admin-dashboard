"use client";

import { useMemo, useState } from "react";
import {
  MessageCircle,
  Send,
  Users,
  Phone,
  AlertCircle,
  ExternalLink,
  Filter,
  Search,
} from "lucide-react";

import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Select, Label } from "@/components/ui/input";
import { Badge, TierBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/ui/misc";
import { StatCard } from "@/components/StatCard";
import { MessageDialog, type MessageRecipient } from "@/components/MessageDialog";

import {
  MESSAGE_TEMPLATES,
  buildWhatsAppLink,
  normalizePhone,
  type TemplateVars,
} from "@/lib/whatsapp";
import { isBirthdayOn } from "@/lib/analytics";
import { formatINR } from "@/lib/currency";
import type { MembershipTier } from "@/lib/types";

// ── segment types ─────────────────────────────────────────────────────────────
type Segment =
  | "all-customers"
  | "by-tier"
  | "inactive-60d"
  | "has-balance"
  | "top-spenders"
  | "birthdays-today"
  | "employees";

const SEGMENT_LABELS: Record<Segment, string> = {
  "all-customers": "All Customers",
  "by-tier": "By Tier",
  "inactive-60d": "Inactive 60d+",
  "has-balance": "Has Wallet Balance",
  "top-spenders": "Top 25 Spenders",
  "birthdays-today": "Birthdays Today",
  employees: "Employees",
};

// Sample vars for template preview
const SAMPLE_VARS: TemplateVars = {
  name: "Riya",
  tier: "Gold",
  balance: "₹250",
  offer: "Flat 20% off this weekend",
  date: "Sat 14 Jun",
};

// Category colour map
const categoryTone: Record<string, "brand" | "blue" | "green" | "amber" | "purple" | "slate"> = {
  birthday: "brand",
  promo: "amber",
  loyalty: "green",
  reminder: "blue",
  thanks: "purple",
  greeting: "slate",
};

export default function MessagingPage() {
  const { customers, employees, isLoading } = useData();
  const toast = useToast();

  const [selectedTemplateId, setSelectedTemplateId] = useState(MESSAGE_TEMPLATES[0].id);
  const [segment, setSegment] = useState<Segment>("all-customers");
  const [tierFilter, setTierFilter] = useState<MembershipTier>("gold");
  const [customOffer, setCustomOffer] = useState("");

  // Quick-send state
  const [quickPhone, setQuickPhone] = useState("");

  // Recipient search
  const [recipientSearch, setRecipientSearch] = useState("");

  // MessageDialog
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgRecipient, setMsgRecipient] = useState<MessageRecipient | null>(null);

  const selectedTemplate = MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? MESSAGE_TEMPLATES[0];

  // Build recipient list from segment
  const recipients = useMemo<MessageRecipient[]>(() => {
    const now = new Date();
    const MS_60D = 60 * 24 * 60 * 60 * 1000;

    if (segment === "employees") {
      return employees
        .filter((e) => e.active)
        .map((e) => ({
          name: e.name,
          phone: e.phone,
          vars: { name: e.name },
          defaultTemplateId: selectedTemplateId,
        }));
    }

    let pool = customers;

    if (segment === "all-customers") {
      // all
    } else if (segment === "by-tier") {
      pool = customers.filter((c) => c.wallet.tier === tierFilter);
    } else if (segment === "inactive-60d") {
      pool = customers.filter(
        (c) => now.getTime() - c.wallet.lastActivityAt.getTime() > MS_60D
      );
    } else if (segment === "has-balance") {
      pool = customers.filter((c) => c.wallet.balance > 0);
    } else if (segment === "top-spenders") {
      pool = [...customers]
        .sort((a, b) => b.wallet.lifetimeSpend - a.wallet.lifetimeSpend)
        .slice(0, 25);
    } else if (segment === "birthdays-today") {
      pool = customers.filter((c) => c.dateOfBirth && isBirthdayOn(c.dateOfBirth, now));
    }

    return pool.map((c) => ({
      name: c.name,
      phone: c.phone,
      vars: {
        name: c.name,
        tier: c.wallet.tier,
        balance: formatINR(c.wallet.balance),
        offer: customOffer || SAMPLE_VARS.offer,
      },
      defaultTemplateId: selectedTemplateId,
    }));
  }, [segment, customers, employees, tierFilter, selectedTemplateId, customOffer]);

  const withPhone = useMemo(
    () => recipients.filter((r) => !!normalizePhone(r.phone)),
    [recipients]
  );

  // Live preview personalised to the first recipient in the segment (real
  // name / tier / balance). Falls back to sample values when the segment is empty.
  const previewRecipient = recipients[0] ?? null;
  const previewVars: TemplateVars = previewRecipient?.vars
    ? { ...previewRecipient.vars, offer: customOffer || SAMPLE_VARS.offer }
    : { ...SAMPLE_VARS, offer: customOffer || SAMPLE_VARS.offer };
  const previewBody = selectedTemplate.body(previewVars);

  // Filter the displayed recipient list by name / phone search
  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.phone ?? "").toLowerCase().includes(q)
    );
  }, [recipients, recipientSearch]);

  const previewRows = filteredRecipients.slice(0, 50);
  const overflowCount = filteredRecipients.length - previewRows.length;

  function openSend(r: MessageRecipient) {
    setMsgRecipient(r);
    setMsgOpen(true);
  }

  function handleQuickSend() {
    const phone = quickPhone.trim();
    if (!phone) {
      toast("Enter a phone number first", "error");
      return;
    }
    const message = selectedTemplate.body({
      ...SAMPLE_VARS,
      offer: customOffer || SAMPLE_VARS.offer,
    });
    const link = buildWhatsAppLink(phone, message);
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
  }

  if (isLoading && customers.length === 0) {
    return <LoadingState label="Loading messaging data…" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Messaging Center</h1>
          <p className="text-sm text-muted">Compose WhatsApp campaigns to customer segments</p>
        </div>
      </div>

      {/* WhatsApp broadcast notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <span className="font-semibold">One chat at a time:</span> WhatsApp opens one conversation
          per click. For true bulk broadcast, use the{" "}
          <strong>WhatsApp Business API</strong>. This tool generates ready-to-send messages
          quickly — click <em>Send</em> on each recipient row to open their WhatsApp chat
          pre-filled.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column: compose + audience */}
        <div className="space-y-6 lg:col-span-2">
          {/* Template picker */}
          <Card>
            <CardHeader>
              <CardTitle>1. Choose a Template</CardTitle>
              <CardDescription>Click a template to select it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {MESSAGE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedTemplateId === t.id
                      ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10 text-brand-800 dark:text-brand-300"
                      : "border-line bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="font-medium">{t.label}</span>
                  <Badge
                    tone={categoryTone[t.category] ?? "slate"}
                    className="ml-2 text-[10px]"
                  >
                    {t.category}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Custom offer input (shown for promo / festive / applicable templates) */}
          {(selectedTemplate.uses.includes("offer") || selectedTemplate.uses.includes("date")) && (
            <Card>
              <CardHeader>
                <CardTitle>Custom Variables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedTemplate.uses.includes("offer") && (
                  <div>
                    <Label>Offer / Custom Text</Label>
                    <Input
                      placeholder={SAMPLE_VARS.offer}
                      value={customOffer}
                      onChange={(e) => setCustomOffer(e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Message Preview</CardTitle>
              <CardDescription>
                {previewRecipient
                  ? `Personalised for ${previewRecipient.name}${
                      previewRecipient.vars?.balance ? ` · wallet ${previewRecipient.vars.balance}` : ""
                    }`
                  : "Sample values — no recipients in this segment"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-sans">
                {previewBody}
              </pre>
            </CardContent>
          </Card>

          {/* Quick send */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Send to a Number</CardTitle>
              <CardDescription>
                Open WhatsApp with the current template pre-filled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleQuickSend} className="shrink-0">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: audience + table */}
        <div className="space-y-6 lg:col-span-3">
          {/* Audience builder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-500" />
                2. Choose Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Segment</Label>
                <Select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as Segment)}
                >
                  {(Object.keys(SEGMENT_LABELS) as Segment[]).map((s) => (
                    <option key={s} value={s}>
                      {SEGMENT_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>

              {segment === "by-tier" && (
                <div>
                  <Label>Tier</Label>
                  <Select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value as MembershipTier)}
                  >
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Audience Size"
              value={recipients.length}
              icon={<Users className="h-4 w-4" />}
              tone="brand"
            />
            <StatCard
              label="With Phone"
              value={withPhone.length}
              icon={<Phone className="h-4 w-4" />}
              tone="green"
              hint="Can receive WhatsApp"
            />
            <StatCard
              label="Template"
              value={<span className="text-sm leading-tight">{selectedTemplate.label}</span>}
              icon={<Send className="h-4 w-4" />}
              tone="purple"
            />
          </div>

          {/* Recipients table */}
          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
              <CardDescription>
                {recipientSearch.trim()
                  ? `${filteredRecipients.length} of ${recipients.length} match "${recipientSearch.trim()}"`
                  : `${recipients.length} total`}
                {overflowCount > 0 ? " — showing first 50" : ""}
                {" "}· click Send on a row to open WhatsApp
              </CardDescription>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  type="search"
                  placeholder="Search recipients by name or phone…"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recipients.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Users className="h-10 w-10" />}
                    title="No recipients in this segment"
                    description="Try a different segment or adjust filters."
                  />
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Search className="h-10 w-10" />}
                    title="No matching recipients"
                    description={`Nothing matches "${recipientSearch.trim()}". Clear the search to see all ${recipients.length}.`}
                  />
                </div>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Name</TH>
                        <TH>Phone</TH>
                        <TH>Tier / Info</TH>
                        <TH>Action</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {previewRows.map((r, i) => {
                        const hasPhone = !!normalizePhone(r.phone);
                        return (
                          <TR key={i}>
                            <TD className="font-medium text-slate-900 dark:text-slate-100">{r.name}</TD>
                            <TD>
                              {r.phone ? (
                                <span className="flex items-center gap-1 text-xs text-muted">
                                  <Phone className="h-3 w-3" />
                                  {r.phone}
                                </span>
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </TD>
                            <TD>
                              {segment !== "employees" && r.vars?.tier ? (
                                <TierBadge tier={r.vars.tier as MembershipTier} />
                              ) : r.vars?.tier ? (
                                <Badge tone="blue">{r.vars.tier}</Badge>
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </TD>
                            <TD>
                              <Button
                                size="sm"
                                variant={hasPhone ? "primary" : "outline"}
                                onClick={() => openSend(r)}
                                title={hasPhone ? "Send via WhatsApp" : "No phone — compose manually"}
                              >
                                <Send className="h-3.5 w-3.5" />
                                Send
                              </Button>
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                  {overflowCount > 0 && (
                    <p className="px-4 py-3 text-center text-xs text-muted">
                      …and {overflowCount} more recipients not shown
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message dialog */}
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
