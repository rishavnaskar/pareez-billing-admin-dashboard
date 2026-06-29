import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Bill } from "./types";

export interface TableColumn<T> {
  header: string;
  /** raw value used for excel/csv (keep numbers numeric) */
  value: (row: T) => string | number;
}

// ── Excel ────────────────────────────────────────────────────────────────────
export function exportToExcel<T>(
  rows: T[],
  columns: TableColumn<T>[],
  filename: string,
  sheetName = "Sheet1"
): void {
  const aoa = [
    columns.map((c) => c.header),
    ...rows.map((r) => columns.map((c) => c.value(r))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // column widths from header length / content
  ws["!cols"] = columns.map((c, i) => {
    const maxLen = Math.max(
      c.header.length,
      ...rows.map((r) => String(c.value(r) ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, ensureExt(filename, "xlsx"));
}

/** Multi-sheet workbook (e.g. one sheet per report). */
export function exportWorkbook(
  sheets: { name: string; aoa: (string | number)[][] }[],
  filename: string
): void {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.aoa);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, ensureExt(filename, "xlsx"));
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export function exportToPDF<T>(
  rows: T[],
  columns: TableColumn<T>[],
  filename: string,
  opts?: { title?: string; subtitle?: string; summary?: { label: string; value: string }[] }
): void {
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(219, 39, 119); // brand-600
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Pareez Unisex Professional Salon", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(opts?.title ?? "Report", 14, 18);

  let cursorY = 30;
  doc.setTextColor(15, 23, 42);
  if (opts?.subtitle) {
    doc.setFontSize(10);
    doc.text(opts.subtitle, 14, cursorY);
    cursorY += 6;
  }

  if (opts?.summary?.length) {
    doc.setFontSize(9);
    const line = opts.summary.map((s) => `${s.label}: ${s.value}`).join("    |    ");
    doc.text(line, 14, cursorY);
    cursorY += 6;
  }

  autoTable(doc, {
    startY: cursorY + 2,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(c.value(r) ?? ""))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [190, 24, 93], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 245, 248] },
    margin: { left: 14, right: 14 },
  });

  const ts = format(new Date(), "dd MMM yyyy, HH:mm");
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generated ${ts}  •  Page ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
  }

  doc.save(ensureExt(filename, "pdf"));
}

// ── Bill-specific column presets ─────────────────────────────────────────────
export const billColumns: TableColumn<Bill>[] = [
  { header: "Bill #", value: (b) => b.billNumber },
  { header: "Date", value: (b) => format(b.createdAt, "dd MMM yyyy HH:mm") },
  { header: "Customer", value: (b) => b.customerName },
  { header: "Phone", value: (b) => b.customerPhone ?? "" },
  { header: "Branch", value: (b) => b.branchName },
  { header: "Services", value: (b) => b.services.map((s) => s.serviceName).join(", ") },
  { header: "Gross", value: (b) => b.totalAmount },
  { header: "Wallet Used", value: (b) => b.walletAmountUsed },
  { header: "Deposit Used", value: (b) => b.depositAmountUsed ?? 0 },
  { header: "Net Paid", value: (b) => b.netPayableAmount ?? b.totalAmount },
  { header: "Cashback", value: (b) => b.cashbackEarned },
  { header: "Payment", value: (b) => b.paymentMethod.toUpperCase() },
  { header: "Tier", value: (b) => b.customerTierAtPurchase },
];

function ensureExt(name: string, ext: string): string {
  return name.toLowerCase().endsWith(`.${ext}`) ? name : `${name}.${ext}`;
}

export function toCSV<T>(rows: T[], columns: TableColumn<T>[]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(",")).join("\n");
  return `${head}\n${body}`;
}
