import type { ExtractionDraft, ExtractionDraftRequest } from "@/lib/ai/extraction-draft";
import { mockExtractionDraft } from "@/lib/ai/draft-prompt";
import { geminiDraft, isGeminiConfigured } from "@/lib/ai/gemini";
import { isOpenAICompatConfigured, openAICompatDraft } from "@/lib/ai/openai-compat";

// AI provider selection for extraction-draft generation.
//
// The AI wizard is a convenience layer, not a hard dependency: if no provider is
// configured (or the chosen one is unavailable) we always fall back to a
// deterministic mock draft so job setup never breaks. AI_DRAFT_PROVIDER can pin
// a provider; otherwise we auto-detect Gemini, then any OpenAI-compatible
// endpoint, then demo. This keeps us insulated from any single vendor's pricing
// or availability changes.

export type DraftProvider = "gemini" | "openai" | "demo";

export function activeDraftProvider(): DraftProvider {
  const pinned = process.env.AI_DRAFT_PROVIDER?.trim().toLowerCase();
  if (pinned === "gemini" && isGeminiConfigured()) return "gemini";
  if (pinned === "openai" && isOpenAICompatConfigured()) return "openai";
  if (pinned === "demo") return "demo";

  if (isGeminiConfigured()) return "gemini";
  if (isOpenAICompatConfigured()) return "openai";
  return "demo";
}

/** True when a real AI provider (not the demo fallback) is available. */
export function isDraftAIConfigured(): boolean {
  return activeDraftProvider() !== "demo";
}

export async function generateExtractionDraft(
  input: ExtractionDraftRequest,
): Promise<ExtractionDraft> {
  const provider = activeDraftProvider();
  try {
    if (provider === "gemini") return await geminiDraft(input);
    if (provider === "openai") return await openAICompatDraft(input);
  } catch (err) {
    // Never fail job setup because an external model is down — degrade to demo.
    console.error(
      `AI draft provider "${provider}" failed, using demo draft:`,
      err instanceof Error ? err.message : err,
    );
    return mockExtractionDraft(input);
  }
  return mockExtractionDraft(input);
}
