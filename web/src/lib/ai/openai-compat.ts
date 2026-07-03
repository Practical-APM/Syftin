import type { ExtractionDraft, ExtractionDraftRequest } from "@/lib/ai/extraction-draft";
import { buildDraftPrompt, parseDraftJson } from "@/lib/ai/draft-prompt";

// OpenAI-compatible chat-completions provider. This is the vendor-independent
// fallback for schema drafting: it works against OpenAI, OpenRouter, or any
// self-hosted server that speaks the /v1/chat/completions API (vLLM, Ollama's
// OpenAI shim, LM Studio, etc.). If Gemini's free tier changes, point
// AI_DRAFT_BASE_URL at a self-hosted instruct model and nothing else changes.

export function isOpenAICompatConfigured(): boolean {
  return Boolean(process.env.AI_DRAFT_BASE_URL?.trim());
}

function baseURL(): string {
  return (process.env.AI_DRAFT_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

function draftModel(): string {
  return process.env.AI_DRAFT_MODEL?.trim() || "gpt-4o-mini";
}

async function callOpenAICompat(prompt: string): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.AI_DRAFT_API_KEY?.trim();
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch(`${baseURL()}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: draftModel(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You output only valid JSON. No markdown, no prose.",
        },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`AI draft provider error: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("AI draft provider returned an empty response.");
  return text;
}

/** Generate an extraction draft via an OpenAI-compatible endpoint. */
export async function openAICompatDraft(
  input: ExtractionDraftRequest,
): Promise<ExtractionDraft> {
  const text = await callOpenAICompat(buildDraftPrompt(input));
  return parseDraftJson(text, input.mode);
}
