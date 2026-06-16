import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { MembershipTier } from "@/lib/types";

type Tone = "brand" | "slate" | "green" | "amber" | "red" | "blue" | "purple";

const tones: Record<Tone, string> = {
  brand: "bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300",
  slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  green: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
  red: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
  blue: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
  purple: "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300",
};

export function Badge({
  tone = "slate",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

const tierConfig: Record<MembershipTier, { tone: Tone; emoji: string; label: string }> = {
  bronze: { tone: "amber", emoji: "🥉", label: "Bronze" },
  silver: { tone: "slate", emoji: "🥈", label: "Silver" },
  gold: { tone: "amber", emoji: "🥇", label: "Gold" },
  platinum: { tone: "purple", emoji: "💎", label: "Platinum" },
};

export function TierBadge({ tier }: { tier: MembershipTier }) {
  const c = tierConfig[tier] ?? tierConfig.bronze;
  return (
    <Badge tone={c.tone}>
      <span>{c.emoji}</span>
      {c.label}
    </Badge>
  );
}
