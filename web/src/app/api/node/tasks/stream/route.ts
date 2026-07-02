import { createAdminClient } from "@/lib/supabase/admin";
import { claimNextFetchTask } from "@/lib/data/fetch-tasks";
import { upsertNodeSubscription, updateNodeOffline } from "@/lib/data/subscriptions";
import type { ComputeTier } from "@/lib/contributor/fetch-tier";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get("node_id");
  const contributorId = searchParams.get("contributor_id");
  const tier = searchParams.get("tier");

  if (!nodeId || !contributorId || !tier) {
    return new Response("Missing parameters", { status: 400 });
  }

  // Update subscription to online
  await upsertNodeSubscription(nodeId, contributorId, tier as ComputeTier);

  let isConnected = true;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      try {
        controller.enqueue(new TextEncoder().encode(`event: connected\ndata: {"status": "ok"}\n\n`));
      } catch (e) {
        isConnected = false;
      }

      // Loop to push task ready events
      while (isConnected) {
        try {
          const admin = createAdminClient();
          const { count, error } = await admin
            .from("fetch_tasks")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending");

          if (!error && count && count > 0) {
            controller.enqueue(new TextEncoder().encode(`event: task_ready\ndata: {"pending": ${count}}\n\n`));
          } else {
            // Heartbeat
            controller.enqueue(new TextEncoder().encode(`event: ping\ndata: {"time": "${Date.now()}"}\n\n`));
          }
        } catch (e) {
          console.error("SSE stream error:", e);
        }
        
        // Wait 5 seconds before next check
        if (isConnected) {
            await new Promise(r => setTimeout(r, 5000));
        }
      }
    },
    cancel() {
      isConnected = false;
      updateNodeOffline(nodeId).catch(console.error);
    }
  });

  // Handle client disconnect by checking if write fails, but also the Request signal
  request.signal.addEventListener("abort", () => {
    isConnected = false;
    updateNodeOffline(nodeId).catch(console.error);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
