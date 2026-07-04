/** CGNAT / per-public-IP fleet limits (pilot hardening). */

export function maxActiveTasksPerPublicIp(): number {
  const raw = process.env.MAX_ACTIVE_TASKS_PER_PUBLIC_IP?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  return 2;
}

export function maxClaimsPerIpPerHour(): number {
  const raw = process.env.MAX_CLAIMS_PER_IP_PER_HOUR?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  return 30;
}

export function ipCooldownMs(): number {
  const raw = process.env.IP_COOLDOWN_MS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 60 * 60 * 1000;
}

export type IpFleetStats = {
  ip: string;
  nodeCount: number;
  activeClaims: number;
  claimsLastHour: number;
};

export async function countActiveClaimsForIp(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  ip: string,
): Promise<number> {
  const { data: nodes } = await admin
    .from("contributor_nodes")
    .select("id")
    .eq("last_seen_ip", ip);

  const nodeIds = (nodes ?? []).map((n) => n.id as string);
  if (nodeIds.length === 0) return 0;

  const { count } = await admin
    .from("fetch_tasks")
    .select("id", { count: "exact", head: true })
    .in("claimed_by_node_id", nodeIds)
    .eq("status", "claimed");

  return count ?? 0;
}

export async function countClaimsForIpInWindow(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  ip: string,
  sinceIso: string,
): Promise<number> {
  const { data: nodes } = await admin
    .from("contributor_nodes")
    .select("id")
    .eq("last_seen_ip", ip);

  const nodeIds = (nodes ?? []).map((n) => n.id as string);
  if (nodeIds.length === 0) return 0;

  const { count } = await admin
    .from("fetch_tasks")
    .select("id", { count: "exact", head: true })
    .in("claimed_by_node_id", nodeIds)
    .gte("claimed_at", sinceIso)
    .not("claimed_at", "is", null);

  return count ?? 0;
}

export async function isIpAtCapacity(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  ip: string,
): Promise<{ blocked: boolean; reason?: string }> {
  const active = await countActiveClaimsForIp(admin, ip);
  const maxActive = maxActiveTasksPerPublicIp();
  if (active >= maxActive) {
    return {
      blocked: true,
      reason: `Public IP ${ip} has ${active} active tasks (limit ${maxActive}). Waiting for CGNAT slot.`,
    };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const hourly = await countClaimsForIpInWindow(admin, ip, hourAgo);
  const maxHourly = maxClaimsPerIpPerHour();
  if (hourly >= maxHourly) {
    return {
      blocked: true,
      reason: `Public IP ${ip} reached ${maxHourly} claims/hour. Cooling down.`,
    };
  }

  return { blocked: false };
}

export async function setIpCooldownForNode(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  nodeId: string,
  clientIp?: string | null,
): Promise<void> {
  if (!clientIp) return;
  const until = new Date(Date.now() + ipCooldownMs()).toISOString();
  await admin
    .from("contributor_nodes")
    .update({ ip_cooldown_until: until, updated_at: new Date().toISOString() })
    .eq("id", nodeId);
}

export async function getIpConcentrationWarnings(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
): Promise<{ ip: string; nodeCount: number }[]> {
  const { data: nodes } = await admin
    .from("contributor_nodes")
    .select("last_seen_ip")
    .not("last_seen_ip", "is", null);

  const counts = new Map<string, number>();
  for (const row of nodes ?? []) {
    const ip = row.last_seen_ip as string;
    if (!ip) continue;
    counts.set(ip, (counts.get(ip) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, n]) => n > 3)
    .map(([ip, nodeCount]) => ({ ip, nodeCount }))
    .sort((a, b) => b.nodeCount - a.nodeCount);
}
