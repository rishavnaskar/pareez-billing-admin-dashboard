"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, X } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "@/components/nav-items";
import { cn } from "@/lib/utils";

const GROUP_ORDER: NavItem["group"][] = [
  "Overview",
  "Operations",
  "Catalog & Team",
  "Engagement",
  "System",
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white dark:bg-slate-800 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-line px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Pareez Admin</p>
              <p className="text-[11px] text-muted">Owner dashboard</p>
            </div>
          </Link>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {GROUP_ORDER.map((group) => {
            const items = NAV_ITEMS.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <Icon className={cn("h-[18px] w-[18px]", active && "text-brand-600 dark:text-brand-400")} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-line p-4">
          <p className="text-[11px] leading-relaxed text-muted">
            Pareez Unisex Professional Salon
            <br />
            Reading live Firestore data 🔴
          </p>
        </div>
      </aside>
    </>
  );
}
