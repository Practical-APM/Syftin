"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/card";
import { FieldGroup, FieldHint, FieldLabel, Input, Textarea, Select } from "@/components/ui/input";
import { formatSchemaTemplate, schemaForDomain } from "@/lib/constants/schema-templates";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";

export function NewBatchForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [schemaText, setSchemaText] = useState(formatSchemaTemplate(schemaForDomain("naukri.com")));
  const [pricing, setPricing] = useState("per_shard");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, urls, example_schema, batch_pricing: pricing }),
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
          className="mb-6 inline-flex items-center gap-2 text-sm text-graphite-500 transition-colors hover:text-graphite-900"
        >
          <ArrowLeft className="h-4 w-4" />
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
              <FieldHint>Max 100 URLs per batch.</FieldHint>
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
                className="mt-0.5 border-graphite-800 bg-graphite-950 text-graphite-300 focus:border-honey-500/50"
              />
            </FieldGroup>
          </Panel>

          <Panel>
             <FieldGroup>
               <FieldLabel htmlFor="pricing">Pricing Model</FieldLabel>
               <Select id="pricing" value={pricing} onChange={(e) => setPricing(e.target.value)} className="mt-0.5">
                  <option value="per_shard">Per Shard (₹5 per URL)</option>
                  <option value="per_batch">Per Batch (₹5 total)</option>
               </Select>
             </FieldGroup>
          </Panel>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
