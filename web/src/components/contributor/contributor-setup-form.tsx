"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { FieldGroup, FieldHint, FieldLabel, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tierLabel } from "@/lib/contributor/utils";
import type { SessionContributor } from "@/lib/auth/contributor";

export function ContributorSetupForm({
  contributor,
}: {
  contributor: SessionContributor;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    contributor.displayName ?? "",
  );
  const [upiVpa, setUpiVpa] = useState(contributor.upiVpa ?? "");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/contributor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        upiVpa,
        panNumber: panNumber || undefined,
        aadhaarLast4: aadhaarLast4 || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Could not save profile.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <>
      <DashboardHeader title="Setup" />
      <DashboardPage>
        <Panel className="max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup>
              <FieldLabel>Display name</FieldLabel>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex"
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>UPI ID (VPA)</FieldLabel>
              <Input
                required
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                placeholder="name@upi"
              />
              <FieldHint>Required for automatic payouts.</FieldHint>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>PAN (for 1% TDS)</FieldLabel>
              <Input
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
              <FieldHint>
                {contributor.panVerified
                  ? "PAN on file — 1% TDS applies to earnings."
                  : "Without PAN/Aadhaar, 5% TDS is withheld."}
              </FieldHint>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Aadhaar (last 4 digits)</FieldLabel>
              <Input
                value={aadhaarLast4}
                onChange={(e) =>
                  setAadhaarLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="1234"
                maxLength={4}
              />
              <FieldHint>
                {contributor.aadhaarVerified
                  ? "Aadhaar verified on file."
                  : "Alternative to PAN for reduced TDS rate."}
              </FieldHint>
            </FieldGroup>

            <div className="rounded-lg border border-honey-500/20 bg-honey-500/5 p-4 dark:border-honey-500/20 dark:bg-honey-500/5">
              <p className="text-xs font-medium text-honey-600 dark:text-honey-400">
                Hardware tier — detected automatically
              </p>
              <p className="mt-2 text-sm text-graphite-700 dark:text-graphite-300">
                Current profile:{" "}
                <strong className="text-ivory-50">{tierLabel(contributor.computeTier)}</strong>
              </p>
              <Link
                href="/contributor/help#node-types"
                className="mt-2 inline-block text-xs font-medium text-honey-600 hover:text-honey-500 dark:text-honey-400 dark:hover:text-honey-300"
              >
                Learn about Scout, Ranger, and Titan →
              </Link>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {saved && (
              <div className="space-y-3">
                <p className="text-sm text-honey-400">Profile saved.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/contributor/nodes">
                    <Button type="button" size="sm" variant="outline">
                      Register device →
                    </Button>
                  </Link>
                  <Link href="/contributor/download">
                    <Button type="button" size="sm">
                      Download installer →
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save profile"
              )}
            </Button>
          </form>
        </Panel>
      </DashboardPage>
    </>
  );
}
