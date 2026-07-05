"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WhitelistEntry } from "@/lib/data/domains";

export function DomainManager({
  initialDomains,
  readOnly = false,
}: {
  initialDomains: WhitelistEntry[];
  readOnly?: boolean;
}) {
  const [domains, setDomains] = useState(initialDomains);
  const [newDomain, setNewDomain] = useState("");
  const [vertical, setVertical] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: newDomain, vertical: vertical || undefined }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to add domain");
      return;
    }

    setDomains((prev) => {
      const exists = prev.some((d) => d.domain === data.domain.domain);
      if (exists) {
        return prev.map((d) =>
          d.domain === data.domain.domain ? data.domain : d,
        );
      }
      return [...prev, data.domain].sort((a, b) =>
        a.domain.localeCompare(b.domain),
      );
    });
    setNewDomain("");
    setVertical("");
  }

  async function handleRemove(domain: string) {
    setError(null);
    const res = await fetch(`/api/domains?domain=${encodeURIComponent(domain)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to remove domain");
      return;
    }

    setDomains((prev) => prev.filter((d) => d.domain !== domain));
  }

  return (
    <div className="space-y-5">
      {!readOnly && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-3">
          <Input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="example.com"
            required
            className="min-w-[200px] flex-1"
          />
          <Input
            type="text"
            value={vertical}
            onChange={(e) => setVertical(e.target.value)}
            placeholder="Vertical (optional)"
            className="w-40"
          />
          <Button type="submit" disabled={loading} size="sm">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add domain
              </>
            )}
          </Button>
        </form>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {domains.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ivory-200 bg-ivory-50 px-4 py-8 text-center text-sm text-graphite-500">
          {readOnly
            ? "No approved sites configured yet. Contact support@syftin.com to enable domains for your workspace."
            : "No approved sites yet. Add your first domain above."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {domains.map((entry) => (
            <span
              key={entry.domain}
              className="inline-flex items-center gap-2 rounded-lg border border-ivory-200 bg-ivory-50 py-1 pl-3 pr-1 text-xs font-medium text-graphite-700"
            >
              <span className="font-mono">{entry.domain}</span>
              {entry.vertical && (
                <span className="text-graphite-400">· {entry.vertical}</span>
              )}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(entry.domain)}
                  className="rounded-md p-1 text-graphite-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove ${entry.domain}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-graphite-500">
        {readOnly
          ? "These public websites are approved for your pilot workspace. Contact Syftin to request additional domains."
          : "Only approved public websites can be used for jobs. Changes apply immediately for new submissions."}
      </p>
    </div>
  );
}
