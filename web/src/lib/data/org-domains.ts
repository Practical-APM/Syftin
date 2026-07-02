import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import {
  domainMatchesWhitelist,
  extractDomain,
  normalizeDomainInput,
} from "@/lib/constants/whitelist";
import { getActiveDomainList, getWhitelistDomains } from "@/lib/data/domains";

declare global {
  var __syftinMockOrgDomains: Record<string, string[]> | undefined;
}

function mockOrgDomains(orgId: string): string[] | undefined {
  return global.__syftinMockOrgDomains?.[orgId];
}

/** Domains explicitly enabled for an org. Empty = inherit full global whitelist. */
export async function getOrgDomainList(orgId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return mockOrgDomains(orgId) ?? [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_domains")
    .select("domain")
    .eq("organization_id", orgId)
    .order("domain");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.domain as string);
}

/** Effective domains for job creation: org subset or global list when unset. */
export async function getEffectiveDomainsForOrg(orgId: string): Promise<string[]> {
  const orgDomains = await getOrgDomainList(orgId);
  if (orgDomains.length > 0) return orgDomains;
  return getActiveDomainList();
}

export async function isUrlAllowedForOrg(
  url: string,
  orgId: string,
): Promise<boolean> {
  const domain = extractDomain(url);
  if (!domain) return false;

  const globalDomains = await getActiveDomainList();
  if (!domainMatchesWhitelist(domain, globalDomains)) return false;

  const orgDomains = await getOrgDomainList(orgId);
  if (orgDomains.length === 0) return true;
  return domainMatchesWhitelist(domain, orgDomains);
}

export type SetOrgDomainsResult =
  | { success: true; domains: string[] }
  | { success: false; error: string };

export async function setOrgDomains(
  orgId: string,
  domains: string[],
): Promise<SetOrgDomainsResult> {
  const globalDomains = await getActiveDomainList();
  const normalized = [
    ...new Set(
      domains
        .map((d) => normalizeDomainInput(d))
        .filter((d): d is string => Boolean(d)),
    ),
  ].sort();

  for (const domain of normalized) {
    if (!globalDomains.includes(domain)) {
      return {
        success: false,
        error: `"${domain}" is not on the global platform whitelist.`,
      };
    }
  }

  if (!isSupabaseConfigured()) {
    if (!global.__syftinMockOrgDomains) {
      global.__syftinMockOrgDomains = {};
    }
    if (normalized.length === 0) {
      delete global.__syftinMockOrgDomains[orgId];
    } else {
      global.__syftinMockOrgDomains[orgId] = normalized;
    }
    return { success: true, domains: normalized };
  }

  const admin = createAdminClient();

  const { error: deleteError } = await admin
    .from("organization_domains")
    .delete()
    .eq("organization_id", orgId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  if (normalized.length === 0) {
    return { success: true, domains: [] };
  }

  const { error: insertError } = await admin.from("organization_domains").insert(
    normalized.map((domain) => ({
      organization_id: orgId,
      domain,
    })),
  );

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, domains: normalized };
}

export async function getOrgDomainEditorState(orgId: string) {
  const [globalEntries, orgDomains] = await Promise.all([
    getWhitelistDomains(),
    getOrgDomainList(orgId),
  ]);

  return {
    globalDomains: globalEntries.filter((e) => e.is_active),
    orgDomains,
    usesSubset: orgDomains.length > 0,
  };
}
