"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAuthRequired } from "@/lib/env";

type OrgState = {
  orgName: string;
  dpaSignedAt: string | null;
};

export function PilotSetupGate({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState<OrgState | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthRequired()) {
      setLoading(false);
      return;
    }
    fetch("/api/org")
      .then((r) => r.json())
      .then((data) => {
        if (data.orgName) {
          setOrg({ orgName: data.orgName, dpaSignedAt: data.dpaSignedAt });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function acceptDpa() {
    setSigning(true);
    setError(null);
    const res = await fetch("/api/org", { method: "POST" });
    const data = await res.json();
    setSigning(false);
    if (!res.ok) {
      setError(data.error ?? "Could not record DPA acceptance");
      return;
    }
    setOrg((prev) =>
      prev ? { ...prev, dpaSignedAt: new Date().toISOString() } : prev,
    );
  }

  if (!isAuthRequired() || loading) {
    return <>{children}</>;
  }

  if (org && !org.dpaSignedAt) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-ivory-200 bg-white p-8 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-honey-500/10">
            <ShieldCheck className="h-5 w-5 text-honey-600" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-graphite-900">
            Accept the Data Processing Agreement
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-graphite-500">
            Before creating collection jobs in{" "}
            <span className="font-medium text-graphite-700">{org.orgName}</span>
            , review and accept our DPA. You remain the data controller; Syftin
            acts as processor for whitelisted public sources only.
          </p>
          <Link
            href="/dpa"
            target="_blank"
            className="mt-4 inline-block text-sm font-medium text-honey-600 hover:text-honey-500"
          >
            Read the DPA →
          </Link>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <Button
            className="mt-6 w-full"
            onClick={acceptDpa}
            disabled={signing}
          >
            {signing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording…
              </>
            ) : (
              "I accept on behalf of my organization"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
