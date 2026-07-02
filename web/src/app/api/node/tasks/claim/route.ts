import { NextResponse } from "next/server";
import { claimNextFetchTask } from "@/lib/data/fetch-tasks";
import { touchNodeHeartbeat } from "@/lib/data/contributors";
import { isSupabaseConfigured } from "@/lib/env";
import { requireNodeAuth } from "@/lib/security/node-auth";

export async function GET(request: Request) {
  const auth = await requireNodeAuth(request, "nodeClaim");
  if (!auth.ok) return auth.response;

  const hostname = request.headers.get("x-node-hostname") ?? undefined;
  await touchNodeHeartbeat(auth.nodeId, hostname);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ task: null, demo: true });
  }

  const task = await claimNextFetchTask(auth.nodeId, auth.contributorId);
  return NextResponse.json({ task });
}
