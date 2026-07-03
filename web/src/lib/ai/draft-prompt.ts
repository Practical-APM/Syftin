import type { ExtractionDraft, ExtractionDraftRequest } from "@/lib/ai/extraction-draft";
import { schemaForDomain } from "@/lib/constants/schema-templates";
import { extractDomain } from "@/lib/constants/whitelist";
import { DEFAULT_TARGET_RECORDS } from "@/lib/pricing/estimates";

// Provider-agnostic prompt + parsing for extraction-draft generation. Every AI
// provider (Gemini, OpenAI-compatible, self-hosted) shares this so switching
// providers never means re-tuning the prompt or the JSON parser.

export function buildDraftPrompt(input: ExtractionDraftRequest): string {
  const domainHint =
    input.allowed_domains.length > 0
      ? `Approved domains (pick the best match): ${input.allowed_domains.join(", ")}`
      : "Use naukri.com if unsure.";

  return `You are Syftin's job setup assistant for a data extraction platform.
Convert the buyer's plain-language request into a structured extraction job.

Rules:
- Output ONLY valid JSON matching the schema below. No markdown.
- mode is "${input.mode}" (${input.mode === "batch" ? "multiple URLs" : "single URL"}).
- example_schema must be ONE example row as a flat JSON object (field names snake_case, e.g. job_title, company_name, price_inr).
- Include 4–8 realistic fields with plausible example values — not placeholder text like "string" or "value".
- max_records: realistic target row count (500 default, up to 100000 for large catalogs).
- budget_inr: realistic INR budget (min 500 for single, 5000 for batch; scale with volume at ₹0.10/row + ₹5 base).
- URLs must use https:// and an approved domain when possible.
- required_region: ISO country code (IN, US, etc.) or omit if not specified.
- summary: 1-2 friendly sentences explaining what you configured (no jargon).

${domainHint}

Buyer request:
"""
${input.requirements.trim()}
"""

JSON schema to return:
{
  "mode": "${input.mode}",
  "name": "string",
  "target_url": "string (single mode only)",
  "urls": ["string"] (batch mode only, one URL per entry),
  "example_schema": { "field": "example value" },
  "max_records": number,
  "budget_inr": number,
  "required_region": "optional ISO code",
  "summary": "string"
}`;
}

export function parseDraftJson(
  raw: string,
  mode: ExtractionDraft["mode"],
): ExtractionDraft {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<ExtractionDraft>;

  if (!parsed.name || !parsed.example_schema || typeof parsed.example_schema !== "object") {
    throw new Error("AI draft missing required fields.");
  }

  return {
    mode,
    name: String(parsed.name),
    target_url: parsed.target_url ? String(parsed.target_url) : undefined,
    urls: Array.isArray(parsed.urls) ? parsed.urls.map(String) : undefined,
    example_schema: parsed.example_schema as Record<string, unknown>,
    max_records: clampNum(parsed.max_records, DEFAULT_TARGET_RECORDS, 5_000_000),
    budget_inr: clampNum(parsed.budget_inr, mode === "batch" ? 5000 : 500, 500_000),
    required_region: parsed.required_region ? String(parsed.required_region) : undefined,
    summary: parsed.summary ? String(parsed.summary) : "Draft generated from your description.",
  };
}

function clampNum(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.round(n), max);
}

/** Deterministic fallback when no AI provider is configured. */
export function mockExtractionDraft(input: ExtractionDraftRequest): ExtractionDraft {
  const text = input.requirements.toLowerCase();
  const domain =
    input.allowed_domains.find((d) => text.includes(d.replace(".com", "").replace(".in", ""))) ??
    input.allowed_domains[0] ??
    "naukri.com";

  const schema = schemaForDomain(domain);
  const isBatch = input.mode === "batch" || text.includes("multiple") || text.includes("several url");

  let maxRecords = DEFAULT_TARGET_RECORDS;
  if (text.includes("100k") || text.includes("100,000")) maxRecords = 100_000;
  else if (text.includes("10k") || text.includes("10,000")) maxRecords = 10_000;
  else if (text.includes("1m") || text.includes("million")) maxRecords = 1_000_000;

  const budgetInr = isBatch
    ? Math.max(5000, Math.round(maxRecords * 0.1 * 2))
    : Math.max(500, Math.round(maxRecords * 0.1 + 5));

  const name =
    input.requirements.split(/[.!?\n]/)[0]?.trim().slice(0, 80) ||
    (isBatch ? "Batch extraction" : "Data extraction job");

  if (isBatch) {
    return {
      mode: "batch",
      name,
      urls: [`https://${domain}`, `https://${domain}/category/example`],
      example_schema: schema,
      max_records: maxRecords,
      budget_inr: budgetInr,
      summary: `Batch draft for ${domain} with ~${maxRecords.toLocaleString()} rows per URL (demo mode — configure an AI provider for smarter drafts).`,
    };
  }

  const targetUrl = extractUrlFromText(input.requirements) ?? `https://${domain}`;

  return {
    mode: "single",
    name,
    target_url: targetUrl,
    example_schema: schema,
    max_records: maxRecords,
    budget_inr: budgetInr,
    required_region: text.includes("india") ? "IN" : undefined,
    summary: `Single-page draft for ${extractDomain(targetUrl) ?? domain} (demo mode — configure an AI provider for smarter drafts).`,
  };
}

function extractUrlFromText(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s,)]+/i);
  return match?.[0] ?? null;
}
