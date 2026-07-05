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
import { EmailVerificationPanel } from "@/components/dashboard/email-verification-panel";
import {
  orderTotalPaise,
  type PaymentMethod,
} from "@/lib/payments/payment-surcharge";
import { DEFAULT_JOB_COST_CENTS, isPhase2EnabledClient } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { CreditTransaction } from "@/lib/data/credits";

export function CreditsPanel({
  initialBalance,
  initialTransactions,
  razorpayEnabled,
  defaultEmail,
}: {
  initialBalance: number;
  initialTransactions: CreditTransaction[];
  razorpayEnabled: boolean;
  defaultEmail?: string;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<CreditPackId>("pack_500");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("upi");
  const [emailVerified, setEmailVerified] = useState(true);

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
        setEmailVerified(Boolean(data.emailVerified ?? true));
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
  const selectedPackData = CREDIT_PACKS.find((p) => p.id === selectedPack);
  const pricing = selectedPackData
    ? orderTotalPaise(selectedPackData.amountCents, paymentMethod)
    : null;

  if (!isPhase2EnabledClient()) {
    return (
      <>
        <DashboardHeader
          title="Credits"
          description="Prepaid balance for extraction jobs (Phase 2)."
        />
        <DashboardPage>
          <p className="text-sm text-graphite-500 dark:text-graphite-300">
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
            <Button
              size="sm"
              onClick={handleDemoTopUp}
              disabled={toppingUp || !emailVerified}
            >
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

        {!emailVerified && (
          <EmailVerificationPanel
            initialVerified={false}
            defaultEmail={defaultEmail}
            onVerified={() => {
              setEmailVerified(true);
              load();
            }}
          />
        )}

        {razorpayEnabled && (
          <section className="space-y-4">
            <SectionHeading as="h2" className="normal-case tracking-normal text-sm font-semibold text-graphite-900 dark:text-ivory-50">
              Add credits
            </SectionHeading>
            <p className="text-xs text-graphite-500 dark:text-graphite-400">
              Pay via Razorpay. UPI has no surcharge; cards and netbanking add
              2.36% to cover gateway fees. Each job costs{" "}
              {formatRupees(DEFAULT_JOB_COST_CENTS)} when enforcement is on.
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["upi", "UPI (0% fee)"],
                  ["card", "Card (+2.36%)"],
                  ["netbanking", "Netbanking (+2.36%)"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    paymentMethod === id
                      ? "border-honey-500 bg-honey-500/10 text-honey-600 dark:text-honey-400"
                      : "border-ivory-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
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
                        : "border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 hover:border-ivory-300 dark:hover:border-graphite-600",
                    )}
                  >
                    <p className="text-lg font-semibold text-graphite-900 dark:text-ivory-50">
                      {pack.label}
                    </p>
                    <p className="mt-1 text-xs text-graphite-500 dark:text-graphite-400">
                      ~{pack.jobsApprox} jobs at ₹5 each
                    </p>
                  </button>
                );
              })}
            </div>
            {pricing && pricing.surchargePaise > 0 && (
              <p className="text-xs text-graphite-500 dark:text-graphite-400">
                You pay {formatRupees(pricing.chargePaise)} (includes{" "}
                {formatRupees(pricing.surchargePaise)} gateway surcharge).{" "}
                {formatRupees(pricing.creditPaise)} credits will be added.
              </p>
            )}
            <Button
              type="button"
              disabled={paying}
              onClick={() => startCheckout(selectedPack, paymentMethod)}
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

        {transactions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-900/40 px-6 py-10 text-center text-sm text-graphite-500 dark:text-graphite-400">
            No transactions yet.
          </p>
        ) : (
          <div className="app-data-table overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-400">
                    Type
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-400">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-400">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-5 py-4 capitalize text-graphite-700 dark:text-graphite-200">
                      {tx.kind.replace("_", " ")}
                    </td>
                    <td
                      className={`px-5 py-4 font-medium ${tx.amount_cents >= 0 ? "text-honey-600 dark:text-honey-400" : "text-graphite-900 dark:text-ivory-50"}`}
                    >
                      {tx.amount_cents >= 0 ? "+" : ""}
                      {formatRupees(Math.abs(tx.amount_cents))}
                    </td>
                    <td className="px-5 py-4 text-xs text-graphite-500 dark:text-graphite-400">
                      {tx.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-graphite-500 dark:text-graphite-400">
          {razorpayEnabled ? (
            <>
              Payments processed by Razorpay. For billing questions contact{" "}
              <a
                href="mailto:support@syftin.com"
                className="text-honey-600 dark:text-honey-400 hover:underline"
              >
                support@syftin.com
              </a>
              .
            </>
          ) : (
            <>
              Razorpay keys not set — use demo top-up locally.{" "}
              <Link href="/docs" className="text-honey-600 dark:text-honey-400 hover:underline">
                Docs →
              </Link>
            </>
          )}
        </p>
      </DashboardPage>
    </>
  );
}
