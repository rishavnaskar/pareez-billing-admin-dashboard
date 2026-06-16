"use client";

import { useMemo, useState } from "react";
import {
  Cake,
  Gift,
  Users,
  Calendar,
  PartyPopper,
  Phone,
  Filter,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";

import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge, TierBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { LoadingState, EmptyState, SegmentedControl } from "@/components/ui/misc";
import { StatCard } from "@/components/StatCard";
import { MessageDialog, type MessageRecipient } from "@/components/MessageDialog";
import { Select, Label } from "@/components/ui/input";

import {
  isBirthdayOn,
  daysUntilBirthday,
  ageFromDob,
} from "@/lib/analytics";
import type { BirthdayPerson, MembershipTier } from "@/lib/types";

type ScopeFilter = "today" | "week" | "month" | "all";
type KindFilter = "all" | "customer" | "employee";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDob(dob: string): string {
  try {
    // dob is YYYY-MM-DD, display as "12 March"
    const parts = dob.split("-");
    if (parts.length < 3) return dob;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return format(d, "d MMMM");
  } catch {
    return dob;
  }
}

export default function BirthdaysPage() {
  const { customers, employees, isLoading } = useData();
  const toast = useToast();

  const [scope, setScope] = useState<ScopeFilter>("today");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgRecipient, setMsgRecipient] = useState<MessageRecipient | null>(null);

  const now = new Date();

  // Build unified person list
  const allPeople = useMemo<BirthdayPerson[]>(() => {
    const fromCustomers: BirthdayPerson[] = customers
      .filter((c) => !!c.dateOfBirth)
      .map((c) => ({
        id: c.id,
        kind: "customer" as const,
        name: c.name,
        phone: c.phone,
        dateOfBirth: c.dateOfBirth!,
        meta: c.wallet.tier,
      }));

    const fromEmployees: BirthdayPerson[] = employees
      .filter((e) => !!e.dateOfBirth && e.active)
      .map((e) => ({
        id: e.id,
        kind: "employee" as const,
        name: e.name,
        phone: e.phone,
        dateOfBirth: e.dateOfBirth!,
        meta: e.designation,
      }));

    return [...fromCustomers, ...fromEmployees];
  }, [customers, employees]);

  // Birthday counts for stat cards
  const todayPeople = useMemo(
    () => allPeople.filter((p) => isBirthdayOn(p.dateOfBirth, now)),
    [allPeople, now]
  );

  const weekPeople = useMemo(
    () =>
      allPeople.filter((p) => {
        const d = daysUntilBirthday(p.dateOfBirth, now);
        return d !== null && d <= 7;
      }),
    [allPeople, now]
  );

  const monthPeople = useMemo(
    () =>
      allPeople.filter((p) => {
        const parts = p.dateOfBirth.split("-");
        return parts.length >= 2 && Number(parts[1]) === now.getMonth() + 1;
      }),
    [allPeople, now]
  );

  // Filtered list for display
  const displayed = useMemo(() => {
    let subset: BirthdayPerson[];
    if (scope === "today") {
      subset = todayPeople;
    } else if (scope === "week") {
      subset = weekPeople;
    } else if (scope === "month") {
      subset = monthPeople;
    } else {
      subset = allPeople;
    }

    if (kindFilter !== "all") {
      subset = subset.filter((p) => p.kind === kindFilter);
    }

    return [...subset].sort((a, b) => {
      const da = daysUntilBirthday(a.dateOfBirth, now) ?? 999;
      const db = daysUntilBirthday(b.dateOfBirth, now) ?? 999;
      return da - db;
    });
  }, [scope, kindFilter, allPeople, todayPeople, weekPeople, monthPeople, now]);

  function openWish(person: BirthdayPerson) {
    setMsgRecipient({
      name: person.name,
      phone: person.phone,
      vars: {
        name: person.name,
        tier: person.kind === "customer" ? (person.meta as MembershipTier) : undefined,
      },
      defaultTemplateId: person.kind === "customer" ? "birthday" : "birthday-employee",
    });
    setMsgOpen(true);
  }

  if (isLoading && customers.length === 0 && employees.length === 0) {
    return <LoadingState label="Loading birthday data…" />;
  }

  const hasToday = todayPeople.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero / Today section */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-50 via-pink-50 to-purple-50 dark:from-brand-500/15 dark:via-pink-500/10 dark:to-purple-500/15 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-4xl shadow-sm">
                🎂
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Birthday Center</h1>
                <p className="text-sm text-muted">
                  {hasToday
                    ? `🎉 ${todayPeople.length} birthday${todayPeople.length > 1 ? "s" : ""} today — send some love!`
                    : "No birthdays today — check upcoming ones below."}
                </p>
              </div>
            </div>
            {hasToday && (
              <div className="flex flex-wrap gap-2">
                {todayPeople.slice(0, 3).map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    onClick={() => openWish(p)}
                    className="gap-1.5"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    Wish {p.name.split(" ")[0]} 🎂
                  </Button>
                ))}
                {todayPeople.length > 3 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setScope("today");
                      toast(
                        `${todayPeople.length} birthday wishes ready — click each "Wish" button below.`,
                        "info"
                      );
                    }}
                  >
                    +{todayPeople.length - 3} more
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Today's birthday cards */}
          {hasToday && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayPeople.map((p) => {
                const age = ageFromDob(p.dateOfBirth, now);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl bg-white/80 dark:bg-slate-800 px-4 py-3 shadow-sm"
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                        p.kind === "customer" ? "bg-brand-500" : "bg-blue-500"
                      }`}
                    >
                      {getInitials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                      <p className="text-xs text-muted">
                        {age !== null ? `Turning ${age}` : formatDob(p.dateOfBirth)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openWish(p)}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      Wish
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Birthdays Today"
          value={todayPeople.length}
          icon={<PartyPopper className="h-5 w-5" />}
          tone="brand"
          hint="Customers + Employees"
        />
        <StatCard
          label="This Week"
          value={weekPeople.length}
          icon={<Cake className="h-5 w-5" />}
          tone="purple"
          hint="Next 7 days"
        />
        <StatCard
          label="This Month"
          value={monthPeople.length}
          icon={<Calendar className="h-5 w-5" />}
          tone="blue"
          hint={format(now, "MMMM yyyy")}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Scope</p>
              <SegmentedControl<ScopeFilter>
                options={[
                  { value: "today", label: "Today" },
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
                  { value: "all", label: "All" },
                ]}
                value={scope}
                onChange={setScope}
              />
            </div>
            <div className="w-40">
              <Label className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Type
              </Label>
              <Select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as KindFilter)}
              >
                <option value="all">All people</option>
                <option value="customer">Customers only</option>
                <option value="employee">Employees only</option>
              </Select>
            </div>
            <p className="ml-auto text-sm text-muted">
              {displayed.length} result{displayed.length !== 1 ? "s" : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Person list */}
      {displayed.length === 0 ? (
        <EmptyState
          icon={<Cake className="h-10 w-10" />}
          title="No birthdays in this range"
          description="Try expanding to a wider scope or switch to 'All'."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-500" />
              Birthday List
            </CardTitle>
            <CardDescription>
              Sorted by days until birthday (soonest first)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Person</TH>
                  <TH>Type</TH>
                  <TH>Date</TH>
                  <TH>Age</TH>
                  <TH>Countdown</TH>
                  <TH>Tier / Role</TH>
                  <TH>Phone</TH>
                  <TH>Action</TH>
                </TR>
              </THead>
              <TBody>
                {displayed.map((p) => {
                  const age = ageFromDob(p.dateOfBirth, now);
                  const days = daysUntilBirthday(p.dateOfBirth, now);
                  const isToday = days === 0;

                  return (
                    <TR key={`${p.kind}-${p.id}`}>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                              p.kind === "customer" ? "bg-brand-500" : "bg-blue-500"
                            }`}
                          >
                            {getInitials(p.name)}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                        </div>
                      </TD>
                      <TD>
                        <Badge tone={p.kind === "customer" ? "brand" : "blue"} className="capitalize">
                          {p.kind}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-sm">
                        {formatDob(p.dateOfBirth)}
                      </TD>
                      <TD className="text-muted">
                        {age !== null ? `${age} yrs` : "—"}
                      </TD>
                      <TD>
                        {isToday ? (
                          <Badge tone="green">🎂 Today!</Badge>
                        ) : days !== null ? (
                          <Badge tone="slate">in {days}d</Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TD>
                      <TD>
                        {p.kind === "customer" && p.meta ? (
                          <TierBadge tier={p.meta as MembershipTier} />
                        ) : p.meta ? (
                          <Badge tone="slate">{p.meta}</Badge>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </TD>
                      <TD>
                        {p.phone ? (
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <Phone className="h-3 w-3" />
                            {p.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </TD>
                      <TD>
                        <Button
                          size="sm"
                          variant={isToday ? "primary" : "outline"}
                          onClick={() => openWish(p)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Wish
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
