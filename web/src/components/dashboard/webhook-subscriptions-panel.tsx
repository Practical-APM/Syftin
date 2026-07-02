"use client";

import { useEffect, useState, useCallback } from "react";
import { Webhook, Plus, Trash2, Edit2, Loader2, RefreshCw } from "lucide-react";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-fallback";
import type { WebhookSubscription, WebhookDeliveryLog, WebhookSubscriptionEvent } from "@/lib/data/webhook-subscriptions";

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
    setFormSecret(""); // never pre-fill secret
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-honey-600" />
          <h2 className="text-sm font-semibold text-graphite-900">Event Webhooks</h2>
        </div>
        {!isCreating && (
          <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add endpoint
          </Button>
        )}
      </div>
      <p className="text-sm text-graphite-500 mb-5">
        Receive real-time HTTP POST payloads when specific events occur in your workspace.
      </p>

      {error && !isCreating && <InlineError message={error} onRetry={load} />}

      {isCreating ? (
        <form onSubmit={handleSave} className="border border-graphite-200 rounded-lg p-5 bg-graphite-50 space-y-4">
          <h3 className="text-sm font-medium text-graphite-900">{editingId ? "Edit Endpoint" : "New Endpoint"}</h3>
          
          <label className="block text-sm">
            <span className="font-medium text-graphite-700">Payload URL</span>
            <input
              type="url" required
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://api.example.com/syftin-webhook"
              className="app-input mt-1.5"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-graphite-700">Secret token <span className="text-graphite-400 font-normal">(optional)</span></span>
            <p className="text-xs text-graphite-500 mb-1.5 mt-0.5">Used to sign payloads via X-Syftin-Signature (HMAC-SHA256).</p>
            <input
              type="password"
              value={formSecret}
              onChange={(e) => setFormSecret(e.target.value)}
              placeholder={editingId ? "Leave blank to keep current secret" : "e.g. whsec_..."}
              className="app-input font-mono"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-graphite-700">Description <span className="text-graphite-400 font-normal">(optional)</span></span>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Production billing service"
              className="app-input mt-1.5"
            />
          </label>

          <div>
            <span className="block text-sm font-medium text-graphite-700 mb-2">Events to send</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map(evt => (
                <label key={evt.value} className="flex items-center gap-2 p-2 border border-graphite-200 rounded-md bg-white text-sm cursor-pointer hover:border-honey-300">
                  <input
                    type="checkbox"
                    checked={formEvents.has(evt.value)}
                    onChange={() => toggleEvent(evt.value)}
                  />
                  <span className="text-graphite-700">{evt.label}</span>
                </label>
              ))}
            </div>
            {formEvents.size === 0 && <p className="text-xs text-red-500 mt-1">Select at least one event.</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving || formEvents.size === 0}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save endpoint"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      ) : loading ? (
        <div className="flex items-center justify-center p-8 text-graphite-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-graphite-200 rounded-lg text-graphite-500 text-sm">
          No webhooks configured.
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map(sub => (
            <div key={sub.id} className="border border-graphite-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${sub.enabled ? "bg-emerald-500" : "bg-graphite-300"}`} />
                  <span className="font-mono text-sm text-graphite-900 break-all">{sub.url}</span>
                </div>
                {sub.description && <p className="text-xs text-graphite-500 mb-2">{sub.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {sub.events.map(e => (
                    <span key={e} className="px-1.5 py-0.5 rounded text-[10px] bg-graphite-100 text-graphite-600 font-mono">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => toggleEnabled(sub.id, sub.enabled)}>
                  {sub.enabled ? "Disable" : "Enable"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(sub)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(sub.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
