import { createAdminClient } from "@/lib/supabase/admin";
import { upsertNodeSubscription, updateNodeOffline } from "@/lib/data/subscriptions";
import type { ComputeTier } from "@/lib/contributor/fetch-tier";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get("node_id");
  const contributorId = searchParams.get("contributor_id");
  const tier = searchParams.get("tier");

  if (!nodeId || !contributorId || !tier) {
    return new Response("Missing parameters", { status: 400 });
  }

  await upsertNodeSubscription(nodeId, contributorId, tier as ComputeTier);

  let isConnected = true;
  const signaledTasks = new Set<string>();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: Record<string, unknown>) => {
        if (!isConnected) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          isConnected = false;
        }
      };

      send("connected", { status: "ok" });

      const admin = createAdminClient();
      const channel = admin
        .channel(`node-dispatch-${nodeId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "fetch_tasks" },
          (payload) => {
            const row = payload.new as {
              id?: string;
              domain?: string;
              status?: string;
              priority?: number;
            } | null;
            if (row?.status === "pending" && row.id) {
              signaledTasks.add(row.id);
              send("task_ready", {
                task_id: row.id,
                domain: row.domain,
                priority: row.priority ?? 0,
              });
            }
          },
        )
        .subscribe();

      while (isConnected) {
        try {
          const { data: tasks, error } = await admin
            .from("fetch_tasks")
            .select("id, domain, priority")
            .eq("status", "pending")
            .order("priority", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(5);

          if (!error && tasks?.length) {
            for (const task of tasks) {
              if (!signaledTasks.has(task.id as string)) {
                signaledTasks.add(task.id as string);
                send("task_ready", {
                  task_id: task.id,
                  domain: task.domain,
                  priority: task.priority ?? 0,
                });
              }
            }
          } else {
            send("ping", { time: Date.now() });
          }
        } catch (e) {
          console.error("SSE stream error:", e);
        }

        if (isConnected) {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }

      await admin.removeChannel(channel);
    },
    cancel() {
      isConnected = false;
      updateNodeOffline(nodeId).catch(console.error);
    },
  });

  request.signal.addEventListener("abort", () => {
    isConnected = false;
    updateNodeOffline(nodeId).catch(console.error);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
