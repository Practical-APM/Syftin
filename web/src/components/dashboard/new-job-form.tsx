"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/card";
import { CostEstimatePanel } from "@/components/dashboard/cost-estimate-panel";
import { FieldGroup, FieldHint, FieldLabel, Input, Textarea } from "@/components/ui/input";
import {
  formatSchemaTemplate,
  schemaForDomain,
} from "@/lib/constants/schema-templates";
import { extractDomain } from "@/lib/constants/whitelist";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { MAX_JOB_BUDGET_INR, PLATFORM_MAX_RECORDS } from "@/lib/env";
import {
  DEFAULT_TARGET_RECORDS,
  MIN_BUDGET_INR,
  attachJobMeta,
  estimateJobCost,
} from "@/lib/pricing/estimates";

const VOLUME_PRESETS = [1_000, 10_000, 100_000, 1_000_000] as const;

const DEFAULT_DOMAIN = "naukri.com";

export function NewJobForm({ domains }: { domains: string[] }) {
  const router = useRouter();
  const initialDomain = domains[0] ?? DEFAULT_DOMAIN;
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState(`https://${initialDomain}`);
  const [schemaText, setSchemaText] = useState(
    formatSchemaTemplate(schemaForDomain(initialDomain)),
  );
  const [maxRecords, setMaxRecords] = useState(String(DEFAULT_TARGET_RECORDS));
  const [budgetInr, setBudgetInr] = useState("500");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requiredRegion, setRequiredRegion] = useState("");

  const estimate = useMemo(
    () =>
      estimateJobCost({
        maxRecords: Number(maxRecords) || DEFAULT_TARGET_RECORDS,
        budgetInr: Number(budgetInr) || undefined,
      }),
    [maxRecords, budgetInr],
  );

  function applyDomain(url: string) {
    setTargetUrl(url);
    const domain = extractDomain(url);
    if (domain) {
      setSchemaText(formatSchemaTemplate(schemaForDomain(domain)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const parsedMaxRecords = Number(maxRecords);
    if (!Number.isFinite(parsedMaxRecords) || parsedMaxRecords < 1) {
      setError("Target volume must be at least 1 record.");
      setLoading(false);
      return;
    }
    if (parsedMaxRecords > PLATFORM_MAX_RECORDS) {
      setError(
        `Target volume cannot exceed ${PLATFORM_MAX_RECORDS.toLocaleString()} rows (platform safety limit). Contact support for larger catalog pulls.`,
      );
      setLoading(false);
      return;
    }

    let example_schema: Record<string, unknown>;
    try {
      example_schema = JSON.parse(schemaText);
      if (typeof example_schema !== "object" || Array.isArray(example_schema)) {
        throw new Error("Schema must be a JSON object");
      }
    } catch {
      setError("Please paste valid JSON showing the fields you want back.");
      setLoading(false);
      return;
    }

    const budget = Number(budgetInr);
    if (!Number.isFinite(budget) || budget < MIN_BUDGET_INR) {
      setError(`Set a budget of at least ₹${MIN_BUDGET_INR}.`);
      setLoading(false);
      return;
    }
    if (budget > MAX_JOB_BUDGET_INR) {
      setError(
        `Budget cannot exceed ₹${MAX_JOB_BUDGET_INR.toLocaleString()}. Contact support for enterprise volume.`,
      );
      setLoading(false);
      return;
    }

    const budgetCents = Math.round(budget * 100);

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        target_url: targetUrl,
        example_schema: attachJobMeta(example_schema, {
          max_records: parsedMaxRecords,
          budget_cents: budgetCents,
          effective_max_records: estimate.effectiveRecords,
        }),
        max_records: parsedMaxRecords,
        budget_cents: estimate.totalCents,
        ...(requiredRegion ? { required_region: requiredRegion } : {}),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create job");
      return;
    }

    router.push(`/dashboard/jobs/${data.job.id}`);
    router.refresh();
  }

  return (
    <>
      <DashboardHeader title="Create a job" />
      <DashboardPage>
        <Link href="/dashboard/jobs" className="app-back-link mb-6">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to jobs
        </Link>

        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          <Panel>
            <FieldGroup>
              <FieldLabel htmlFor="name">Job name</FieldLabel>
              <FieldHint>
                A short label your team will recognize, e.g. &quot;Mumbai grocery
                prices&quot;.
              </FieldHint>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Naukri React jobs — weekly pull"
                className="mt-0.5"
              />
            </FieldGroup>
          </Panel>

          <Panel>
            <FieldGroup>
              <FieldLabel htmlFor="url">Website URL</FieldLabel>
              <FieldHint>
                Must be on your approved site list. Login-only pages are not
                supported.
              </FieldHint>
              <Input
                id="url"
                required
                type="url"
                mono
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="mt-0.5"
              />
            </FieldGroup>
            {domains.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {domains.slice(0, 8).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => applyDomain(`https://${d}`)}
                    className="rounded-md border border-graphite-700 bg-graphite-900 px-2.5 py-1 text-[11px] text-graphite-200 transition-colors hover:border-honey-500/40 hover:bg-honey-500/10"
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            <Link
              href="/dashboard/compliance"
              className="mt-3 inline-block text-xs font-medium text-honey-600 dark:text-honey-400 hover:text-honey-500"
            >
              View approved sites →
            </Link>
          </Panel>

          <Panel>
            <FieldGroup>
              <FieldLabel htmlFor="region">
                Target region{" "}
                <span className="font-normal text-graphite-400">(optional)</span>
              </FieldLabel>
              <FieldHint>
                Route extraction to contributor nodes in a specific region.
              </FieldHint>
              <select
                id="region"
                value={requiredRegion}
                onChange={(e) => setRequiredRegion(e.target.value)}
                className="app-input mt-0.5 w-full"
              >
                <option value="">Any region</option>
                <option value="IN">🇮🇳 India (IN)</option>
                <option value="US">🇺🇸 United States (US)</option>
                <option value="GB">🇬🇧 United Kingdom (GB)</option>
                <option value="DE">🇩🇪 Germany (DE)</option>
                <option value="FR">🇫🇷 France (FR)</option>
                <option value="SG">🇸🇬 Singapore (SG)</option>
                <option value="JP">🇯🇵 Japan (JP)</option>
                <option value="AU">🇦🇺 Australia (AU)</option>
              </select>
            </FieldGroup>
          </Panel>

          <Panel>
            <FieldGroup>
              <FieldLabel htmlFor="schema">Fields you want back</FieldLabel>
              <FieldHint>
                Paste one example row as JSON. Syftin uses this to shape your
                download file.
              </FieldHint>
              <Textarea
                id="schema"
                required
                rows={10}
                mono
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                className="mt-0.5 border-graphite-700 bg-graphite-950 leading-relaxed text-graphite-200 focus:border-honey-500/50"
              />
            </FieldGroup>
          </Panel>

          <Panel className="space-y-4">
            <FieldGroup>
              <FieldLabel htmlFor="max-records">Target volume (rows)</FieldLabel>
              <FieldHint>
                How many records you want from this job. Collection stops at your
                budget or this target — whichever comes first. Platform safety
                limit: {PLATFORM_MAX_RECORDS.toLocaleString()} rows.
              </FieldHint>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VOLUME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMaxRecords(String(preset))}
                    className="rounded-md border border-graphite-700 bg-graphite-900 px-2.5 py-1 text-[11px] text-graphite-300 transition-colors hover:border-honey-500/40 hover:text-honey-400"
                  >
                    {preset >= 1_000_000
                      ? `${preset / 1_000_000}M`
                      : preset >= 1_000
                        ? `${preset / 1_000}K`
                        : preset}
                  </button>
                ))}
              </div>
              <Input
                id="max-records"
                type="number"
                min={1}
                required
                value={maxRecords}
                onChange={(e) => setMaxRecords(e.target.value)}
                className="mt-2"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="budget">Your budget (INR)</FieldLabel>
              <FieldHint>
                Maximum spend cap. Large catalogs need higher budgets — at ₹0.10
                per record, 100K rows ≈ ₹10,000 plus base fee.
              </FieldHint>
              <Input
                id="budget"
                type="number"
                min={MIN_BUDGET_INR}
                step={1}
                required
                value={budgetInr}
                onChange={(e) => setBudgetInr(e.target.value)}
                className="mt-0.5"
              />
            </FieldGroup>
          </Panel>

          <CostEstimatePanel estimate={estimate} />

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit job"
            )}
          </Button>
        </form>
      </DashboardPage>
    </>
  );
}
