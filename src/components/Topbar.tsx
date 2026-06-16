"use client";

import { usePathname } from "next/navigation";
import { Menu, RefreshCw, LogOut, CircleUserRound } from "lucide-react";
import { format } from "date-fns";
import { NAV_ITEMS } from "@/components/nav-items";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { refresh, isLoading, lastUpdated } = useData();

  const current = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/80 dark:bg-slate-900/80 px-4 backdrop-blur lg:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
          {current?.label ?? "Dashboard"}
        </h1>
        {lastUpdated && (
          <p className="text-[11px] text-muted">Updated {format(lastUpdated, "HH:mm:ss")}</p>
        )}
      </div>

      <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isLoading}>
        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>

      <ThemeToggle />

      <div className="hidden items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 sm:flex">
        <CircleUserRound className="h-5 w-5 text-brand-500" />
        <div className="leading-tight">
          <p className="max-w-[160px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">
            {user?.email}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-muted">{user?.role}</p>
        </div>
      </div>

      <Button variant="ghost" size="icon" onClick={() => logout()} title="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
