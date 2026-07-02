import { NextResponse } from "next/server";
import { requireContributorAuth } from "@/lib/auth/guard";
import {
  listContributorEarnings,
  listContributorNodes,
} from "@/lib/data/contributors";
import { isSupabaseConfigured } from "@/lib/env";

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

  return NextResponse.json({
    contributor: auth.contributor,
    nodesOnline: nodes.filter((n) => n.status === "online").length,
    nodesTotal: nodes.length,
    recentEarningsPaise,
    hasOnlineNode: nodes.some((n) => n.status === "online"),
  });
}
