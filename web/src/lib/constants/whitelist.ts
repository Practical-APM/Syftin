/**
 * Default seed domains. Live whitelist is loaded from Supabase whitelist_domains.
 * These serve as fallback when Supabase is not configured (local demo mode).
 */
export const DEFAULT_WHITELIST_DOMAINS = [
  "amazon.in",
  "flipkart.com",
  "myntra.com",
  "blinkit.com",
  "zeptonow.com",
  "zomato.com",
  "swiggy.com",
  "mca.gov.in",
  "indiamart.com",
  "naukri.com",
] as const;

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeDomainInput(input: string): string | null {
  const trimmed = input.trim().toLowerCase().replace(/^www\./, "");
  if (!trimmed || trimmed.includes("/") || trimmed.includes(" ")) {
    return null;
  }
  // Basic hostname validation
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function domainMatchesWhitelist(
  domain: string,
  allowedDomains: string[],
): boolean {
  const normalized = domain.toLowerCase();
  return allowedDomains.some(
    (allowed) =>
      normalized === allowed ||
      normalized.endsWith(`.${allowed}`),
  );
}

export function getWhitelistRejectionMessage(url: string, workspaceScoped = false): string {
  const domain = extractDomain(url);
  if (!domain) return "Invalid URL format.";
  if (workspaceScoped) {
    return `"${domain}" is not enabled for your workspace. Contact Syftin to request access.`;
  }
  return `"${domain}" is not on your approved site list. Add it under Approved sites in your dashboard.`;
}
