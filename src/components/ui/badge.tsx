import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { MembershipTier } from "@/lib/types";

type Tone = "brand" | "slate" | "green" | "amber" | "red" | "blue" | "purple";

const tones: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-700",
  slate: "bg-slate-100 text-slate-600",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
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
