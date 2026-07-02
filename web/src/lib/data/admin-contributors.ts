import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { sweepStaleContributorNodes } from "@/lib/data/contributors";

export type AdminContributorNode = {
  id: string;
  machine_label: string;
  hostname: string | null;
  compute_tier: string;
  detected_tier: string | null;
  status: string;
  connection_metered: boolean | null;
  tasks_completed: number;
  last_seen_at: string | null;
  region?: string | null;
};

export type AdminContributor = {
  id: string;
  display_name: string | null;
  email: string | null;
  upi_vpa: string | null;
  compute_tier: string;
  balance_paise: number;
  network_mode: string;
  is_active: boolean;
  nodes: AdminContributorNode[];
};

export type AdminContributorFleet = {
  contributors: AdminContributor[];
  stats: {
    contributors: number;
    nodesTotal: number;
    nodesOnline: number;
    pendingFetchTasks: number;
  };
};

export async function getAdminContributorFleet(): Promise<AdminContributorFleet> {
  if (!isSupabaseConfigured()) {
    return {
      contributors: [
        {
          id: "c0000000-0000-4000-8000-000000000001",
          display_name: "Demo contributor",
          email: "contributor@example.com",
          upi_vpa: "demo@upi",
          compute_tier: "scout",
          balance_paise: 12_450,
          network_mode: "wifi",
          is_active: true,
          nodes: [
            {
              id: "n0000000-0000-4000-8000-000000000001",
              machine_label: "MacBook Air",
              hostname: "demo-mac",
              compute_tier: "scout",
              detected_tier: "scout",
              status: "online",
              connection_metered: false,
              tasks_completed: 42,
              last_seen_at: new Date().toISOString(),
              region: "US",
            },
          ],
        },
      ],
      stats: {
        contributors: 1,
        nodesTotal: 1,
        nodesOnline: 1,
        pendingFetchTasks: 0,
      },
    };
  }

  await sweepStaleContributorNodes();

  const admin = createAdminClient();

  const [contributorsRes, nodesRes, fetchRes] = await Promise.all([
    admin
      .from("contributors")
      .select(
        "id, display_name, email, upi_vpa, compute_tier, balance_paise, network_mode, is_active",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("contributor_nodes")
      .select(
        "id, contributor_id, machine_label, hostname, compute_tier, detected_tier, status, connection_metered, tasks_completed, last_seen_at, region",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("fetch_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  if (contributorsRes.error) throw new Error(contributorsRes.error.message);
  if (nodesRes.error) throw new Error(nodesRes.error.message);

  const nodesByContributor = new Map<string, AdminContributorNode[]>();
  for (const node of nodesRes.data ?? []) {
    const list = nodesByContributor.get(node.contributor_id) ?? [];
    list.push({
      id: node.id,
      machine_label: node.machine_label,
      hostname: node.hostname,
      compute_tier: node.compute_tier,
      detected_tier: node.detected_tier,
      status: node.status,
      connection_metered: node.connection_metered,
      tasks_completed: node.tasks_completed,
      last_seen_at: node.last_seen_at,
      region: node.region,
    });
    nodesByContributor.set(node.contributor_id, list);
  }

  const contributors: AdminContributor[] = (contributorsRes.data ?? []).map(
    (row) => ({
      id: row.id,
      display_name: row.display_name,
      email: row.email,
      upi_vpa: row.upi_vpa,
      compute_tier: row.compute_tier,
      balance_paise: Number(row.balance_paise ?? 0),
      network_mode: row.network_mode ?? "wifi",
      is_active: Boolean(row.is_active),
      nodes: nodesByContributor.get(row.id) ?? [],
    }),
  );

  const allNodes = contributors.flatMap((c) => c.nodes);

  return {
    contributors,
    stats: {
      contributors: contributors.length,
      nodesTotal: allNodes.length,
      nodesOnline: allNodes.filter((n) => n.status === "online").length,
      pendingFetchTasks: fetchRes.count ?? 0,
    },
  };
}
