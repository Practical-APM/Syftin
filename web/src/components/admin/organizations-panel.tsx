"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Globe, Loader2, Settings2, XCircle } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-fallback";
import { FieldGroup, FieldHint, FieldLabel, Select } from "@/components/ui/input";
import { OrgDomainEditor } from "@/components/admin/org-domain-editor";
import { formatDate } from "@/lib/utils";

type Organization = {
  id: string;
  name: string;
  slug: string;
  credit_balance_cents: number;
  dpa_signed_at: string | null;
  billing_stream_locked: boolean;
  billing_lock_reason: string | null;
  sla_tier: "pilot" | "business" | "enterprise";
  extraction_tier: "standard" | "business" | "premium";
  hub_only_extraction: boolean;
  created_at: string;
  member_count: number;
  job_count: number;
};

function OrgPilotSettingsModal({
  org,
  onClose,
  onSaved,
}: {
  org: Organization;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slaTier, setSlaTier] = useState(org.sla_tier);
  const [extractionTier, setExtractionTier] = useState(org.extraction_tier);
  const [hubOnly, setHubOnly] = useState(org.hub_only_extraction);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sla_tier: slaTier,
          extraction_tier: extractionTier,
          hub_only_extraction: hubOnly,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Save failed.");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-900/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-ivory-200 bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-graphite-900">
          Pilot settings — {org.name}
        </h2>
        <p className="mt-1 text-xs text-graphite-500">
          SLA priority, extraction pricing tier, and hub-only fetch policy.
        </p>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <FieldGroup>
            <FieldLabel htmlFor="sla-tier">SLA tier</FieldLabel>
            <Select
              id="sla-tier"
              value={slaTier}
              onChange={(e) =>
                setSlaTier(e.target.value as Organization["sla_tier"])
              }
            >
              <option value="pilot">Pilot</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </Select>
            <FieldHint>Higher tiers dequeue jobs first on the hub worker.</FieldHint>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="extraction-tier">Extraction tier</FieldLabel>
            <Select
              id="extraction-tier"
              value={extractionTier}
              onChange={(e) =>
                setExtractionTier(
                  e.target.value as Organization["extraction_tier"],
                )
              }
            >
              <option value="standard">Standard</option>
              <option value="business">Business</option>
              <option value="premium">Premium</option>
            </Select>
            <FieldHint>Adjusts per-record pricing multiplier.</FieldHint>
          </FieldGroup>

          <label className="flex items-start gap-2 text-sm text-graphite-700">
            <input
              type="checkbox"
              checked={hubOnly}
              onChange={(e) => setHubOnly(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Hub-only extraction
              <span className="mt-0.5 block text-xs text-graphite-500">
                Disables contributor fetch for new jobs. Use for subprocessor-free
                enterprise SLAs.
              </span>
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OrganizationsPanel() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [settingsOrg, setSettingsOrg] = useState<Organization | null>(null);

  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  async function clearBillingLock(orgId: string) {
    setUnlockingId(orgId);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearBillingLock: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Could not unlock.");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed.");
    } finally {
      setUnlockingId(null);
    }
  }

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/organizations")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load organizations.");
        return r.json();
      })
      .then((data) => setOrgs(data.organizations ?? []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request failed."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const signedCount = orgs.filter((o) => o.dpa_signed_at).length;

  return (
    <>
      <DashboardHeader
        title="Pilot workspaces"
      />
      <DashboardPage>
        {!loading && !error && orgs.length > 0 && (
          <p className="text-sm text-graphite-500">
            {orgs.length} workspace{orgs.length === 1 ? "" : "s"} · {signedCount}{" "}
            DPA signed ·{" "}
            {orgs.reduce((s, o) => s + o.job_count, 0).toLocaleString()} total jobs
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading workspaces…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : orgs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ivory-200 bg-white px-6 py-10 text-center text-sm text-graphite-500">
            No pilot workspaces yet. Invites provision orgs on first sign-in.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory-50/80">
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Workspace
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Members
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Jobs
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    SLA
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    DPA
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Created
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Billing
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-ivory-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-graphite-900">{org.name}</p>
                      <p className="font-mono text-xs text-graphite-500">
                        {org.slug}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-graphite-700">
                      {org.member_count}
                    </td>
                    <td className="px-5 py-4 text-graphite-700">
                      {org.job_count}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-graphite-700">
                        {org.sla_tier}
                        {org.hub_only_extraction && (
                          <span className="ml-1 text-amber-600">· hub-only</span>
                        )}
                      </p>
                      <p className="text-[10px] text-graphite-500">
                        {org.extraction_tier} extraction
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {org.dpa_signed_at ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Signed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <XCircle className="h-3.5 w-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-graphite-500">
                      {formatDate(org.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      {org.billing_stream_locked ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <XCircle className="h-3.5 w-3.5" />
                            Locked
                          </span>
                          {org.billing_lock_reason && (
                            <p className="max-w-xs text-[10px] leading-snug text-graphite-500">
                              {org.billing_lock_reason}
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={unlockingId === org.id}
                            onClick={() => clearBillingLock(org.id)}
                            className="text-[10px] font-medium text-honey-700 hover:text-honey-600"
                          >
                            {unlockingId === org.id ? "Unlocking…" : "Clear lock"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-600">OK</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setSettingsOrg(org)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-honey-700 hover:text-honey-600"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Settings
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingOrg(org)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-honey-700 hover:text-honey-600"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          Domains
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPage>

      {editingOrg && (
        <OrgDomainEditor
          organizationId={editingOrg.id}
          organizationName={editingOrg.name}
          onClose={() => setEditingOrg(null)}
        />
      )}

      {settingsOrg && (
        <OrgPilotSettingsModal
          org={settingsOrg}
          onClose={() => setSettingsOrg(null)}
          onSaved={load}
        />
      )}
    </>
  );
}
