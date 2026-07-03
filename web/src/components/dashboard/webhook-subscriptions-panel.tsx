"use client";

import { useEffect, useState, useCallback } from "react";
import { Webhook, Plus, Trash2, Edit2, Loader2 } from "lucide-react";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-fallback";
import type { WebhookSubscription, WebhookSubscriptionEvent } from "@/lib/data/webhook-subscriptions";

const AVAILABLE_EVENTS: { value: WebhookSubscriptionEvent; label: string }[] = [
  { value: "job.completed", label: "Job completed" },
  { value: "job.failed", label: "Job failed" },
  { value: "batch.completed", label: "Batch completed" },
  { value: "batch.shard_failed", label: "Batch shard failed" },
  { value: "batch.cancelled", label: "Batch cancelled" },
  { value: "credit.low", label: "Low credit balance" },
];

export function WebhookSubscriptionsPanel() {
  const [subs, setSubs] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formEvents, setFormEvents] = useState<Set<WebhookSubscriptionEvent>>(new Set(["job.completed"]));
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/webhooks")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => setSubs(d.subscriptions))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setIsCreating(false);
    setEditingId(null);
    setFormUrl("");
    setFormSecret("");
    setFormDesc("");
    setFormEvents(new Set(["job.completed"]));
  }

  function startEdit(sub: WebhookSubscription) {
    setFormUrl(sub.url);
    setFormDesc(sub.description ?? "");
    setFormSecret("");
    setFormEvents(new Set(sub.events));
    setEditingId(sub.id);
    setIsCreating(true);
  }

  function toggleEvent(evt: WebhookSubscriptionEvent) {
    setFormEvents((prev) => {
      const next = new Set(prev);
      if (next.has(evt)) next.delete(evt);
      else next.add(evt);
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formUrl || formEvents.size === 0) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        url: formUrl,
        secret: formSecret || undefined,
        description: formDesc || undefined,
        events: Array.from(formEvents),
      };

      const res = await fetch(editingId ? `/api/webhooks/${editingId}` : "/api/webhooks", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }

      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this webhook?")) return;
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function toggleEnabled(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !current }),
      });
      if (res.ok) load();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Panel>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-honey-600 dark:text-honey-400" />
          <h2 className="text-sm font-semibold text-graphite-900 dark:text-ivory-50">Event Webhooks</h2>
        </div>
        {!isCreating && (
          <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add endpoint
          </Button>
        )}
      </div>
      <p className="mb-5 text-sm text-graphite-500 dark:text-graphite-300">
        Receive real-time HTTP POST payloads when specific events occur in your workspace.
      </p>

      {error && !isCreating && <InlineError message={error} onRetry={load} />}

      {isCreating ? (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-lg border border-graphite-700 bg-graphite-900/40 p-5"
        >
          <h3 className="text-sm font-medium text-ivory-50">
            {editingId ? "Edit endpoint" : "New endpoint"}
          </h3>

          <label className="block text-sm">
            <span className="font-medium text-graphite-700 dark:text-graphite-200">Payload URL</span>
            <input
              type="url"
              required
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://api.example.com/syftin-webhook"
              className="app-input mt-1.5"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-graphite-700 dark:text-graphite-200">
              Secret token <span className="font-normal text-graphite-400">(optional)</span>
            </span>
            <p className="mb-1.5 mt-0.5 text-xs text-graphite-500 dark:text-graphite-400">
              Used to sign payloads via X-Syftin-Signature (HMAC-SHA256).
            </p>
            <input
              type="password"
              value={formSecret}
              onChange={(e) => setFormSecret(e.target.value)}
              placeholder={editingId ? "Leave blank to keep current secret" : "e.g. whsec_..."}
              className="app-input font-mono"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-graphite-700 dark:text-graphite-200">
              Description <span className="font-normal text-graphite-400">(optional)</span>
            </span>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Production billing service"
              className="app-input mt-1.5"
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-graphite-700 dark:text-graphite-200">
              Events to send
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {AVAILABLE_EVENTS.map((evt) => (
                <label
                  key={evt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-graphite-700 bg-graphite-900/60 p-2 text-sm hover:border-honey-500/40"
                >
                  <input
                    type="checkbox"
                    checked={formEvents.has(evt.value)}
                    onChange={() => toggleEvent(evt.value)}
                    className="accent-honey-500"
                  />
                  <span className="text-graphite-300">{evt.label}</span>
                </label>
              ))}
            </div>
            {formEvents.size === 0 && (
              <p className="mt-1 text-xs text-red-400">Select at least one event.</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving || formEvents.size === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save endpoint"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      ) : loading ? (
        <div className="flex items-center justify-center p-8 text-graphite-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : subs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-graphite-700 p-8 text-center text-sm text-graphite-400">
          No webhooks configured.
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-col items-start justify-between gap-4 rounded-lg border border-graphite-700 bg-graphite-900/30 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${sub.enabled ? "bg-honey-500" : "bg-graphite-600"}`}
                  />
                  <span className="break-all font-mono text-sm text-ivory-50">{sub.url}</span>
                </div>
                {sub.description && (
                  <p className="mb-2 text-xs text-graphite-400">{sub.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {sub.events.map((e) => (
                    <span
                      key={e}
                      className="rounded bg-graphite-800 px-1.5 py-0.5 font-mono text-[10px] text-graphite-300"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => toggleEnabled(sub.id, sub.enabled)}>
                  {sub.enabled ? "Disable" : "Enable"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(sub)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(sub.id)}
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
