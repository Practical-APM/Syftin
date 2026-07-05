import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_RESOURCE_SETTINGS,
  normalizeResourceSettings,
  type ContributorResourceSettings,
  type NodeResourceTelemetry,
} from "@/lib/contributor/resource-settings";
import { isSupabaseConfigured } from "@/lib/env";
import type { SessionContributor } from "@/lib/auth/contributor";

export type NodeCapabilities = {
  os?: string;
  arch?: string;
  ram_gb?: number;
  cpu_cores?: number;
  playwright_ready?: boolean;
  has_gpu?: boolean;
  gpu_vram_gb?: number;
  gpu_inference_ready?: boolean;
  recommended_tier?: string;
  node_type?: string;
  fetch_mode?: string;
  connection_metered?: boolean;
};

export type ContributorNode = {
  id: string;
  machine_label: string;
  hostname: string | null;
  compute_tier: string;
  detected_tier: string | null;
  node_type: string | null;
  fetch_mode: string | null;
  playwright_ready: boolean | null;
  connection_metered: boolean | null;
  capabilities: NodeCapabilities | null;
  status: string;
  last_seen_at: string | null;
  tasks_completed: number;
  created_at: string;
  resource_telemetry: NodeResourceTelemetry | null;
  ip_cooldown_until?: string | null;
};

export type ContributorEarning = {
  id: string;
  amount_paise: number;
  created_at: string;
  fetch_task_id: string | null;
  reward_tier?: string | null;
  edge_inference?: boolean;
};

declare global {
  var __syftinMockNodes: ContributorNode[] | undefined;
  var __syftinMockEarnings: ContributorEarning[] | undefined;
  var __syftinMockNodeTokens:
    | Map<string, { nodeId: string; contributorId: string }>
    | undefined;
}

function mockTokenRegistry(): Map<
  string,
  { nodeId: string; contributorId: string }
> {
  if (!global.__syftinMockNodeTokens) {
    global.__syftinMockNodeTokens = new Map();
  }
  return global.__syftinMockNodeTokens;
}

function mockNodes(): ContributorNode[] {
  if (!global.__syftinMockNodes) {
    global.__syftinMockNodes = [
      {
        id: "n0000000-0000-4000-8000-000000000001",
        machine_label: "MacBook Air",
        hostname: "demo-mac",
        compute_tier: "scout",
        detected_tier: "scout",
        node_type: "edge_fetcher",
        fetch_mode: "http",
        playwright_ready: false,
        connection_metered: false,
        capabilities: {
          os: "darwin",
          arch: "arm64",
          ram_gb: 8,
          cpu_cores: 8,
          recommended_tier: "scout",
          node_type: "edge_fetcher",
          fetch_mode: "http",
        },
        status: "online",
        last_seen_at: new Date().toISOString(),
        tasks_completed: 42,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        resource_telemetry: {
          profile: "balanced",
          temp_c: 44,
          temp_available: true,
          work_allowed: true,
          task_delay_sec: 2,
          ram_used_mb: 128,
          ram_limit_mb: 4096,
          on_ac_power: true,
          connection_metered: false,
          reported_at: new Date().toISOString(),
        },
      },
    ];
  }
  return global.__syftinMockNodes;
}

function mockEarnings(): ContributorEarning[] {
  if (!global.__syftinMockEarnings) {
    global.__syftinMockEarnings = [
      {
        id: "e1",
        amount_paise: 50,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        fetch_task_id: null,
      },
      {
        id: "e2",
        amount_paise: 50,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        fetch_task_id: null,
      },
    ];
  }
  return global.__syftinMockEarnings;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const NODE_OFFLINE_MS = 90_000;

export type SweptContributorNode = {
  id: string;
  machine_label: string;
  hostname: string | null;
  last_seen_at: string | null;
};

export type StaleNodeSweepResult = {
  offlineCount: number;
  nodes: SweptContributorNode[];
};

/** Mark edge nodes offline when heartbeat stops (called before fleet/list/claim). */
export async function sweepStaleContributorNodes(): Promise<StaleNodeSweepResult> {
  if (!isSupabaseConfigured()) {
    const cutoff = Date.now() - NODE_OFFLINE_MS;
    const nodes: SweptContributorNode[] = [];
    for (const node of mockNodes()) {
      if (
        node.status === "online" &&
        node.last_seen_at &&
        new Date(node.last_seen_at).getTime() < cutoff
      ) {
        node.status = "offline";
        nodes.push({
          id: node.id,
          machine_label: node.machine_label,
          hostname: node.hostname,
          last_seen_at: node.last_seen_at,
        });
      }
    }
    return { offlineCount: nodes.length, nodes };
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - NODE_OFFLINE_MS).toISOString();
  const { data, error } = await admin
    .from("contributor_nodes")
    .update({
      status: "offline",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "online")
    .lt("last_seen_at", cutoff)
    .select("id, machine_label, hostname, last_seen_at");

  if (error) throw new Error(error.message);
  const nodes = (data ?? []) as SweptContributorNode[];
  return { offlineCount: nodes.length, nodes };
}

export async function listContributorNodes(
  contributor: SessionContributor,
  useSupabase: boolean,
): Promise<ContributorNode[]> {
  if (!useSupabase) {
    await sweepStaleContributorNodes();
    return mockNodes();
  }

  await sweepStaleContributorNodes();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contributor_nodes")
    .select(
      "id, machine_label, hostname, compute_tier, detected_tier, node_type, fetch_mode, playwright_ready, connection_metered, capabilities, status, last_seen_at, tasks_completed, created_at, resource_telemetry, ip_cooldown_until",
    )
    .eq("contributor_id", contributor.contributorId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContributorNode[];
}

export async function createContributorNode(
  contributor: SessionContributor,
  input: { machineLabel: string; computeTier?: string },
  useSupabase: boolean,
): Promise<{ node: ContributorNode; token: string }> {
  const token = `sftn_${randomBytes(24).toString("hex")}`;

  if (!useSupabase) {
    const node: ContributorNode = {
      id: `n_${Date.now()}`,
      machine_label: input.machineLabel,
      hostname: null,
      compute_tier: input.computeTier ?? contributor.computeTier,
      detected_tier: null,
      node_type: "edge_fetcher",
      fetch_mode: null,
      playwright_ready: null,
      connection_metered: null,
      capabilities: null,
      status: "offline",
      last_seen_at: null,
      tasks_completed: 0,
      created_at: new Date().toISOString(),
      resource_telemetry: null,
    };
    mockNodes().unshift(node);
    mockTokenRegistry().set(hashToken(token), {
      nodeId: node.id,
      contributorId: contributor.contributorId,
    });
    return { node, token };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contributor_nodes")
    .insert({
      contributor_id: contributor.contributorId,
      machine_label: input.machineLabel,
      compute_tier: input.computeTier ?? contributor.computeTier,
      token_hash: hashToken(token),
    })
    .select(
      "id, machine_label, hostname, compute_tier, detected_tier, node_type, fetch_mode, playwright_ready, connection_metered, capabilities, status, last_seen_at, tasks_completed, created_at, resource_telemetry",
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not register node");
  return { node: data as ContributorNode, token };
}

export async function listContributorEarnings(
  contributor: SessionContributor,
  useSupabase: boolean,
): Promise<ContributorEarning[]> {
  if (!useSupabase) return mockEarnings();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contributor_earnings")
    .select("id, amount_paise, created_at, fetch_task_id, reward_tier, edge_inference")
    .eq("contributor_id", contributor.contributorId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    amount_paise: Number(row.amount_paise),
  })) as ContributorEarning[];
}

export async function verifyNodeToken(
  token: string,
): Promise<{ nodeId: string; contributorId: string } | null> {
  if (!isSupabaseConfigured()) {
    return mockTokenRegistry().get(hashToken(token)) ?? null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contributor_nodes")
    .select("id, contributor_id, token_hash")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error || !data) return null;
  return { nodeId: data.id, contributorId: data.contributor_id };
}

export async function touchNodeHeartbeat(
  nodeId: string,
  hostname?: string,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const node = mockNodes().find((n) => n.id === nodeId);
    if (node) {
      node.status = "online";
      node.last_seen_at = new Date().toISOString();
      if (hostname) node.hostname = hostname;
    }
    return;
  }

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status: "online",
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (hostname) patch.hostname = hostname;

  await admin.from("contributor_nodes").update(patch).eq("id", nodeId);
}

export async function getContributorNetworkPaused(
  contributorId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("contributors")
    .select("metered_pause, network_mode")
    .eq("id", contributorId)
    .single();

  if (!data) return false;
  return data.network_mode === "paused" || data.network_mode === "metered";
}

const VALID_TIERS = new Set(["scout", "ranger", "titan"]);

function normalizeTier(raw?: string): string | null {
  if (!raw || !VALID_TIERS.has(raw)) return null;
  return raw;
}

export async function getContributorResourceSettings(
  contributorId: string,
): Promise<ContributorResourceSettings> {
  if (!isSupabaseConfigured()) {
    return { ...DEFAULT_RESOURCE_SETTINGS };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contributors")
    .select("resource_settings")
    .eq("id", contributorId)
    .single();

  if (error || !data) {
    return { ...DEFAULT_RESOURCE_SETTINGS };
  }

  return normalizeResourceSettings(data.resource_settings);
}

export async function updateContributorResourceSettings(
  contributorId: string,
  settings: ContributorResourceSettings,
): Promise<ContributorResourceSettings> {
  const normalized = normalizeResourceSettings(settings);

  if (!isSupabaseConfigured()) {
    return normalized;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("contributors")
    .update({
      resource_settings: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contributorId);

  if (error) throw new Error(error.message);
  return normalized;
}

export async function touchNodeTelemetry(
  nodeId: string,
  telemetry: NodeResourceTelemetry,
  hostname?: string,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const node = mockNodes().find((n) => n.id === nodeId);
    if (node) {
      node.resource_telemetry = {
        ...telemetry,
        reported_at: telemetry.reported_at ?? new Date().toISOString(),
      };
      node.last_seen_at = new Date().toISOString();
      node.status = "online";
      if (hostname) node.hostname = hostname;
    }
    return;
  }

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    resource_telemetry: telemetry,
    last_seen_at: new Date().toISOString(),
    status: "online",
    updated_at: new Date().toISOString(),
  };
  if (hostname) patch.hostname = hostname;
  await admin.from("contributor_nodes").update(patch).eq("id", nodeId);
}

// ─── Geo-Routing ──────────────────────────────────────────────────────────────

/**
 * Resolves a public IP address to an ISO 3166-1 alpha-2 country code.
 * Uses the free ip-api.com endpoint (no key needed, 45 req/min).
 * Falls back gracefully if the request fails or returns an unknown country.
 */
export async function resolveNodeRegion(
  ip: string,
): Promise<string | null> {
  // Skip private/loopback IPs
  if (
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip === "::1" ||
    ip === "localhost"
  ) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json() as { status?: string; countryCode?: string };
    if (data.status === "success" && data.countryCode) {
      return data.countryCode.toUpperCase();
    }
  } catch {
    // Swallow — non-critical
  }
  return null;
}

export async function registerContributorNode(
  nodeId: string,
  contributorId: string,
  input: {
    hostname?: string;
    capabilities: NodeCapabilities;
    connectionMetered?: boolean;
    resourceTelemetry?: NodeResourceTelemetry;
    /** Caller-provided public IP for region resolution */
    publicIp?: string;
  },
): Promise<{
  detectedTier: string | null;
  nodeType: string;
  fetchMode: string | null;
  connectionMetered: boolean;
  resourceSettings: ContributorResourceSettings;
}> {
  const caps = input.capabilities ?? {};
  const detectedTier = normalizeTier(caps.recommended_tier);
  const nodeType = caps.node_type?.trim() || "edge_fetcher";
  const fetchMode = caps.fetch_mode?.trim() || null;
  const connectionMetered = Boolean(
    input.connectionMetered ?? caps.connection_metered,
  );

  // Resolve region from caller's public IP (non-blocking, best-effort)
  const resolvedRegion = input.publicIp
    ? await resolveNodeRegion(input.publicIp)
    : null;

  const patch: Record<string, unknown> = {
    status: "online",
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    capabilities: { ...caps, connection_metered: connectionMetered },
    node_type: nodeType,
    fetch_mode: fetchMode,
    playwright_ready: Boolean(caps.playwright_ready),
    connection_metered: connectionMetered,
  };

  if (input.hostname) patch.hostname = input.hostname;
  if (detectedTier) {
    patch.detected_tier = detectedTier;
    patch.compute_tier = detectedTier;
  }
  if (input.resourceTelemetry) {
    patch.resource_telemetry = input.resourceTelemetry;
  }
  if (resolvedRegion) {
    patch.region = resolvedRegion;
    patch.region_resolved_at = new Date().toISOString();
  }

  if (!isSupabaseConfigured()) {
    const node = mockNodes().find((n) => n.id === nodeId);
    if (node) {
      Object.assign(node, {
        status: "online",
        last_seen_at: new Date().toISOString(),
        capabilities: patch.capabilities as NodeCapabilities,
        node_type: nodeType,
        fetch_mode: fetchMode,
        playwright_ready: Boolean(caps.playwright_ready),
        connection_metered: connectionMetered,
        hostname: input.hostname ?? node.hostname,
        detected_tier: detectedTier ?? node.detected_tier,
        compute_tier: detectedTier ?? node.compute_tier,
      });
    }
    return {
      detectedTier,
      nodeType,
      fetchMode,
      connectionMetered,
      resourceSettings: { ...DEFAULT_RESOURCE_SETTINGS },
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("contributor_nodes")
    .update(patch)
    .eq("id", nodeId);

  if (error) throw new Error(error.message);

  const { data: contributor } = await admin
    .from("contributors")
    .select("metered_pause, network_mode, resource_settings")
    .eq("id", contributorId)
    .single();

  if (contributor?.metered_pause) {
    await admin
      .from("contributors")
      .update({
        network_mode: connectionMetered ? "metered" : "wifi",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contributorId);
  }

  const resourceSettings = normalizeResourceSettings(
    contributor?.resource_settings,
    caps.ram_gb ?? 8,
    caps.cpu_cores ?? 4,
    caps.gpu_vram_gb ?? 0,
  );

  return {
    detectedTier,
    nodeType,
    fetchMode,
    connectionMetered,
    resourceSettings,
  };
}
