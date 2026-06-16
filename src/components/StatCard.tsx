"use client";

import { type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  hint,
  changePct,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  changePct?: number;
  tone?: "brand" | "blue" | "green" | "amber" | "purple";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400",
    blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    purple: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
  };
  const up = (changePct ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>
            {icon}
          </div>
        )}
      </div>
      {typeof changePct === "number" && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
              up ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300"
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(changePct).toFixed(1)}%
          </span>
          <span className="text-muted">vs previous period</span>
        </div>
      )}
    </Card>
  );
}
