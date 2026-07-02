import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
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
    .select("id, domain, vertical, is_active")
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

export async function isWhitelistedUrl(url: string): Promise<boolean> {
  const domain = extractDomain(url);
  if (!domain) return false;
  const allowed = await getActiveDomainList();
  return domainMatchesWhitelist(domain, allowed);
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
  const { data, error } = await supabase
    .from("whitelist_domains")
    .upsert(
      { domain, vertical: vertical ?? null, is_active: true },
      { onConflict: "domain" },
    )
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
