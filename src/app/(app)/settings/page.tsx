"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Save,
  Link2,
  Copy,
  CheckCircle2,
  User,
  Award,
  Coins,
  Unlink,
  Info,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/misc";
import {
  getBranchTierConfig,
  getBranchCashbackConfig,
  saveBranchTierConfig,
  saveBranchCashbackBasics,
} from "@/lib/firestore";
import { getSheetWebhook, setSheetWebhook, APPS_SCRIPT_SNIPPET } from "@/lib/google-sheets";

// ── default values ────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS = { bronze: 0, silver: 5000, gold: 15000, platinum: 30000 };
const DEFAULT_CASHBACK = { welcomeBonus: 50, minBillForCashback: 200 };

// ── component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { branches } = useData();
  const { user } = useAuth();
  const toast = useToast();

  // ── Section 2: Branch config ─────────────────────────────────────────────────
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [configLoading, setConfigLoading] = useState(false);

  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [cashback, setCashback] = useState(DEFAULT_CASHBACK);
  const [eligibleMethods, setEligibleMethods] = useState<Record<string, boolean>>({
    cash: true,
    card: true,
    upi: true,
  });
  const [dayConfigPresent, setDayConfigPresent] = useState(false);

  const [savingTier, setSavingTier] = useState(false);
  const [savingCashback, setSavingCashback] = useState(false);

  // ── Section 3: Google Sheets ─────────────────────────────────────────────────
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookInput, setWebhookInput] = useState("");

  // Load webhook from localStorage on mount
  useEffect(() => {
    const url = getSheetWebhook();
    setWebhookUrl(url);
    setWebhookInput(url);
  }, []);

  // Set first branch as default when branches load
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Load branch config whenever selectedBranchId changes
  const loadBranchConfig = useCallback(async (branchId: string) => {
    if (!branchId) return;
    setConfigLoading(true);
    try {
      const [tierCfg, cashbackCfg] = await Promise.all([
        getBranchTierConfig(branchId),
        getBranchCashbackConfig(branchId),
      ]);

      setThresholds(
        tierCfg?.thresholds
          ? {
              bronze: tierCfg.thresholds.bronze ?? 0,
              silver: tierCfg.thresholds.silver ?? 5000,
              gold: tierCfg.thresholds.gold ?? 15000,
              platinum: tierCfg.thresholds.platinum ?? 30000,
            }
          : DEFAULT_THRESHOLDS
      );

      if (cashbackCfg) {
        setCashback({
          welcomeBonus: cashbackCfg.welcomeBonus,
          minBillForCashback: cashbackCfg.minBillForCashback,
        });
        setEligibleMethods(cashbackCfg.eligiblePaymentMethodsForDiscount);
        setDayConfigPresent(Object.keys(cashbackCfg.dayConfig ?? {}).length > 0);
      } else {
        setCashback(DEFAULT_CASHBACK);
        setEligibleMethods({ cash: true, card: true, upi: true });
        setDayConfigPresent(false);
      }
    } catch (err) {
      toast(`Failed to load branch config: ${(err as Error).message}`, "error");
    } finally {
      setConfigLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedBranchId) {
      void loadBranchConfig(selectedBranchId);
    }
  }, [selectedBranchId, loadBranchConfig]);

  // ── save handlers ─────────────────────────────────────────────────────────────

  async function handleSaveTierThresholds() {
    if (!selectedBranchId) return;
    setSavingTier(true);
    try {
      await saveBranchTierConfig(selectedBranchId, {
        bronze: thresholds.bronze,
        silver: thresholds.silver,
        gold: thresholds.gold,
        platinum: thresholds.platinum,
      });
      toast("Tier thresholds saved successfully.", "success");
    } catch (err) {
      toast(`Save failed: ${(err as Error).message}`, "error");
    } finally {
      setSavingTier(false);
    }
  }

  async function handleSaveCashbackBasics() {
    if (!selectedBranchId) return;
    setSavingCashback(true);
    try {
      await saveBranchCashbackBasics(selectedBranchId, {
        welcomeBonus: cashback.welcomeBonus,
        minBillForCashback: cashback.minBillForCashback,
      });
      toast("Cashback basics saved successfully.", "success");
    } catch (err) {
      toast(`Save failed: ${(err as Error).message}`, "error");
    } finally {
      setSavingCashback(false);
    }
  }

  function handleSaveWebhook() {
    try {
      setSheetWebhook(webhookInput);
      setWebhookUrl(webhookInput.trim());
      toast("Google Sheet connected.", "success");
    } catch (err) {
      toast(`Failed to save: ${(err as Error).message}`, "error");
    }
  }

  function handleDisconnectWebhook() {
    setSheetWebhook("");
    setWebhookUrl("");
    setWebhookInput("");
    toast("Google Sheet disconnected.", "info");
  }

  async function handleCopySnippet() {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
      toast("Apps Script code copied to clipboard.", "success");
    } catch {
      toast("Could not copy — please select and copy manually.", "error");
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Settings className="h-6 w-6 text-brand-600" />
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Configure your dashboard, branch rules, and integrations.
        </p>
      </div>

      {/* ── 1. Account ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-600" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>Your profile and access level.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Email</Label>
              <div className="flex h-10 items-center rounded-lg border border-line bg-slate-50 px-3 text-sm text-slate-600 select-all">
                {user?.email ?? "—"}
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <div className="flex h-10 items-center gap-2">
                <Badge tone={user?.role === "admin" ? "brand" : "slate"}>
                  {user?.role ?? "—"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Info className="mb-0.5 mr-1.5 inline-block h-4 w-4" />
            This dashboard reads and writes to the live Firestore database used by the{" "}
            <span className="font-semibold">pareez-billing</span> app. Changes take effect
            immediately.
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Branch Cashback & Tier Config ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <CardTitle>Branch Cashback & Tier Config</CardTitle>
          </div>
          <CardDescription>
            Configure membership tier thresholds and cashback basics per branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Branch selector */}
          <div className="max-w-xs">
            <Label htmlFor="branch-select">Branch</Label>
            <Select
              id="branch-select"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={branches.length === 0}
            >
              {branches.length === 0 ? (
                <option value="">No branches found</option>
              ) : (
                branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))
              )}
            </Select>
          </div>

          {configLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted py-4">
              <Spinner className="h-4 w-4" />
              Loading branch configuration…
            </div>
          ) : (
            <>
              {/* Tier thresholds */}
              <div className="space-y-4 rounded-xl border border-line bg-slate-50/60 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Membership Tier Thresholds</h3>
                  <p className="mt-0.5 text-xs text-muted">
                    Lifetime spend (₹) required to reach each tier.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {(["bronze", "silver", "gold", "platinum"] as const).map((tier) => (
                    <div key={tier}>
                      <Label htmlFor={`tier-${tier}`} className="capitalize">
                        {tier}
                      </Label>
                      <Input
                        id={`tier-${tier}`}
                        type="number"
                        min={0}
                        value={thresholds[tier]}
                        onChange={(e) =>
                          setThresholds((prev) => ({
                            ...prev,
                            [tier]: Number(e.target.value),
                          }))
                        }
                        disabled={!selectedBranchId}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleSaveTierThresholds}
                  disabled={savingTier || !selectedBranchId}
                  size="sm"
                >
                  {savingTier ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Thresholds
                    </>
                  )}
                </Button>
              </div>

              {/* Cashback basics */}
              <div className="space-y-4 rounded-xl border border-line bg-slate-50/60 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Cashback Basics</h3>
                  <p className="mt-0.5 text-xs text-muted">
                    Welcome bonus and minimum bill required to earn cashback.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="welcome-bonus">Welcome Bonus (₹)</Label>
                    <Input
                      id="welcome-bonus"
                      type="number"
                      min={0}
                      value={cashback.welcomeBonus}
                      onChange={(e) =>
                        setCashback((prev) => ({ ...prev, welcomeBonus: Number(e.target.value) }))
                      }
                      disabled={!selectedBranchId}
                    />
                  </div>
                  <div>
                    <Label htmlFor="min-bill">Min Bill for Cashback (₹)</Label>
                    <Input
                      id="min-bill"
                      type="number"
                      min={0}
                      value={cashback.minBillForCashback}
                      onChange={(e) =>
                        setCashback((prev) => ({
                          ...prev,
                          minBillForCashback: Number(e.target.value),
                        }))
                      }
                      disabled={!selectedBranchId}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveCashbackBasics}
                  disabled={savingCashback || !selectedBranchId}
                  size="sm"
                >
                  {savingCashback ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Cashback Basics
                    </>
                  )}
                </Button>
              </div>

              {/* Read-only: eligible payment methods + dayConfig */}
              <div className="space-y-3 rounded-xl border border-line bg-slate-50/60 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Eligible Payment Methods for Discount
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    Managed in the billing app. Read-only here.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["cash", "card", "upi"] as const).map((method) => (
                    <Badge
                      key={method}
                      tone={eligibleMethods[method] ? "green" : "slate"}
                    >
                      {eligibleMethods[method] ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : null}
                      {method.toUpperCase()}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  <Coins className="mr-1 inline-block h-3.5 w-3.5" />
                  Day/tier cashback rate matrix:{" "}
                  <span className="font-medium text-slate-700">
                    {dayConfigPresent ? "Configured" : "Not configured"}
                  </span>{" "}
                  — edit in the billing app.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Google Spreadsheet ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-emerald-600" />
            <CardTitle>Google Spreadsheet</CardTitle>
            {webhookUrl ? (
              <Badge tone="green">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge tone="slate">Not Connected</Badge>
            )}
          </div>
          <CardDescription>
            Connect a Google Apps Script Web App to push data directly to your spreadsheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL input + save/disconnect */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Apps Script Web App URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSaveWebhook} disabled={!webhookInput.trim()}>
                <Save className="h-4 w-4" />
                Save
              </Button>
              {webhookUrl && (
                <Button variant="outline" onClick={handleDisconnectWebhook}>
                  <Unlink className="h-4 w-4" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>

          {/* Step-by-step instructions */}
          <div className="rounded-xl border border-line bg-slate-50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">How to set up</h3>
            <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
              <li>
                Open your Google Sheet, then go to{" "}
                <span className="font-medium">Extensions → Apps Script</span>.
              </li>
              <li>
                Delete any existing code, then paste the snippet below into the editor.
              </li>
              <li>
                Click <span className="font-medium">Deploy → New deployment</span>, choose{" "}
                <span className="font-medium">Web app</span>.
              </li>
              <li>
                Set <span className="font-medium">Execute as: Me</span> and{" "}
                <span className="font-medium">Who has access: Anyone</span>.
              </li>
              <li>
                Click <span className="font-medium">Deploy</span>, copy the{" "}
                <span className="font-mono text-xs bg-slate-200 px-1 rounded">/exec</span> URL, and
                paste it above.
              </li>
            </ol>
          </div>

          {/* Apps Script snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Apps Script Code</Label>
              <Button variant="ghost" size="sm" onClick={handleCopySnippet}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-slate-900 px-4 py-4 text-xs leading-relaxed text-slate-100 font-mono whitespace-pre max-h-60 overflow-y-auto">
              {APPS_SCRIPT_SNIPPET}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* ── 4. About ─────────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-slate-500" />
            <CardTitle>About</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Pareez Billing Admin Dashboard</span>
            <Badge tone="brand">v1.0</Badge>
          </div>
          <p>
            A real-time admin dashboard for{" "}
            <span className="font-medium text-slate-800">Pareez Unisex Professional Salon</span>.
            It reads live data from the same Firestore project as the billing app, giving owners full
            visibility into revenue, customers, and operations.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Analytics, revenue trends, and KPI tracking</li>
            <li>Customer management with wallet and tier details</li>
            <li>Bills history with search and filtering</li>
            <li>
              <span className="font-medium text-slate-800">Products catalog</span> — a new
              collection managed exclusively by this dashboard
            </li>
            <li>
              <span className="font-medium text-slate-800">Employees directory</span> — another new
              collection managed exclusively by this dashboard
            </li>
            <li>Data export to Excel, PDF, and Google Sheets</li>
            <li>Branch-specific cashback and tier configuration</li>
          </ul>
          <p className="text-xs text-muted border-t border-line pt-3">
            Firestore project: <span className="font-mono">pareez-billing</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
