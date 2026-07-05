"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContributorDirectLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("a@a.in");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/contributor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Sign-in failed. Try again.");
        return;
      }

      router.push(data.redirect ?? "/contributor");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="contributor-email"
          className="block text-sm font-medium text-graphite-900 dark:text-ivory-50"
        >
          Contributor email
        </label>
        <input
          id="contributor-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@college.edu"
          className="mt-1.5 w-full rounded-lg border border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-950 px-3.5 py-2.5 text-sm text-graphite-900 dark:text-ivory-50 placeholder:text-graphite-400 dark:placeholder:text-graphite-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in to contributor portal"
        )}
      </Button>

      <p className="text-center text-xs text-graphite-400 dark:text-graphite-400">
        Direct sign-in for pilot contributors — no email link required.
      </p>
    </form>
  );
}
