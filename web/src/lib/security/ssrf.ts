/**
 * SSRF / private-network URL guards for job submission.
 */

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number.parseInt(p, 10));
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
  return nums;
}

function isPrivateOrReservedIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function isBlockedHost(hostname: string): string | null {
  const host = hostname.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (!host) {
    return "URL hostname is required.";
  }

  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return "Internal or local hostnames are not allowed.";
  }

  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    return "Link-local or private IPv6 addresses are not allowed.";
  }

  const ipv4 = parseIpv4(host);
  if (ipv4) {
    if (isPrivateOrReservedIpv4(ipv4)) {
      return "Private, loopback, or metadata IP addresses are not allowed.";
    }
    return null;
  }

  // Reject bare numeric-looking hosts (IPv4 without validation above)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return "Private, loopback, or metadata IP addresses are not allowed.";
  }

  return null;
}
