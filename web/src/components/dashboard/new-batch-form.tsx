"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/card";
import { CostEstimatePanel } from "@/components/dashboard/cost-estimate-panel";
import { FieldGroup, FieldHint, FieldLabel, Input, Textarea } from "@/components/ui/input";
import { formatSchemaTemplate, schemaForDomain } from "@/lib/constants/schema-templates";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { MAX_BATCH_URLS, MAX_JOB_BUDGET_INR, PLATFORM_MAX_RECORDS } from "@/lib/env";
import {
  DEFAULT_TARGET_RECORDS,
  MIN_BUDGET_INR,
  attachJobMeta,
  estimateBatchCost,
} from "@/lib/pricing/estimates";

const VOLUME_PRESETS = [1_000, 10_000, 100_000, 1_000_000] as const;

export function NewBatchForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [schemaText, setSchemaText] = useState(formatSchemaTemplate(schemaForDomain("naukri.com")));
  const [maxRecords, setMaxRecords] = useState(String(DEFAULT_TARGET_RECORDS));
  const [budgetInr, setBudgetInr] = useState("5000");
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

  const estimate = useMemo(
    () =>
      estimateBatchCost({
        urlCount: Math.max(urlCount, 1),
        maxRecords: Number(maxRecords) || DEFAULT_TARGET_RECORDS,
        budgetInr: Number(budgetInr) || undefined,
      }),
    [urlCount, maxRecords, budgetInr],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setError("Please provide at least one URL.");
      setLoading(false);
      return;
    }

    if (urls.length > MAX_BATCH_URLS) {
      setError(`Maximum ${MAX_BATCH_URLS} URLs per batch.`);
      setLoading(false);
      return;
    }

    const parsedMaxRecords = Number(maxRecords);
    if (!Number.isFinite(parsedMaxRecords) || parsedMaxRecords < 1) {
      setError("Target volume must be at least 1 record per URL.");
      setLoading(false);
      return;
    }
    if (parsedMaxRecords > PLATFORM_MAX_RECORDS) {
      setError(
        `Target volume cannot exceed ${PLATFORM_MAX_RECORDS.toLocaleString()} rows per URL.`,
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
      setError(`Budget cannot exceed ₹${MAX_JOB_BUDGET_INR.toLocaleString()}.`);
      setLoading(false);
      return;
    }

    const budgetCents = Math.round(budget * 100);

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
  }

  return (
    <>
      <DashboardHeader title="Create a batch" />
      <DashboardPage>
        <Link
          href="/dashboard/batches"
          className="app-back-link mb-6"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to batches
        </Link>

        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          <Panel>
            <FieldGroup>
              <FieldLabel htmlFor="name">Batch name</FieldLabel>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Weekly catalog pull"
                className="mt-0.5"
              />
            </FieldGroup>
          </Panel>

          <Panel>
            <FieldGroup>
              <FieldLabel htmlFor="urls">URLs (one per line)</FieldLabel>
              <FieldHint>
                Max {MAX_BATCH_URLS} URLs per batch · {urlCount} entered
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

          <Panel>
            <FieldGroup>
              <FieldLabel htmlFor="schema">Fields you want back (JSON schema)</FieldLabel>
              <Textarea
                id="schema"
                required
                rows={8}
                mono
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                className="mt-0.5 border-graphite-700 bg-graphite-950 text-graphite-200 focus:border-honey-500/50"
              />
            </FieldGroup>
          </Panel>

          <Panel className="space-y-4">
            <FieldGroup>
              <FieldLabel htmlFor="max-records">Target volume per URL (rows)</FieldLabel>
              <FieldHint>
                Rows to collect from each URL. Stops at budget or this target.
                Platform safety limit: {PLATFORM_MAX_RECORDS.toLocaleString()} rows/URL.
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
                Total spend cap for the batch. Scales with URL count and row volume
                — 10 URLs × 100K rows ≈ ₹1L+ at ₹0.10/record.
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

          <CostEstimatePanel estimate={estimate} label="Estimated batch cost" />

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
              "Submit batch"
            )}
          </Button>
        </form>
      </DashboardPage>
    </>
  );
}
