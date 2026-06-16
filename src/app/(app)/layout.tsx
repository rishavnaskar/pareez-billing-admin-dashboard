"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DataProvider, useData } from "@/contexts/DataContext";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { LoadingState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { error, refresh } = useData();

  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
          {error ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-6 py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="font-medium text-red-800 dark:text-red-300">Couldn&apos;t load data</p>
              <p className="max-w-md text-sm text-red-600 dark:text-red-400">{error}</p>
              <Button variant="danger" onClick={() => refresh()}>
                Try again
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "admin") router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Verifying access…" />
      </div>
    );
  }

  return (
    <DataProvider>
      <Shell>{children}</Shell>
    </DataProvider>
  );
}
