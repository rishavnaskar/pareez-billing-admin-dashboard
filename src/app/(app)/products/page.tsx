"use client";

import { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  FileSpreadsheet,
  FileText,
  Tag,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { LoadingState, EmptyState } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";

import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/firestore";
import { formatINR, formatNumber } from "@/lib/currency";
import { exportToExcel, exportToPDF, type TableColumn } from "@/lib/export";
import type { Product } from "@/lib/types";

// ── export columns ────────────────────────────────────────────────────────────
const productColumns: TableColumn<Product>[] = [
  { header: "Name", value: (p) => p.name },
  { header: "Category", value: (p) => p.category },
  { header: "SKU", value: (p) => p.sku ?? "" },
  { header: "Price", value: (p) => p.price },
  { header: "Duration (min)", value: (p) => p.durationMinutes ?? "" },
  { header: "Active", value: (p) => (p.active ? "Yes" : "No") },
  { header: "Description", value: (p) => p.description ?? "" },
];

// ── category tone ─────────────────────────────────────────────────────────────
const CATEGORY_TONES: Record<string, "brand" | "blue" | "green" | "amber" | "purple" | "slate" | "red"> = {
  Hair: "brand",
  Skin: "green",
  Spa: "blue",
  Nails: "purple",
  Beard: "slate",
  Makeup: "amber",
  Massage: "green",
  Retail: "slate",
};

function categoryTone(cat: string): "brand" | "blue" | "green" | "amber" | "purple" | "slate" | "red" {
  return CATEGORY_TONES[cat] ?? "slate";
}

// ── salon categories hint list ─────────────────────────────────────────────
const SALON_CATEGORIES = ["Hair", "Skin", "Spa", "Nails", "Beard", "Makeup", "Massage", "Retail"];

// ── blank form ────────────────────────────────────────────────────────────────
interface ProductForm {
  name: string;
  category: string;
  price: string;
  durationMinutes: string;
  sku: string;
  branchId: string;
  description: string;
  active: boolean;
}

function blankForm(): ProductForm {
  return {
    name: "",
    category: "",
    price: "",
    durationMinutes: "",
    sku: "",
    branchId: "",
    description: "",
    active: true,
  };
}

function productToForm(p: Product): ProductForm {
  return {
    name: p.name,
    category: p.category,
    price: String(p.price),
    durationMinutes: p.durationMinutes != null ? String(p.durationMinutes) : "",
    sku: p.sku ?? "",
    branchId: p.branchId ?? "",
    description: p.description ?? "",
    active: p.active,
  };
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { products, branches, isLoading, refreshProducts } = useData();
  const toast = useToast();

  // filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(blankForm());
  const [saving, setSaving] = useState(false);

  // delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── derived stats ──
  const totalProducts = products.length;
  const activeProducts = useMemo(() => products.filter((p) => p.active).length, [products]);
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  );
  const avgPrice = useMemo(
    () => (products.length ? products.reduce((s, p) => s + p.price, 0) / products.length : 0),
    [products]
  );

  // ── filtered list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? p.active : !p.active);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  // ── open add/edit dialog ──
  function openAdd() {
    setEditing(null);
    setForm(blankForm());
    setFormOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm(productToForm(p));
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(blankForm());
  }

  function setField<K extends keyof ProductForm>(k: K, v: ProductForm[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  // ── submit ──
  async function handleSubmit() {
    if (!form.name.trim()) {
      toast("Product name is required.", "error");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      toast("Price must be a positive number.", "error");
      return;
    }
    const durationMinutes = form.durationMinutes ? parseInt(form.durationMinutes, 10) : undefined;

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || "Uncategorized",
      price,
      durationMinutes: durationMinutes && !isNaN(durationMinutes) ? durationMinutes : undefined,
      sku: form.sku.trim() || undefined,
      branchId: form.branchId || undefined,
      description: form.description.trim() || undefined,
      active: form.active,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateProduct(editing.id, payload);
        toast("Product updated.", "success");
      } else {
        await createProduct(payload);
        toast("Product created.", "success");
      }
      await refreshProducts();
      closeForm();
    } catch (err) {
      toast((err as Error).message ?? "Failed to save product.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── delete ──
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      await refreshProducts();
      toast("Product deleted.", "success");
      setDeleteTarget(null);
    } catch (err) {
      toast((err as Error).message ?? "Failed to delete product.", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading && products.length === 0) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Products"
          value={formatNumber(totalProducts)}
          icon={<Package className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Active"
          value={formatNumber(activeProducts)}
          icon={<ToggleRight className="h-5 w-5" />}
          tone="green"
          hint={`${totalProducts ? Math.round((activeProducts / totalProducts) * 100) : 0}% of total`}
        />
        <StatCard
          label="Categories"
          value={formatNumber(categories.length)}
          icon={<Tag className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Avg Price"
          value={formatINR(avgPrice)}
          icon={<Package className="h-5 w-5" />}
          tone="amber"
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
                  placeholder="Name, SKU, or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="w-40">
              <Label>Category</Label>
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>

            <div className="w-36">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <Button variant="primary" size="md" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => {
                exportToExcel(filtered, productColumns, "products");
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
                exportToPDF(filtered, productColumns, "products", {
                  title: "Product / Service Catalog",
                  summary: [
                    { label: "Total", value: String(filtered.length) },
                    { label: "Active", value: String(filtered.filter((p) => p.active).length) },
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
            Showing {filtered.length} of {products.length} products
          </p>
        </CardContent>
      </Card>

      {/* table */}
      <Card>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No products yet"
                description="Add your first product or service to the catalog."
                action={
                  <Button variant="primary" onClick={openAdd}>
                    <Plus className="h-4 w-4" />
                    Add your first product
                  </Button>
                }
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No products found"
                description="Try adjusting your search or filters."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Category</TH>
                  <TH>SKU</TH>
                  <TH>Price</TH>
                  <TH>Duration</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-muted truncate max-w-[220px]">{p.description}</p>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={categoryTone(p.category)}>{p.category}</Badge>
                    </TD>
                    <TD className="font-mono text-xs text-muted">{p.sku ?? "—"}</TD>
                    <TD className="font-semibold text-slate-900">{formatINR(p.price)}</TD>
                    <TD className="text-muted text-sm">
                      {p.durationMinutes ? `${p.durationMinutes} min` : "—"}
                    </TD>
                    <TD>
                      {p.active ? (
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
                          onClick={() => openEdit(p)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(p)}
                          title="Delete"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* add / edit dialog */}
      <Dialog
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit Product" : "Add Product"}
        description={editing ? `Editing "${editing.name}"` : "Add a new product or service to the catalog."}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Product"}
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
                placeholder="e.g. Deep Conditioning Treatment"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>

            <div>
              <Label>
                Category <span className="text-red-500">*</span>
              </Label>
              <Input
                list="salon-categories"
                placeholder="e.g. Hair, Skin, Spa…"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
              />
              <datalist id="salon-categories">
                {SALON_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <Label>
                Price (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
              />
            </div>

            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 45"
                value={form.durationMinutes}
                onChange={(e) => setField("durationMinutes", e.target.value)}
              />
            </div>

            <div>
              <Label>SKU</Label>
              <Input
                placeholder="e.g. SPA-001"
                value={form.sku}
                onChange={(e) => setField("sku", e.target.value)}
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
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Optional description of the product or service…"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
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
                <span className="text-xs text-muted">(visible in billing app)</span>
              </label>
            </div>
          </div>
        </div>
      </Dialog>

      {/* delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>
            <span className="font-semibold">{deleteTarget?.name}</span> will be permanently removed
            from the catalog.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
