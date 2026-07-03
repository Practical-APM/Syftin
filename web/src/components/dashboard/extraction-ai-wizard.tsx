"use client";

import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SchemaFieldsEditor,
} from "@/components/dashboard/schema-fields-editor";
import { FieldGroup, FieldHint, FieldLabel, Input, Textarea } from "@/components/ui/input";
import {
  fieldRowsToSchema,
  schemaToFieldRows,
} from "@/lib/schema/fields-editor";
import type { ExtractionDraft } from "@/lib/ai/extraction-draft";
import { cn } from "@/lib/utils";

function validateDraft(draft: ExtractionDraft, mode: "single" | "batch"): string | null {
  if (!draft.name.trim()) return "Give the job a name.";
  if (mode === "single" && !draft.target_url?.trim()) {
    return "Add a website URL.";
  }
  if (mode === "batch" && (!draft.urls?.length || draft.urls.every((u) => !u.trim()))) {
    return "Add at least one URL.";
  }
  const fields = fieldRowsToSchema(schemaToFieldRows(draft.example_schema));
  if (Object.keys(fields).length === 0) {
    return "Add at least one field to collect.";
  }
  return null;
}

type WizardStep = "describe" | "review";

export function ExtractionAiWizard({
  open,
  mode,
  onClose,
  onApply,
}: {
  open: boolean;
  mode: "single" | "batch";
  onClose: () => void;
  onApply: (draft: ExtractionDraft) => void;
}) {
  const [step, setStep] = useState<WizardStep>("describe");
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExtractionDraft | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  if (!open) return null;

  function reset() {
    setStep("describe");
    setRequirements("");
    setDraft(null);
    setDemoMode(false);
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/extraction/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate draft");
      setDraft(data.draft as ExtractionDraft);
      setDemoMode(Boolean(data.demo));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(patch: Partial<ExtractionDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-graphite-950/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-wizard-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-graphite-700 bg-graphite-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-graphite-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-honey-400" />
            <h2 id="ai-wizard-title" className="text-sm font-semibold text-graphite-100">
              {step === "describe" ? "Describe what you need" : "Review & fine-tune"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-graphite-400 hover:bg-graphite-800 hover:text-graphite-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "describe" ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-graphite-400">
                Tell us in plain English what data you want, from which site, and roughly
                how many rows. We&apos;ll turn it into a job you can edit before submitting.
              </p>
              <FieldGroup>
                <FieldLabel htmlFor="requirements">Your requirements</FieldLabel>
                <Textarea
                  id="requirements"
                  rows={6}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder={
                    mode === "batch"
                      ? 'e.g. "Pull product name and price from 5 Blinkit category pages, about 2,000 products each, budget ₹15,000"'
                      : 'e.g. "Get React developer jobs from Naukri in Mumbai — title, company, salary — around 5,000 listings, budget ₹2,000"'
                  }
                  className="mt-1 border-graphite-700 bg-graphite-950 text-graphite-200"
                />
                <FieldHint>No JSON needed — just describe the outcome you want.</FieldHint>
              </FieldGroup>
              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
            </div>
          ) : draft ? (
            <div className="space-y-4">
              {demoMode && (
                <p className="rounded-lg border border-graphite-600 bg-graphite-800/60 px-3 py-2 text-xs text-graphite-400">
                  Demo mode — set{" "}
                  <span className="font-mono text-graphite-300">GEMINI_API_KEY</span>{" "}
                  for smarter drafts from your description.
                </p>
              )}
              <p className="rounded-lg border border-honey-500/20 bg-honey-500/5 px-3 py-2.5 text-sm leading-relaxed text-graphite-300">
                {draft.summary}
              </p>
              <FieldGroup>
                <FieldLabel htmlFor="draft-name">Job name</FieldLabel>
                <Input
                  id="draft-name"
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                />
              </FieldGroup>
              {mode === "single" ? (
                <FieldGroup>
                  <FieldLabel htmlFor="draft-url">Website URL</FieldLabel>
                  <Input
                    id="draft-url"
                    mono
                    value={draft.target_url ?? ""}
                    onChange={(e) => updateDraft({ target_url: e.target.value })}
                  />
                </FieldGroup>
              ) : (
                <FieldGroup>
                  <FieldLabel htmlFor="draft-urls">URLs (one per line)</FieldLabel>
                  <Textarea
                    id="draft-urls"
                    rows={4}
                    value={(draft.urls ?? []).join("\n")}
                    onChange={(e) =>
                      updateDraft({
                        urls: e.target.value.split("\n").map((u) => u.trim()).filter(Boolean),
                      })
                    }
                  />
                </FieldGroup>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup>
                  <FieldLabel htmlFor="draft-volume">Target rows</FieldLabel>
                  <Input
                    id="draft-volume"
                    type="number"
                    value={draft.max_records}
                    onChange={(e) =>
                      updateDraft({ max_records: Number(e.target.value) || 500 })
                    }
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="draft-budget">Budget (INR)</FieldLabel>
                  <Input
                    id="draft-budget"
                    type="number"
                    value={draft.budget_inr}
                    onChange={(e) =>
                      updateDraft({ budget_inr: Number(e.target.value) || 500 })
                    }
                  />
                </FieldGroup>
              </div>
              <SchemaFieldsEditor
                fields={schemaToFieldRows(draft.example_schema)}
                onChange={(rows) =>
                  updateDraft({ example_schema: fieldRowsToSchema(rows) })
                }
              />
              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-graphite-800 px-5 py-4">
          {step === "review" ? (
            <Button type="button" variant="ghost" onClick={() => setStep("describe")}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            {step === "describe" ? (
              <Button
                type="button"
                disabled={loading || requirements.trim().length < 10}
                onClick={handleGenerate}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate draft
                  </>
                )}
              </Button>
            ) : (
              draft && (
                <Button
                  type="button"
                  onClick={() => {
                    const validationError = validateDraft(draft, mode);
                    if (validationError) {
                      setError(validationError);
                      return;
                    }
                    onApply(draft);
                    handleClose();
                  }}
                >
                  Use these settings
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModeToggle({
  mode,
  onChange,
  batchEnabled,
}: {
  mode: "single" | "batch";
  onChange: (mode: "single" | "batch") => void;
  batchEnabled: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-graphite-700 bg-graphite-900 p-1">
      <button
        type="button"
        onClick={() => onChange("single")}
        className={cn(
          "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
          mode === "single"
            ? "bg-honey-500/15 text-honey-400"
            : "text-graphite-400 hover:text-graphite-200",
        )}
      >
        Single URL
      </button>
      {batchEnabled && (
        <button
          type="button"
          onClick={() => onChange("batch")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            mode === "batch"
              ? "bg-honey-500/15 text-honey-400"
              : "text-graphite-400 hover:text-graphite-200",
          )}
        >
          Multiple URLs
        </button>
      )}
    </div>
  );
}
