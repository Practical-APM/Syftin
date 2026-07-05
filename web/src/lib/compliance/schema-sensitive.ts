import { getWhitelistEntryForDomain } from "@/lib/data/domains";

/** Field names that imply contact / identity data (DPDP pilot minimum). */
const SENSITIVE_FIELD_RE =
  /phone|mobile|email|e-mail|contact|broker|aadhaar|aadhar|pan\b|gstin|ssn|passport|address/i;

const MAX_SCHEMA_DEPTH = 24;

export function schemaRequestsSensitiveData(schema: unknown): boolean {
  return walkSchema(schema, 0);
}

function walkSchema(value: unknown, depth: number): boolean {
  if (depth > MAX_SCHEMA_DEPTH || value == null) return false;
  if (Array.isArray(value)) {
    return value.some((item) => walkSchema(item, depth + 1));
  }
  if (typeof value !== "object") return false;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_FIELD_RE.test(key)) return true;
    if (walkSchema(child, depth + 1)) return true;
  }
  return false;
}

/** Block jobs requesting PII unless admin recorded legal_basis on the domain. */
export async function assertDomainLegalBasisForSchema(
  domain: string,
  schema: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!schemaRequestsSensitiveData(schema)) return { ok: true };

  const entry = await getWhitelistEntryForDomain(domain);
  if (entry?.legal_basis?.trim()) return { ok: true };

  return {
    ok: false,
    error: `Schema requests contact or identity fields (phone, email, address, etc.). An admin must record legal_basis for "${domain}" before jobs can run. See DPDP pilot policy.`,
  };
}
