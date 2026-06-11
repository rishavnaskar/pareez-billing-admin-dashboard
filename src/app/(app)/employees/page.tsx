"use client";

import { useState, useMemo } from "react";
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Search,
  Cake,
  Phone,
  Mail,
  FileSpreadsheet,
  FileText,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";

import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { LoadingState, EmptyState } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";
import { MessageDialog, type MessageRecipient } from "@/components/MessageDialog";

import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "@/lib/firestore";
import { ageFromDob, daysUntilBirthday, isBirthdayOn } from "@/lib/analytics";
import { formatNumber } from "@/lib/currency";
import { exportToExcel, exportToPDF, type TableColumn } from "@/lib/export";
import type { Employee } from "@/lib/types";

// ── export columns ────────────────────────────────────────────────────────────
const employeeColumns: TableColumn<Employee>[] = [
  { header: "Name", value: (e) => e.name },
  { header: "Designation", value: (e) => e.designation ?? "" },
  { header: "Phone", value: (e) => e.phone ?? "" },
  { header: "Email", value: (e) => e.email ?? "" },
  { header: "Date of Birth", value: (e) => e.dateOfBirth ?? "" },
  { header: "Joined", value: (e) => e.joinedAt ?? "" },
  { header: "Branch", value: (e) => e.branchId ?? "" },
  { header: "Active", value: (e) => (e.active ? "Yes" : "No") },
];

// ── designation hint list ─────────────────────────────────────────────────────
const DESIGNATIONS = [
  "Stylist",
  "Senior Stylist",
  "Beautician",
  "Spa Therapist",
  "Nail Artist",
  "Manager",
  "Receptionist",
  "Helper",
];

// ── blank form ────────────────────────────────────────────────────────────────
interface EmployeeForm {
  name: string;
  designation: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  joinedAt: string;
  branchId: string;
  active: boolean;
}

function blankForm(): EmployeeForm {
  return {
    name: "",
    designation: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    joinedAt: "",
    branchId: "",
    active: true,
  };
}

function employeeToForm(e: Employee): EmployeeForm {
  return {
    name: e.name,
    designation: e.designation ?? "",
    phone: e.phone ?? "",
    email: e.email ?? "",
    dateOfBirth: e.dateOfBirth ?? "",
    joinedAt: e.joinedAt ?? "",
    branchId: e.branchId ?? "",
    active: e.active,
  };
}

// ── birthday chip ─────────────────────────────────────────────────────────────
function BirthdayChip({ dob }: { dob: string }) {
  const today = isBirthdayOn(dob);
  const days = daysUntilBirthday(dob);

  if (today) {
    return (
      <Badge tone="brand" className="ml-1 whitespace-nowrap">
        🎂 Today
      </Badge>
    );
  }
  if (days !== null && days <= 30) {
    return (
      <Badge tone="amber" className="ml-1 whitespace-nowrap">
        in {days}d
      </Badge>
    );
  }
  return null;
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const { employees, branches, isLoading, refreshEmployees } = useData();
  const toast = useToast();

  // filters
  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [branchFilter, setBranchFilter] = useState("all");

  // form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(blankForm());
  const [saving, setSaving] = useState(false);

  // delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  // message dialog
  const [msgRecipient, setMsgRecipient] = useState<MessageRecipient | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);

  // ── derived stats ──
  const currentMonth = new Date().getMonth() + 1;
  const birthdaysThisMonth = useMemo(
    () =>
      employees.filter((e) => {
        if (!e.dateOfBirth) return false;
        const parts = e.dateOfBirth.split("-");
        return parts.length >= 2 && Number(parts[1]) === currentMonth;
      }).length,
    [employees, currentMonth]
  );

  const designations = useMemo(
    () =>
      [
        ...new Set(employees.map((e) => e.designation).filter((d): d is string => !!d)),
      ].sort(),
    [employees]
  );

  // ── filtered list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return employees.filter((e) => {
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        (e.phone ?? "").toLowerCase().includes(q) ||
        (e.designation ?? "").toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q);
      const matchDesig =
        designationFilter === "all" || e.designation === designationFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? e.active : !e.active);
      const matchBranch =
        branchFilter === "all" || (e.branchId ?? "") === branchFilter;
      return matchSearch && matchDesig && matchStatus && matchBranch;
    });
  }, [employees, search, designationFilter, statusFilter, branchFilter]);

  // ── branch name lookup ──
  const branchById = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches]
  );

  // ── open add/edit ──
  function openAdd() {
    setEditing(null);
    setForm(blankForm());
    setFormOpen(true);
  }

  function openEdit(e: Employee) {
    setEditing(e);
    setForm(employeeToForm(e));
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(blankForm());
  }

  function setField<K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  // ── submit ──
  async function handleSubmit() {
    if (!form.name.trim()) {
      toast("Employee name is required.", "error");
      return;
    }

    const payload = {
      name: form.name.trim(),
      designation: form.designation.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      joinedAt: form.joinedAt || undefined,
      branchId: form.branchId || undefined,
      active: form.active,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateEmployee(editing.id, payload);
        toast("Employee updated.", "success");
      } else {
        await createEmployee(payload);
        toast("Employee added.", "success");
      }
      await refreshEmployees();
      closeForm();
    } catch (err) {
      toast((err as Error).message ?? "Failed to save employee.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── delete ──
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmployee(deleteTarget.id);
      await refreshEmployees();
      toast("Employee deleted.", "success");
      setDeleteTarget(null);
    } catch (err) {
      toast((err as Error).message ?? "Failed to delete employee.", "error");
    } finally {
      setDeleting(false);
    }
  }

  // ── open message ──
  function openMessage(e: Employee) {
    setMsgRecipient({
      name: e.name,
      phone: e.phone,
      defaultTemplateId: "birthday-employee",
    });
    setMsgOpen(true);
  }

  if (isLoading && employees.length === 0) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Staff"
          value={formatNumber(employees.length)}
          icon={<UserCog className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Active"
          value={formatNumber(employees.filter((e) => e.active).length)}
          icon={<UserCog className="h-5 w-5" />}
          tone="green"
          hint={`${employees.length ? Math.round((employees.filter((e) => e.active).length / employees.length) * 100) : 0}% of total`}
        />
        <StatCard
          label="Birthdays This Month"
          value={formatNumber(birthdaysThisMonth)}
          icon={<Cake className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Designations"
          value={formatNumber(designations.length)}
          icon={<UserCog className="h-5 w-5" />}
          tone="purple"
        />
      </div>

      {/* toolbar */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  className="pl-8"
                  placeholder="Name, phone, designation…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="w-44">
              <Label>Designation</Label>
              <Select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
              >
                <option value="all">All designations</option>
                {designations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>

            <div className="w-36">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "active" | "inactive")
                }
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <div className="w-40">
              <Label>Branch</Label>
              <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="all">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>

            <Button variant="primary" size="md" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => {
                exportToExcel(filtered, employeeColumns, "employees");
                toast("Excel exported.", "success");
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                exportToPDF(filtered, employeeColumns, "employees", {
                  title: "Staff Directory",
                  summary: [
                    { label: "Total", value: String(filtered.length) },
                    {
                      label: "Active",
                      value: String(filtered.filter((e) => e.active).length),
                    },
                  ],
                });
                toast("PDF exported.", "success");
              }}
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted">
            Showing {filtered.length} of {employees.length} employees
          </p>
        </CardContent>
      </Card>

      {/* table */}
      <Card>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No employees yet"
                description="Add your first staff member to get started."
                action={
                  <Button variant="primary" onClick={openAdd}>
                    <Plus className="h-4 w-4" />
                    Add your first employee
                  </Button>
                }
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No employees found"
                description="Try adjusting your search or filters."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Designation</TH>
                  <TH>Contact</TH>
                  <TH>Age / Birthday</TH>
                  <TH>Joined</TH>
                  <TH>Branch</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((e) => {
                  const age = ageFromDob(e.dateOfBirth);
                  return (
                    <TR key={e.id}>
                      <TD className="font-medium text-slate-900">{e.name}</TD>
                      <TD>
                        {e.designation ? (
                          <Badge tone="blue">{e.designation}</Badge>
                        ) : (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </TD>
                      <TD>
                        <div className="space-y-0.5">
                          {e.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted">
                              <Phone className="h-3 w-3" />
                              {e.phone}
                            </div>
                          )}
                          {e.email && (
                            <div className="flex items-center gap-1 text-xs text-muted">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{e.email}</span>
                            </div>
                          )}
                          {!e.phone && !e.email && (
                            <span className="text-muted text-sm">—</span>
                          )}
                        </div>
                      </TD>
                      <TD>
                        <div className="flex items-center flex-wrap gap-1">
                          <div className="text-sm">
                            {e.dateOfBirth ? (
                              <span className="flex items-center gap-1">
                                <Cake className="h-3.5 w-3.5 text-brand-500" />
                                <span className="text-slate-700">
                                  {format(new Date(e.dateOfBirth + "T00:00:00"), "dd MMM")}
                                </span>
                                {age !== null && (
                                  <span className="text-muted text-xs">· {age}y</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                          {e.dateOfBirth && <BirthdayChip dob={e.dateOfBirth} />}
                        </div>
                      </TD>
                      <TD className="text-xs text-muted whitespace-nowrap">
                        {e.joinedAt
                          ? format(new Date(e.joinedAt + "T00:00:00"), "dd MMM yyyy")
                          : "—"}
                      </TD>
                      <TD className="text-xs text-muted">
                        {e.branchId ? (branchById.get(e.branchId) ?? e.branchId) : "All"}
                      </TD>
                      <TD>
                        {e.active ? (
                          <Badge tone="green">Active</Badge>
                        ) : (
                          <Badge tone="slate">Inactive</Badge>
                        )}
                      </TD>
                      <TD>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openMessage(e)}
                            title="Send birthday wish"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(e)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(e)}
                            title="Delete"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* add / edit dialog */}
      <Dialog
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit Employee" : "Add Employee"}
        description={
          editing ? `Editing "${editing.name}"` : "Add a new staff member to the directory."
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Employee"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>

            <div>
              <Label>Designation</Label>
              <Input
                list="designation-list"
                placeholder="e.g. Stylist, Manager…"
                value={form.designation}
                onChange={(e) => setField("designation", e.target.value)}
              />
              <datalist id="designation-list">
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="e.g. staff@salon.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>

            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
              />
            </div>

            <div>
              <Label>Joined Date</Label>
              <Input
                type="date"
                value={form.joinedAt}
                onChange={(e) => setField("joinedAt", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Branch</Label>
              <Select
                value={form.branchId}
                onChange={(e) => setField("branchId", e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={form.active}
                  onChange={(e) => setField("active", e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
                <span className="text-xs text-muted">(currently employed)</span>
              </label>
            </div>
          </div>
        </div>
      </Dialog>

      {/* delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Employee"
        description={`Are you sure you want to remove "${deleteTarget?.name}" from the directory? This cannot be undone.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </>
        }
      >
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>
            <span className="font-semibold">{deleteTarget?.name}</span> will be permanently removed
            from the staff directory.
          </p>
        </div>
      </Dialog>

      {/* message / birthday wish dialog */}
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
