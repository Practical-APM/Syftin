import { getPublicSiteUrl } from "@/lib/env";
import type { SweptContributorNode } from "@/lib/data/contributors";
import {
  recordAlertSent,
  wasAlertSentRecently,
} from "@/lib/security/alert-cooldown";
import type { HealthSnapshot } from "@/lib/security/health";

export type OpsAlert = {
  key: string;
  severity: "warning" | "critical";
  title: string;
  detail: string;
};

function formatHeartbeatAge(lastSeen: string | null): string {
  if (!lastSeen) return "never";
  const sec = Math.round((Date.now() - new Date(lastSeen).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  return `${Math.round(sec / 3600)}h ago`;
}

export function buildHealthAlerts(snapshot: HealthSnapshot): OpsAlert[] {
  const alerts: OpsAlert[] = [];

  if (!snapshot.supabase) {
    alerts.push({
      key: "supabase-down",
      severity: "critical",
      title: "Supabase unreachable",
      detail: "Web app cannot reach Supabase. Check keys and project status.",
    });
  }

  if (!snapshot.worker) {
    const workerRef = snapshot.workerId ? ` (${snapshot.workerId})` : "";
    alerts.push({
      key: "worker-stale",
      severity: "critical",
      title: "Hub worker heartbeat missing",
      detail: snapshot.workerLastSeen
        ? `Last heartbeat ${formatHeartbeatAge(snapshot.workerLastSeen)}${workerRef}. Restart hub worker on VM: go run ./cmd/worker`
        : `No heartbeat recorded${workerRef}. Start hub worker: go run ./cmd/worker`,
    });
  }

  if (!snapshot.ollama) {
    alerts.push({
      key: "ollama-down",
      severity: "warning",
      title: "Ollama not responding",
      detail: "Health probe to OLLAMA_BASE_URL failed. Jobs will not extract.",
    });
  }

  if (snapshot.pendingFetchTasks > 10 && snapshot.contributorNodesOnline === 0) {
    alerts.push({
      key: "fetch-backlog-no-nodes",
      severity: "warning",
      title: "Fetch backlog with no online nodes",
      detail: `${snapshot.pendingFetchTasks} pending fetch tasks and 0 contributor nodes online.`,
    });
  }

  return alerts;
}

export function buildContributorOfflineAlerts(
  nodes: SweptContributorNode[],
): OpsAlert[] {
  if (nodes.length === 0) return [];

  const labels = nodes
    .slice(0, 5)
    .map((node) => {
      const host = node.hostname ? ` · ${node.hostname}` : "";
      return `${node.machine_label}${host}`;
    })
    .join(", ");
  const suffix =
    nodes.length > 5 ? ` (+${nodes.length - 5} more)` : "";

  return [
    {
      key: "contributor-nodes-offline",
      severity: "warning",
      title: `${nodes.length} contributor node(s) missed heartbeat`,
      detail: `Marked offline after 90s without poll: ${labels}${suffix}.`,
    },
  ];
}

function webhookUrl(): string | null {
  const slack = process.env.SLACK_OPS_WEBHOOK_URL?.trim();
  if (slack) return slack;
  return process.env.OPS_WEBHOOK_URL?.trim() ?? null;
}

export async function sendOpsAlerts(
  alerts: OpsAlert[],
): Promise<{ sent: number; skipped: number; logged: number }> {
  const url = webhookUrl();
  let sent = 0;
  let skipped = 0;
  let logged = 0;

  const site = getPublicSiteUrl();

  for (const alert of alerts) {
    if (await wasAlertSentRecently(alert.key)) {
      skipped++;
      continue;
    }

    const emoji = alert.severity === "critical" ? ":rotating_light:" : ":warning:";
    const text = [
      `${emoji} *Syftin ops — ${alert.title}*`,
      alert.detail,
      `Site: ${site}`,
      `Severity: ${alert.severity}`,
    ].join("\n");

    if (!url) {
      console.warn(`[syftin ops] ${alert.severity} — ${alert.title}: ${alert.detail}`);
      await recordAlertSent(alert.key);
      logged++;
      continue;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.error(`[syftin ops] webhook failed (${res.status}) for ${alert.key}`);
        continue;
      }
      await recordAlertSent(alert.key);
      sent++;
    } catch (err) {
      console.error(
        `[syftin ops] webhook error for ${alert.key}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { sent, skipped, logged };
}
