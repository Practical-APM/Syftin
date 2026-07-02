"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import type { SessionContributor } from "@/lib/auth/contributor";

export function ContributorNetworkPanel({
  contributor,
}: {
  contributor: SessionContributor;
}) {
  const router = useRouter();
  const [networkMode, setNetworkMode] = useState(contributor.networkMode);
  const [meteredPause, setMeteredPause] = useState(contributor.meteredPause);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/contributor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ networkMode, meteredPause }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Could not save settings.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <DashboardHeader
        title="Network safeguards"
        description="Pause tasks on mobile hotspot or metered connections to protect your data cap."
      />
      <DashboardPage>
        <form
          onSubmit={handleSave}
          className="max-w-lg space-y-5 rounded-xl border border-ivory-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="text-xs font-medium text-graphite-500">
              Connection mode
            </label>
            <select
              value={networkMode}
              onChange={(e) => setNetworkMode(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ivory-200 bg-ivory-50 px-3.5 py-2.5 text-sm"
            >
              <option value="wifi">Wi‑Fi / unmetered</option>
              <option value="metered">Mobile hotspot (metered)</option>
              <option value="paused">Paused — do not assign tasks</option>
            </select>
          </div>

          <label className="flex items-start gap-3 text-sm text-graphite-700">
            <input
              type="checkbox"
              checked={meteredPause}
              onChange={(e) => setMeteredPause(e.target.checked)}
              className="mt-1"
            />
            <span>
              Automatically pause when the node app detects a metered
              connection (recommended for students on mobile data).
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </form>
      </DashboardPage>
    </>
  );
}
