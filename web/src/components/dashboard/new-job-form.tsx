"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/card";
import { FieldGroup, FieldHint, FieldLabel, Input, Textarea } from "@/components/ui/input";
import {
  formatSchemaTemplate,
  schemaForDomain,
} from "@/lib/constants/schema-templates";
import { extractDomain } from "@/lib/constants/whitelist";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";

const DEFAULT_DOMAIN = "naukri.com";

export function NewJobForm({ domains }: { domains: string[] }) {
  const router = useRouter();
  const initialDomain = domains[0] ?? DEFAULT_DOMAIN;
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState(`https://${initialDomain}`);
  const [schemaText, setSchemaText] = useState(
    formatSchemaTemplate(schemaForDomain(initialDomain)),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requiredRegion, setRequiredRegion] = useState("");

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

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        target_url: targetUrl,
        example_schema,
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
        <Link
          href="/dashboard/jobs"
          className="mb-6 inline-flex items-center gap-2 text-sm text-graphite-500 transition-colors hover:text-graphite-900"
        >
          <ArrowLeft className="h-4 w-4" />
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
                    className="rounded-md border border-ivory-200 bg-ivory-50 px-2.5 py-1 text-[11px] text-graphite-600 transition-colors hover:border-honey-500/40 hover:bg-honey-500/5"
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            <Link
              href="/dashboard/compliance"
              className="mt-3 inline-block text-xs font-medium text-honey-600 hover:text-honey-500"
            >
              View approved sites →
            </Link>
          </Panel>

          <Panel>
            <FieldGroup>
              <FieldLabel htmlFor="region">Target region <span className="text-graphite-400 font-normal">(optional)</span></FieldLabel>
              <FieldHint>
                Route extraction to contributor nodes in a specific region — useful for GDPR compliance or geo-specific content.
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
                className="mt-0.5 border-graphite-800 bg-graphite-950 leading-relaxed text-graphite-300 focus:border-honey-500/50 focus:bg-graphite-950"
              />
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
              "Submit job"
            )}
          </Button>
        </form>
      </DashboardPage>
    </>
  );
}
