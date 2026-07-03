"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/card";
import { CostEstimatePanel } from "@/components/dashboard/cost-estimate-panel";
import {
  ExtractionAiWizard,
  ModeToggle,
} from "@/components/dashboard/extraction-ai-wizard";
import {
  SchemaFieldsEditor,
} from "@/components/dashboard/schema-fields-editor";
import { FieldGroup, FieldHint, FieldLabel, Input, Select, Textarea } from "@/components/ui/input";
import {
  fieldRowsToSchema,
  schemaToFieldRows,
} from "@/lib/schema/fields-editor";
import type { SchemaFieldRow } from "@/lib/schema/fields-editor";
import {
  formatSchemaTemplate,
  schemaForDomain,
} from "@/lib/constants/schema-templates";
import { extractDomain } from "@/lib/constants/whitelist";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import {
  MAX_BATCH_URLS,
  MAX_JOB_BUDGET_INR,
  PLATFORM_MAX_RECORDS,
  isPhase3EnabledClient,
} from "@/lib/env";
import type { ExtractionDraft } from "@/lib/ai/extraction-draft";
import {
  DEFAULT_TARGET_RECORDS,
  MIN_BUDGET_INR,
  attachJobMeta,
  estimateBatchCost,
  estimateJobCost,
} from "@/lib/pricing/estimates";

const VOLUME_PRESETS = [1_000, 10_000, 100_000, 1_000_000] as const;
const DEFAULT_DOMAIN = "naukri.com";

export function NewExtractionForm({ domains }: { domains: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchEnabled = isPhase3EnabledClient();
  const initialMode =
    batchEnabled && searchParams.get("mode") === "batch" ? "batch" : "single";

  const [mode, setMode] = useState<"single" | "batch">(initialMode);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const initialDomain = domains[0] ?? DEFAULT_DOMAIN;
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState(`https://${initialDomain}`);
  const [urlsText, setUrlsText] = useState("");
  const initialSchema = schemaForDomain(initialDomain);
  const [fieldRows, setFieldRows] = useState<SchemaFieldRow[]>(() =>
    schemaToFieldRows(initialSchema),
  );
  const [schemaText, setSchemaText] = useState(formatSchemaTemplate(initialSchema));
  const [maxRecords, setMaxRecords] = useState(String(DEFAULT_TARGET_RECORDS));
  const [budgetInr, setBudgetInr] = useState(mode === "batch" ? "5000" : "500");
  const [requiredRegion, setRequiredRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const urlCount = useMemo(
    () =>
      urlsText
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean).length,
    [urlsText],
  );

  const estimate = useMemo(() => {
    const domain = extractDomain(mode === "batch" ? urlsText.split("\n")[0]?.trim() ?? "" : targetUrl);
    const batchDomains =
      mode === "batch"
        ? urlsText
            .split("\n")
            .map((u) => extractDomain(u.trim()))
            .filter((d): d is string => Boolean(d))
        : undefined;

    if (mode === "batch") {
      return estimateBatchCost({
        urlCount: Math.max(urlCount, 1),
        domains: batchDomains,
        maxRecords: Number(maxRecords) || DEFAULT_TARGET_RECORDS,
        budgetInr: Number(budgetInr) || undefined,
      });
    }
    return estimateJobCost({
      maxRecords: Number(maxRecords) || DEFAULT_TARGET_RECORDS,
      budgetInr: Number(budgetInr) || undefined,
      domain: domain ?? undefined,
    });
  }, [mode, urlCount, maxRecords, budgetInr, targetUrl, urlsText]);

  function applyDomain(url: string) {
    setTargetUrl(url);
    const domain = extractDomain(url);
    if (domain) {
      const schema = schemaForDomain(domain);
      setFieldRows(schemaToFieldRows(schema));
      setSchemaText(formatSchemaTemplate(schema));
    }
  }

  function applyDraft(draft: ExtractionDraft) {
    setName(draft.name);
    setMaxRecords(String(draft.max_records));
    setBudgetInr(String(draft.budget_inr));
    setRequiredRegion(draft.required_region ?? "");
    setFieldRows(schemaToFieldRows(draft.example_schema));
    setSchemaText(JSON.stringify(draft.example_schema, null, 2));
    if (draft.mode === "batch" && draft.urls?.length) {
      setMode("batch");
      setUrlsText(draft.urls.join("\n"));
    } else if (draft.target_url) {
      setMode("single");
      setTargetUrl(draft.target_url);
    }
    setShowAdvanced(false);
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
        `Target volume cannot exceed ${PLATFORM_MAX_RECORDS.toLocaleString()} rows.`,
      );
      setLoading(false);
      return;
    }

    let example_schema: Record<string, unknown>;
    if (showAdvanced) {
      try {
        example_schema = JSON.parse(schemaText);
        if (typeof example_schema !== "object" || Array.isArray(example_schema)) {
          throw new Error("Schema must be a JSON object");
        }
      } catch {
        setError("Please provide valid JSON in the advanced schema editor.");
        setLoading(false);
        return;
      }
    } else {
      example_schema = fieldRowsToSchema(fieldRows);
      if (Object.keys(example_schema).length === 0) {
        setError("Add at least one field to collect.");
        setLoading(false);
        return;
      }
    }

    const budget = Number(budgetInr);
    if (!Number.isFinite(budget) || budget < MIN_BUDGET_INR) {
      setError(`Set a budget of at least ₹${MIN_BUDGET_INR}.`);
      setLoading(false);
      return;
    }
    if (budget > MAX_JOB_BUDGET_INR) {
      setError(`Budget cannot exceed ₹${MAX_JOB_BUDGET_INR.toLocaleString()}.`);
      setLoading(false);
      return;
    }

    const budgetCents = Math.round(budget * 100);

    if (mode === "batch") {
      const urls = urlsText
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);
      if (urls.length === 0) {
        setError("Add at least one URL.");
        setLoading(false);
        return;
      }
      if (urls.length > MAX_BATCH_URLS) {
        setError(`Maximum ${MAX_BATCH_URLS} URLs per batch.`);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          urls,
          example_schema: attachJobMeta(example_schema, {
            max_records: parsedMaxRecords,
            budget_cents: budgetCents,
            effective_max_records: estimate.effectiveRecords,
            limited_by: estimate.limitedBy,
            economics: estimate.economics,
            domain: extractDomain(urls[0] ?? "") ?? undefined,
          }),
          max_records: parsedMaxRecords,
          budget_cents: estimate.totalCents,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Failed to create batch");
        return;
      }
      router.push(`/dashboard/batches/${data.batch.id}`);
      router.refresh();
      return;
    }

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
          limited_by: estimate.limitedBy,
          economics: estimate.economics,
          target_url: targetUrl,
          domain: extractDomain(targetUrl) ?? undefined,
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
      <DashboardHeader title="New extraction" />
      <DashboardPage>
        <Link href="/dashboard/jobs" className="app-back-link mb-6">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to jobs
        </Link>

        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {batchEnabled ? (
              <ModeToggle mode={mode} onChange={setMode} batchEnabled={batchEnabled} />
            ) : (
              <p className="text-sm text-graphite-400">Single URL extraction</p>
            )}
            <Button type="button" variant="outline" onClick={() => setWizardOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Describe with AI
            </Button>
          </div>

          <Panel className="border-honey-500/20 bg-honey-500/5">
            <p className="text-sm leading-relaxed text-graphite-300">
              Not sure about JSON or URLs? Click{" "}
              <strong className="font-medium text-honey-400">Describe with AI</strong>{" "}
              — write what you need in plain English, review the draft, then submit.
            </p>
          </Panel>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Panel>
              <FieldGroup>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <FieldHint>A short label your team will recognize.</FieldHint>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    mode === "batch"
                      ? "Weekly catalog pull"
                      : "Naukri React jobs — weekly"
                  }
                  className="mt-0.5"
                />
              </FieldGroup>
            </Panel>

            {mode === "single" ? (
              <Panel>
                <FieldGroup>
                  <FieldLabel htmlFor="url">Website URL</FieldLabel>
                  <FieldHint>Must be on your approved site list.</FieldHint>
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
              </Panel>
            ) : (
              <Panel>
                <FieldGroup>
                  <FieldLabel htmlFor="urls">URLs (one per line)</FieldLabel>
                  <FieldHint>
                    Max {MAX_BATCH_URLS} URLs · {urlCount} entered
                  </FieldHint>
                  <Textarea
                    id="urls"
                    required
                    rows={5}
                    value={urlsText}
                    onChange={(e) => setUrlsText(e.target.value)}
                    className="mt-0.5"
                  />
                </FieldGroup>
              </Panel>
            )}

            {mode === "single" && (
              <Panel>
                <FieldGroup>
                  <FieldLabel htmlFor="region">
                    Target region{" "}
                    <span className="font-normal text-graphite-400">(optional)</span>
                  </FieldLabel>
                  <Select
                    id="region"
                    value={requiredRegion}
                    onChange={(e) => setRequiredRegion(e.target.value)}
                    className="mt-0.5"
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
                  </Select>
                </FieldGroup>
              </Panel>
            )}

            <Panel className="space-y-4">
              <FieldGroup>
                <FieldLabel htmlFor="max-records">
                  Target volume ({mode === "batch" ? "rows per URL" : "rows"})
                </FieldLabel>
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
                <Input
                  id="budget"
                  type="number"
                  min={MIN_BUDGET_INR}
                  required
                  value={budgetInr}
                  onChange={(e) => setBudgetInr(e.target.value)}
                />
              </FieldGroup>
            </Panel>

            <Panel>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium text-graphite-300"
              >
                Advanced: raw JSON schema
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showAdvanced ? (
                <FieldGroup className="mt-4">
                  <Textarea
                    id="schema"
                    rows={8}
                    mono
                    value={schemaText}
                    onChange={(e) => {
                      setSchemaText(e.target.value);
                      try {
                        setFieldRows(
                          schemaToFieldRows(
                            JSON.parse(e.target.value) as Record<string, unknown>,
                          ),
                        );
                      } catch {
                        /* typing */
                      }
                    }}
                    className="mt-2 border-graphite-700 bg-graphite-950 text-graphite-200"
                  />
                </FieldGroup>
              ) : (
                <div className="mt-4">
                  <SchemaFieldsEditor
                    fields={fieldRows}
                    onChange={(rows) => {
                      setFieldRows(rows);
                      setSchemaText(
                        JSON.stringify(fieldRowsToSchema(rows), null, 2),
                      );
                    }}
                  />
                </div>
              )}
            </Panel>

            <CostEstimatePanel
              estimate={estimate}
              label={mode === "batch" ? "Estimated batch cost" : "Estimated cost"}
            />

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
              ) : mode === "batch" ? (
                "Submit batch"
              ) : (
                "Submit job"
              )}
            </Button>
          </form>
        </div>
      </DashboardPage>

      <ExtractionAiWizard
        open={wizardOpen}
        mode={mode}
        onClose={() => setWizardOpen(false)}
        onApply={applyDraft}
      />
    </>
  );
}
