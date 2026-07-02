/**
 * Input sanitization for job submissions.
 * Blocks illegal, NSFW, and injection patterns before tasks are created.
 */

const BLOCKED_PATTERNS: { category: string; pattern: RegExp }[] = [
  // Illegal / harmful content indicators
  { category: "illegal content", pattern: /\b(child\s*porn|csam|underage\s*(sex|porn|nude))\b/i },
  { category: "illegal content", pattern: /\b(hitman|assassination\s*for\s*hire|buy\s*(cocaine|heroin|meth|fentanyl))\b/i },
  { category: "illegal content", pattern: /\b(credit\s*card\s*dump|stolen\s*credentials|credential\s*stuffing)\b/i },
  // NSFW / adult content scraping intent
  { category: "NSFW content", pattern: /\b(porn(ography)?|xxx|hentai|onlyfans\s*leak|nude\s*(pics|photos|videos))\b/i },
  { category: "NSFW content", pattern: /\b(escort\s*service|adult\s*webcam|sex\s*chat)\b/i },
  // Abuse / harassment targets
  { category: "prohibited target", pattern: /\b(revenge\s*porn|doxx(ing)?|swatting)\b/i },
];

const BLOCKED_URL_SCHEMES = /^(javascript|data|file|vbscript):/i;

export type SanitizeResult =
  | { ok: true; sanitized: { name: string; target_url: string } }
  | { ok: false; error: string };

function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function scanForBlockedTerms(text: string): string | null {
  for (const { category, pattern } of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return `Input rejected: contains blocked ${category}. Syftin only processes legitimate public data extraction.`;
    }
  }
  return null;
}

function scanJsonValues(obj: unknown): string | null {
  if (typeof obj === "string") {
    return scanForBlockedTerms(obj);
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const hit = scanJsonValues(item);
      if (hit) return hit;
    }
    return null;
  }
  if (obj && typeof obj === "object") {
    for (const value of Object.values(obj)) {
      const hit = scanJsonValues(value);
      if (hit) return hit;
    }
  }
  return null;
}

export function validateUrlSafety(url: string): string | null {
  const trimmed = url.trim();
  if (BLOCKED_URL_SCHEMES.test(trimmed)) {
    return "Invalid URL scheme. Only http and https are allowed.";
  }
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "Invalid URL scheme. Only http and https are allowed.";
    }
    if (parsed.username || parsed.password) {
      return "URLs with embedded credentials are not allowed.";
    }
  } catch {
    return "Invalid URL format.";
  }
  return scanForBlockedTerms(trimmed);
}

export function sanitizeJobInput(input: {
  name: string;
  target_url: string;
  example_schema: Record<string, unknown>;
}): SanitizeResult {
  const name = stripControlChars(input.name).slice(0, 200);
  const target_url = stripControlChars(input.target_url).slice(0, 2048);

  if (!name || name.length < 2) {
    return { ok: false, error: "Job name must be at least 2 characters." };
  }

  const urlError = validateUrlSafety(target_url);
  if (urlError) {
    return { ok: false, error: urlError };
  }

  const nameError = scanForBlockedTerms(name);
  if (nameError) {
    return { ok: false, error: nameError };
  }

  const schemaError = scanJsonValues(input.example_schema);
  if (schemaError) {
    return { ok: false, error: schemaError };
  }

  return { ok: true, sanitized: { name, target_url } };
}

export function sanitizeDomainInput(domain: string): { ok: true; domain: string } | { ok: false; error: string } {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");
  if (!normalized) {
    return { ok: false, error: "Domain is required." };
  }

  const blocked = scanForBlockedTerms(normalized);
  if (blocked) {
    return { ok: false, error: blocked };
  }

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(normalized)) {
    return { ok: false, error: "Invalid domain format. Example: naukri.com" };
  }

  return { ok: true, domain: normalized };
}
