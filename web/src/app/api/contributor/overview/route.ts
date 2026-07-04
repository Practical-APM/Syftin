import { NextResponse } from "next/server";
import { requireContributorAuth } from "@/lib/auth/guard";
import {
  listContributorEarnings,
  listContributorNodes,
} from "@/lib/data/contributors";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const IDLE_MINUTES = 30;

async function minutesSinceLastTask(contributorId: string): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createAdminClient();
  const { data: nodes } = await admin
    .from("contributor_nodes")
    .select("id")
    .eq("contributor_id", contributorId);

  const nodeIds = (nodes ?? []).map((n) => n.id);
  if (nodeIds.length === 0) return null;

  const { data: tasks } = await admin
    .from("fetch_tasks")
    .select("claimed_at")
    .in("claimed_by_node_id", nodeIds)
    .not("claimed_at", "is", null)
    .order("claimed_at", { ascending: false })
    .limit(1);

  const last = tasks?.[0]?.claimed_at as string | undefined;
  if (!last) return null;
  return Math.floor((Date.now() - new Date(last).getTime()) / 60_000);
}

export async function GET() {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  const useSupabase = isSupabaseConfigured();
  const nodes = await listContributorNodes(auth.contributor, useSupabase);
  const earnings = await listContributorEarnings(auth.contributor, useSupabase);
  const dayAgo = Date.now() - 86400000;
  const recentEarningsPaise = earnings
    .filter((e) => new Date(e.created_at).getTime() > dayAgo)
    .reduce((s, e) => s + e.amount_paise, 0);

  const hasOnlineNode = nodes.some((n) => n.status === "online");
  const idleMinutes = hasOnlineNode
    ? await minutesSinceLastTask(auth.contributor.contributorId)
    : null;
  const showFleetSaturatedHint =
    hasOnlineNode &&
    idleMinutes != null &&
    idleMinutes >= IDLE_MINUTES;

  return NextResponse.json({
    contributor: auth.contributor,
    nodesOnline: nodes.filter((n) => n.status === "online").length,
    nodesTotal: nodes.length,
    recentEarningsPaise,
    hasOnlineNode,
    showFleetSaturatedHint,
    idleMinutes,
  });
}
