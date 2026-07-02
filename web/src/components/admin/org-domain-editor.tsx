"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-fallback";

type GlobalDomain = {
  domain: string;
  vertical?: string | null;
};

export function OrgDomainEditor({
  organizationId,
  organizationName,
  onClose,
  onSaved,
}: {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [globalDomains, setGlobalDomains] = useState<GlobalDomain[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [usesSubset, setUsesSubset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/organizations/${organizationId}/domains`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load workspace domains.");
        return res.json();
      })
      .then((data) => {
        setGlobalDomains(data.globalDomains ?? []);
        const orgDomains: string[] = data.orgDomains ?? [];
        setUsesSubset(Boolean(data.usesSubset));
        if (data.usesSubset) {
          setSelected(new Set(orgDomains));
        } else {
          setSelected(new Set((data.globalDomains ?? []).map((d: GlobalDomain) => d.domain)));
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request failed."),
      )
      .finally(() => setLoading(false));
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(domain: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
    setUsesSubset(true);
  }

  function selectAll() {
    setSelected(new Set(globalDomains.map((d) => d.domain)));
    setUsesSubset(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const allSelected =
      selected.size === globalDomains.length &&
      globalDomains.every((d) => selected.has(d.domain));

    const domains = allSelected ? [] : [...selected].sort();

    const res = await fetch(
      `/api/admin/organizations/${organizationId}/domains`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains }),
      },
    );

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save domains.");
      return;
    }

    setUsesSubset(data.usesSubset);
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-ivory-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-graphite-900">
              Workspace domains
            </h2>
            <p className="mt-1 text-xs text-graphite-500">{organizationName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-graphite-400 hover:bg-ivory-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-graphite-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <InlineError message={error} onRetry={load} />
          ) : (
            <>
              <p className="text-xs text-graphite-500">
                Choose which globally approved sites this workspace can use. Leave
                all selected for no restriction (full platform whitelist).
              </p>
              <div className="mt-4 space-y-2">
                {globalDomains.map((entry) => {
                  const checked = selected.has(entry.domain);
                  return (
                    <label
                      key={entry.domain}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        checked
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-ivory-200 bg-ivory-50/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(entry.domain)}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-ivory-300 bg-white"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className="font-mono text-graphite-800">
                        {entry.domain}
                      </span>
                      {entry.vertical && (
                        <span className="text-xs text-graphite-400">
                          · {entry.vertical}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ivory-200 px-5 py-4">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs font-medium text-graphite-500 hover:text-graphite-800"
          >
            Use full platform list
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={saving || loading} onClick={handleSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        {!usesSubset && !loading && (
          <p className="border-t border-ivory-100 px-5 py-2 text-[10px] text-graphite-400">
            All domains selected — workspace inherits the full global whitelist.
          </p>
        )}
      </div>
    </div>
  );
}
