/** Format a number as Indian Rupees, e.g. 12500 -> "₹12,500". */
export function formatINR(amount: number, opts?: { decimals?: boolean }): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts?.decimals ? 2 : 0,
    minimumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(value);
}

/** Compact Indian format, e.g. 1250000 -> "₹12.5L". */
export function formatINRCompact(amount: number): string {
  const v = Number.isFinite(amount) ? amount : 0;
  if (Math.abs(v) >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)}L`;
  if (Math.abs(v) >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Number.isFinite(n) ? n : 0);
}

export function formatPercent(ratio: number, decimals = 1): string {
  return `${(ratio * 100).toFixed(decimals)}%`;
}
