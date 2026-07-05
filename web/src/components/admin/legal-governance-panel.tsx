"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WhitelistEntry } from "@/lib/data/domains";

export function LegalGovernancePanel({
  domains,
}: {
  domains: WhitelistEntry[];
}) {
  const [selected, setSelected] = useState(domains[0]?.domain ?? "");
  const [legalBasis, setLegalBasis] = useState("");
  const [tosUrl, setTosUrl] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewDue, setReviewDue] = useState("");
  const [notes, setNotes] = useState("");
  const [stealthJson, setStealthJson] = useState("");
  const [poisonMarkers, setPoisonMarkers] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const entry = domains.find((d) => d.domain === selected);
  const needsReview = domains.filter((d) => !d.legal_reviewed_at).length;
  const suspended = domains.filter((d) => d.execution_suspended);

  useEffect(() => {
    if (selected) loadEntry(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when domain list arrives
  }, [domains.length]);

  function loadEntry(domain: string) {
    setSelected(domain);
    const d = domains.find((x) => x.domain === domain);
    setLegalBasis(d?.legal_basis ?? "");
    setTosUrl(d?.tos_url ?? "");
    setReviewedBy(d?.legal_reviewed_by ?? "");
    setReviewDue(d?.legal_review_due_at?.slice(0, 10) ?? "");
    setNotes(d?.legal_notes ?? "");
    setStealthJson(
      d?.stealth_profile
        ? JSON.stringify(d.stealth_profile, null, 2)
        : "",
    );
    setPoisonMarkers((d?.poison_markers ?? []).join("\n"));
    setMessage(null);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSavingProfile(true);
    setMessage(null);

    const res = await fetch("/api/domains", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: selected,
        stealth_profile: stealthJson.trim() || null,
        poison_markers: poisonMarkers,
      }),
    });

    setSavingProfile(false);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Profile save failed");
      return;
    }
    setMessage("Fetch profile saved.");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage(null);

    const now = new Date().toISOString();
    const res = await fetch("/api/domains", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: selected,
        legal_basis: legalBasis,
        tos_url: tosUrl,
        legal_reviewed_by: reviewedBy,
        legal_reviewed_at: reviewedBy ? now : null,
        legal_review_due_at: reviewDue || null,
        legal_notes: notes,
      }),
    });

    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Save failed");
      return;
    }
    setMessage("Legal sign-off saved.");
  }

  if (!domains.length) return null;

  return (
    <div className="mt-8 space-y-4 rounded-xl border border-ivory-200 bg-ivory-50/50 p-5 dark:border-graphite-700 dark:bg-graphite-900/40">
      <div>
        <h3 className="text-sm font-medium text-graphite-900 dark:text-ivory-50">
          Legal governance
        </h3>
        <p className="mt-1 text-xs text-graphite-500">
          Record who approved each whitelisted domain and when it must be
          re-reviewed. {needsReview > 0 && `${needsReview} domain(s) pending sign-off.`}
          {suspended.length > 0 &&
            ` ${suspended.length} domain(s) suspended by circuit breaker.`}
        </p>
      </div>

      {suspended.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
          <p className="font-medium">Execution suspended</p>
          <ul className="mt-1 list-inside list-disc">
            {suspended.map((d) => (
              <li key={d.domain}>
                {d.domain}
                {d.suspension_reason ? ` — ${d.suspension_reason}` : ""}
              </li>
            ))}
          </ul>
          {entry?.execution_suspended && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={async () => {
                await fetch("/api/domains", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    domain: selected,
                    clear_suspension: true,
                  }),
                });
                setMessage("Suspension cleared — refresh to see update.");
              }}
            >
              Clear suspension for {selected}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {domains.map((d) => (
          <button
            key={d.domain}
            type="button"
            onClick={() => loadEntry(d.domain)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-mono ${
              selected === d.domain
                ? "border-honey-500 bg-honey-500/10 text-honey-600"
                : "border-ivory-200 text-graphite-600 dark:border-graphite-700 dark:text-graphite-300"
            }`}
          >
            {d.domain}
            {!d.legal_reviewed_at && (
              <span className="ml-1.5 text-amber-600">· review</span>
            )}
            {d.execution_suspended && (
              <span className="ml-1.5 text-red-600">· suspended</span>
            )}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-2">
        <Input
          value={legalBasis}
          onChange={(e) => setLegalBasis(e.target.value)}
          placeholder="Legal basis (e.g. public listing, contract)"
        />
        <Input
          value={tosUrl}
          onChange={(e) => setTosUrl(e.target.value)}
          placeholder="ToS URL"
        />
        <Input
          value={reviewedBy}
          onChange={(e) => setReviewedBy(e.target.value)}
          placeholder="Reviewed by (name/email)"
        />
        <Input
          type="date"
          value={reviewDue}
          onChange={(e) => setReviewDue(e.target.value)}
          placeholder="Re-review due"
        />
        <Input
          className="sm:col-span-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes for auditors"
        />
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save sign-off"}
          </Button>
          {entry?.legal_reviewed_at && (
            <span className="text-xs text-graphite-500">
              Last reviewed {new Date(entry.legal_reviewed_at).toLocaleDateString()}
            </span>
          )}
          {message && <span className="text-xs text-honey-600">{message}</span>}
        </div>
      </form>

      <form onSubmit={handleSaveProfile} className="space-y-3 border-t border-ivory-200 pt-4 dark:border-graphite-700">
        <h4 className="text-xs font-medium uppercase tracking-wide text-graphite-500">
          Fetch hardening (Phase 5)
        </h4>
        <textarea
          value={stealthJson}
          onChange={(e) => setStealthJson(e.target.value)}
          placeholder='Stealth profile JSON e.g. {"user_agent":"..."}'
          rows={4}
          className="w-full rounded-lg border border-ivory-200 bg-white px-3 py-2 font-mono text-xs dark:border-graphite-700 dark:bg-graphite-900"
        />
        <textarea
          value={poisonMarkers}
          onChange={(e) => setPoisonMarkers(e.target.value)}
          placeholder="Poison markers (one per line) e.g. access denied"
          rows={3}
          className="w-full rounded-lg border border-ivory-200 bg-white px-3 py-2 font-mono text-xs dark:border-graphite-700 dark:bg-graphite-900"
        />
        <Button type="submit" size="sm" variant="outline" disabled={savingProfile}>
          {savingProfile ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save fetch profile"
          )}
        </Button>
      </form>
    </div>
  );
}
