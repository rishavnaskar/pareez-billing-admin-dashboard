"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [user, isLoading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const profile = await login(email.trim(), password);
      if (profile.role !== "admin") {
        setError(
          "This dashboard is for salon owners (admin role). Your account doesn't have admin access."
        );
        setBusy(false);
        return;
      }
      router.replace("/dashboard");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(
        code.includes("invalid") || code.includes("wrong") || code.includes("not-found")
          ? "Invalid email or password."
          : "Login failed. Please try again."
      );
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white card-shadow">
            <Scissors className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pareez Admin</h1>
          <p className="mt-1 text-sm text-muted">Owner dashboard · sign in to continue</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-line bg-white p-6 card-shadow"
        >
          <div className="mb-4">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@pareez.com"
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin-only · uses your Pareez Billing credentials
          </p>
        </form>
      </div>
    </div>
  );
}
