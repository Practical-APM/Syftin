import type { ExtractionDraft, ExtractionDraftRequest } from "@/lib/ai/extraction-draft";
import { buildDraftPrompt, parseDraftJson } from "@/lib/ai/draft-prompt";

const DEFAULT_MODEL = "gemini-2.5-flash-preview-05-20";
const FALLBACK_MODEL = "gemini-2.0-flash";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const models = [geminiModel(), FALLBACK_MODEL].filter(
    (m, i, arr) => arr.indexOf(m) === i,
  );

  let lastError = "";
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      lastError = await res.text().catch(() => "");
      continue;
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
    lastError = "empty response";
  }

  throw new Error(`Gemini API error: ${lastError.slice(0, 200)}`);
}

/** Generate an extraction draft using Gemini. */
export async function geminiDraft(
  input: ExtractionDraftRequest,
): Promise<ExtractionDraft> {
  const text = await callGemini(buildDraftPrompt(input));
  return parseDraftJson(text, input.mode);
}
