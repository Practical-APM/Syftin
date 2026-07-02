"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Plus } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel, SectionHeading, StatCard } from "@/components/ui/card";
import { InlineError } from "@/components/ui/error-fallback";
import { Button } from "@/components/ui/button";
import { useRazorpayCheckout } from "@/components/dashboard/razorpay-checkout";
import { formatRupees } from "@/lib/contributor/utils";
import {
  CREDIT_PACKS,
  type CreditPackId,
} from "@/lib/payments/razorpay-config";
import { DEFAULT_JOB_COST_CENTS, isPhase2EnabledClient } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { CreditTransaction } from "@/lib/data/credits";

export function CreditsPanel({
  initialBalance,
  initialTransactions,
  razorpayEnabled,
}: {
  initialBalance: number;
  initialTransactions: CreditTransaction[];
  razorpayEnabled: boolean;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<CreditPackId>("pack_500");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/credits")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load credits.");
        return res.json();
      })
      .then((data) => {
        setBalance(data.balance);
        setTransactions(data.transactions ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request failed."),
      )
      .finally(() => setLoading(false));
  }, []);

  const { startCheckout, paying, error: payError, setError: setPayError } =
    useRazorpayCheckout(load);

  useEffect(() => {
    if (!isPhase2EnabledClient()) return;
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  async function handleDemoTopUp() {
    setToppingUp(true);
    setError(null);
    const res = await fetch("/api/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: 50_000 }),
    });
    const data = await res.json().catch(() => ({}));
    setToppingUp(false);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Top-up failed.");
      return;
    }
    setBalance(data.balance);
    load();
  }

  const displayError = error ?? payError;

  if (!isPhase2EnabledClient()) {
    return (
      <>
        <DashboardHeader
          title="Credits"
          description="Prepaid balance for extraction jobs (Phase 2)."
        />
        <DashboardPage>
          <p className="text-sm text-graphite-500">
            Credits are not enabled. Set{" "}
            <code className="text-xs">NEXT_PUBLIC_PHASE2_ENABLED=true</code> to
            preview the ledger.
          </p>
        </DashboardPage>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Credits"
        action={
          !razorpayEnabled ? (
            <Button size="sm" onClick={handleDemoTopUp} disabled={toppingUp}>
              {toppingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add ₹500 (demo)
                </>
              )}
            </Button>
          ) : undefined
        }
      />
      <DashboardPage>
        {displayError && (
          <InlineError
            message={displayError}
            onRetry={() => {
              setError(null);
              setPayError(null);
              load();
            }}
          />
        )}

        <StatCard
          label="Available balance"
          value={formatRupees(balance)}
          hint={loading ? "Refreshing…" : undefined}
        />

        {razorpayEnabled && (
          <section className="space-y-4">
            <SectionHeading as="h2" className="normal-case tracking-normal text-sm font-semibold text-graphite-900">
              Add credits
            </SectionHeading>
            <p className="text-xs text-graphite-500">
              Pay securely via Razorpay (UPI, cards, netbanking). Each job costs{" "}
              {formatRupees(DEFAULT_JOB_COST_CENTS)} when enforcement is on.
            </p>
            <div className="app-stat-grid-3">
              {CREDIT_PACKS.map((pack) => {
                const selected = selectedPack === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPack(pack.id)}
                    className={cn(
                      "rounded-xl border p-5 text-left transition-colors",
                      selected
                        ? "border-honey-500 bg-honey-500/5 ring-2 ring-honey-500/20"
                        : "border-ivory-200 bg-white hover:border-ivory-300",
                    )}
                  >
                    <p className="text-lg font-semibold text-graphite-900">
                      {pack.label}
                    </p>
                    <p className="mt-1 text-xs text-graphite-500">
                      ~{pack.jobsApprox} jobs at ₹5 each
                    </p>
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              disabled={paying}
              onClick={() => startCheckout(selectedPack)}
              className="gap-2"
            >
              {paying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {paying ? "Opening checkout…" : "Pay with Razorpay"}
            </Button>
          </section>
        )}

        <div className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ivory-200 bg-ivory-50/80">
                <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                  Type
                </th>
                <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                  Amount
                </th>
                <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-ivory-100 last:border-0"
                >
                  <td className="px-5 py-4 capitalize text-graphite-700">
                    {tx.kind.replace("_", " ")}
                  </td>
                  <td
                    className={`px-5 py-4 font-medium ${tx.amount_cents >= 0 ? "text-emerald-700" : "text-graphite-900"}`}
                  >
                    {tx.amount_cents >= 0 ? "+" : ""}
                    {formatRupees(Math.abs(tx.amount_cents))}
                  </td>
                  <td className="px-5 py-4 text-xs text-graphite-500">
                    {tx.description ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-graphite-500">
          {razorpayEnabled ? (
            <>
              Payments processed by Razorpay. For billing questions contact{" "}
              <a
                href="mailto:hello@syftin.io"
                className="text-honey-600 hover:underline"
              >
                hello@syftin.io
              </a>
              .
            </>
          ) : (
            <>
              Razorpay keys not set — use demo top-up locally.{" "}
              <Link href="/docs" className="text-honey-600 hover:underline">
                Docs →
              </Link>
            </>
          )}
        </p>
      </DashboardPage>
    </>
  );
}
