import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { assertDomainBenchmarkGate } from "@/lib/data/benchmarks";
import {
  DEFAULT_WHITELIST_DOMAINS,
  domainMatchesWhitelist,
  extractDomain,
  normalizeDomainInput,
} from "@/lib/constants/whitelist";
import { sanitizeDomainInput } from "@/lib/sanitize";

export type WhitelistEntry = {
  id?: string;
  domain: string;
  vertical?: string | null;
  is_active: boolean;
  base_fee_paise?: number;
  per_record_paise?: number;
  price_tier?: "standard" | "adversarial";
  requires_consensus?: boolean;
  execution_suspended?: boolean;
  suspension_reason?: string | null;
  legal_basis?: string | null;
  tos_url?: string | null;
  legal_reviewed_by?: string | null;
  legal_reviewed_at?: string | null;
  legal_review_due_at?: string | null;
  legal_notes?: string | null;
  stealth_profile?: Record<string, unknown> | null;
  poison_markers?: string[] | null;
};

export type LegalGovernanceInput = {
  legal_basis?: string;
  tos_url?: string;
  legal_reviewed_by?: string;
  legal_reviewed_at?: string;
  legal_review_due_at?: string;
  legal_notes?: string;
};

declare global {
  // Demo-mode in-memory whitelist (persists for dev server session)
  var __syftinMockDomains: string[] | undefined;
}

function getMockDomains(): string[] {
  if (!global.__syftinMockDomains) {
    global.__syftinMockDomains = [...DEFAULT_WHITELIST_DOMAINS];
  }
  return global.__syftinMockDomains;
}

export async function getWhitelistDomains(): Promise<WhitelistEntry[]> {
  if (!isSupabaseConfigured()) {
    return getMockDomains().map((domain) => ({
      domain,
      is_active: true,
    }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("whitelist_domains")
    .select(
      "id, domain, vertical, is_active, base_fee_paise, per_record_paise, price_tier, requires_consensus, execution_suspended, suspension_reason, legal_basis, tos_url, legal_reviewed_by, legal_reviewed_at, legal_review_due_at, legal_notes, stealth_profile, poison_markers",
    )
    .eq("is_active", true)
    .order("domain");

  if (error || !data?.length) {
    return DEFAULT_WHITELIST_DOMAINS.map((domain) => ({
      domain,
      is_active: true,
    }));
  }

  return data as WhitelistEntry[];
}

export async function getActiveDomainList(): Promise<string[]> {
  const entries = await getWhitelistDomains();
  return entries.filter((e) => e.is_active).map((e) => e.domain);
}

export async function getWhitelistEntryForDomain(
  domain: string,
): Promise<WhitelistEntry | null> {
  const normalized = normalizeDomainInput(domain);
  if (!normalized) return null;

  const entries = await getWhitelistDomains();
  return (
    entries.find((e) => e.domain === normalized) ??
    entries.find((e) => domainMatchesWhitelist(normalized, [e.domain])) ??
    null
  );
}

export async function isWhitelistedUrl(url: string): Promise<boolean> {
  const domain = extractDomain(url);
  if (!domain) return false;
  const allowed = await getActiveDomainList();
  return domainMatchesWhitelist(domain, allowed);
}

/** Block new jobs when circuit breaker or admin has suspended execution. */
export async function assertDomainExecutionAllowed(
  domain: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const normalized = normalizeDomainInput(domain) ?? domain.trim().toLowerCase();
  const admin = createAdminClient();
  const { data: suspendedRows } = await admin
    .from("whitelist_domains")
    .select("domain, suspension_reason")
    .eq("execution_suspended", true);

  for (const row of suspendedRows ?? []) {
    const suspendedDomain = row.domain as string;
    if (
      normalized === suspendedDomain ||
      domainMatchesWhitelist(normalized, [suspendedDomain])
    ) {
      const reason =
        (row.suspension_reason as string | null) ?? "EXECUTION_SUSPENDED";
      return {
        ok: false,
        error: `Extraction for ${normalized} is temporarily suspended (${reason}). In-flight jobs may still complete; new jobs are blocked until an admin clears suspension.`,
      };
    }
  }

  return { ok: true };
}

export type AddDomainResult =
  | { success: true; entry: WhitelistEntry }
  | { success: false; error: string };

export async function addWhitelistDomain(
  rawDomain: string,
  vertical?: string,
): Promise<AddDomainResult> {
  const sanitized = sanitizeDomainInput(rawDomain);
  if (!sanitized.ok) {
    return { success: false, error: sanitized.error };
  }

  const domain = normalizeDomainInput(sanitized.domain);
  if (!domain) {
    return { success: false, error: "Invalid domain format." };
  }

  const benchGate = await assertDomainBenchmarkGate(domain);
  if (!benchGate.ok) {
    return { success: false, error: benchGate.error };
  }

  const benchEntry = await import("@/lib/data/benchmarks").then((m) =>
    m.getDomainBenchmarkEntry(domain),
  );
  const needsPlaywright =
    benchEntry?.fetchMethod &&
    benchEntry.fetchMethod !== "http" &&
    benchEntry.fetchMethod !== "static";

  if (needsPlaywright) {
    const { markDomainPlaywrightRequired } = await import(
      "@/lib/contributor/fetch-tier"
    );
    markDomainPlaywrightRequired(domain);
  }

  if (!isSupabaseConfigured()) {
    const mock = getMockDomains();
    if (mock.includes(domain)) {
      return { success: false, error: `"${domain}" is already whitelisted.` };
    }
    mock.push(domain);
    mock.sort();
    return { success: true, entry: { domain, vertical, is_active: true } };
  }

  const supabase = createAdminClient();
  const upsertPayload: Record<string, unknown> = {
    domain,
    vertical: vertical ?? null,
    is_active: true,
  };
  if (needsPlaywright) {
    upsertPayload.legal_notes = "min_fetch_tier:ranger";
  }

  const { data, error } = await supabase
    .from("whitelist_domains")
    .upsert(upsertPayload, { onConflict: "domain" })
    .select("id, domain, vertical, is_active")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: `"${domain}" is already whitelisted.` };
    }
    return { success: false, error: error.message };
  }

  return { success: true, entry: data as WhitelistEntry };
}

export async function removeWhitelistDomain(
  domain: string,
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeDomainInput(domain);
  if (!normalized) {
    return { success: false, error: "Invalid domain." };
  }

  if (!isSupabaseConfigured()) {
    global.__syftinMockDomains = getMockDomains().filter((d) => d !== normalized);
    return { success: true };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("whitelist_domains")
    .update({ is_active: false })
    .eq("domain", normalized);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateWhitelistLegalGovernance(
  domain: string,
  input: LegalGovernanceInput,
): Promise<{ success: boolean; entry?: WhitelistEntry; error?: string }> {
  const normalized = normalizeDomainInput(domain);
  if (!normalized) {
    return { success: false, error: "Invalid domain." };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: "Legal governance requires Supabase." };
  }

  const payload: Record<string, string | null> = {};
  if (input.legal_basis !== undefined) payload.legal_basis = input.legal_basis || null;
  if (input.tos_url !== undefined) payload.tos_url = input.tos_url || null;
  if (input.legal_reviewed_by !== undefined) {
    payload.legal_reviewed_by = input.legal_reviewed_by || null;
  }
  if (input.legal_reviewed_at !== undefined) {
    payload.legal_reviewed_at = input.legal_reviewed_at || null;
  }
  if (input.legal_review_due_at !== undefined) {
    payload.legal_review_due_at = input.legal_review_due_at || null;
  }
  if (input.legal_notes !== undefined) payload.legal_notes = input.legal_notes || null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("whitelist_domains")
    .update(payload)
    .eq("domain", normalized)
    .select(
      "id, domain, vertical, is_active, legal_basis, tos_url, legal_reviewed_by, legal_reviewed_at, legal_review_due_at, legal_notes",
    )
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, entry: data as WhitelistEntry };
}

export async function clearDomainSuspension(
  domain: string,
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeDomainInput(domain);
  if (!normalized) return { success: false, error: "Invalid domain." };

  if (!isSupabaseConfigured()) return { success: true };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("whitelist_domains")
    .update({
      execution_suspended: false,
      suspension_reason: null,
    })
    .eq("domain", normalized);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
