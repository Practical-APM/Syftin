import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqualString } from "@/lib/security/timing-safe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorizeInternal(request: Request): boolean {
  const secret = process.env.INTERNAL_DELIVERY_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return safeEqualString(auth.slice(7).trim(), secret);
  }
  return false;
}

export async function GET(request: Request) {
  if (!authorizeInternal(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let isConnected = true;
  let lastQueuedCount = 0;

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
        .channel("hub-worker-jobs")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "jobs" },
          (payload) => {
            const row = payload.new as { status?: string; priority?: number } | null;
            if (row?.status === "queued") {
              send("job_ready", { priority: row.priority ?? 0 });
            }
          },
        )
        .subscribe();

      while (isConnected) {
        try {
          const { count, error } = await admin
            .from("jobs")
            .select("*", { count: "exact", head: true })
            .eq("status", "queued");

          if (!error && count !== null && count > 0 && count !== lastQueuedCount) {
            lastQueuedCount = count;
            send("job_ready", { queued: count });
          } else if (!error && count === 0) {
            lastQueuedCount = 0;
            send("ping", { time: Date.now() });
          }
        } catch (e) {
          console.error("hub worker stream error:", e);
        }

        if (isConnected) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      await admin.removeChannel(channel);
    },
    cancel() {
      isConnected = false;
    },
  });

  request.signal.addEventListener("abort", () => {
    isConnected = false;
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
