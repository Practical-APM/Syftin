"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { InlineError } from "@/components/ui/error-fallback";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/contributor/utils";
import { cn, formatDate } from "@/lib/utils";
import type { PayoutEvent } from "@/lib/data/payouts";

export function AdminPayoutsPanel() {
  const [payouts, setPayouts] = useState<PayoutEvent[]>([]);
  const [recent, setRecent] = useState<PayoutEvent[]>([]);
  const [razorpayXEnabled, setRazorpayXEnabled] = useState(false);
  const [pendingTotalPaise, setPendingTotalPaise] = useState(0);
  const [disbursedTodayPaise, setDisbursedTodayPaise] = useState(0);
  const [dailyOutLimitPaise, setDailyOutLimitPaise] = useState(2_500_000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/payouts");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load payouts.");
      setLoading(false);
      return;
    }
    setPayouts(data.payouts ?? []);
    setRecent(data.recent ?? []);
    setRazorpayXEnabled(Boolean(data.razorpayXEnabled));
    setPendingTotalPaise(Number(data.pendingTotalPaise ?? 0));
    setDisbursedTodayPaise(Number(data.disbursedTodayPaise ?? 0));
    setDailyOutLimitPaise(Number(data.dailyOutLimitPaise ?? 2_500_000));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, mode: "razorpayx" | "manual") {
    setActing(id);
    setError(null);
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutId: id, mode }),
    });
    const data = await res.json().catch(() => ({}));
    setActing(null);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Action failed.");
      return;
    }
    load();
  }

  return (
    <>
      <DashboardHeader
        title="Contributor payouts"
        description={
          razorpayXEnabled
            ? "Send UPI via RazorpayX when balances cross ₹500. Webhooks update final status."
            : "Manual approval when RazorpayX is not configured."
        }
      />
      <DashboardPage>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-ivory-200 bg-white px-4 py-3">
            <p className="text-xs text-graphite-500">Pending batch</p>
            <p className="text-lg font-semibold text-graphite-900">
              {formatPaise(pendingTotalPaise)}
            </p>
            <p className="text-[10px] text-graphite-400">
              Max 5 auto-disbursements per cron run
            </p>
          </div>
          <div className="rounded-lg border border-ivory-200 bg-white px-4 py-3">
            <p className="text-xs text-graphite-500">Disbursed today</p>
            <p className="text-lg font-semibold text-emerald-700">
              {formatPaise(disbursedTodayPaise)}
            </p>
            <p className="text-[10px] text-graphite-400">
              Pilot cap ₹25k/day ({formatPaise(dailyOutLimitPaise)})
            </p>
          </div>
          <div className="rounded-lg border border-ivory-200 bg-white px-4 py-3">
            <p className="text-xs text-graphite-500">Headroom today</p>
            <p className="text-lg font-semibold text-graphite-900">
              {formatPaise(Math.max(0, dailyOutLimitPaise - disbursedTodayPaise))}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payouts…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : payouts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ivory-200 bg-white px-6 py-10 text-center text-sm text-graphite-500">
            No pending payouts.
          </p>
        ) : (
          <PayoutTable
            payouts={payouts}
            razorpayXEnabled={razorpayXEnabled}
            acting={acting}
            onSend={(id) => act(id, "razorpayx")}
            onManual={(id) => act(id, "manual")}
          />
        )}

        {recent.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-graphite-900">
              Recent payouts
            </h2>
            <div className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ivory-200 bg-ivory-50/80">
                    <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                      Contributor
                    </th>
                    <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-ivory-100 last:border-0"
                    >
                      <td className="px-5 py-4 text-graphite-900">
                        {p.contributor_name ?? p.contributor_email ?? "—"}
                      </td>
                      <td className="px-5 py-4 font-medium text-emerald-700">
                        {formatPaise(p.amount_paise)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={p.status} />
                        {p.failure_reason && (
                          <p className="mt-1 text-xs text-red-600">
                            {p.failure_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-graphite-500">
                        {p.provider_ref ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </DashboardPage>
    </>
  );
}

function PayoutTable({
  payouts,
  razorpayXEnabled,
  acting,
  onSend,
  onManual,
}: {
  payouts: PayoutEvent[];
  razorpayXEnabled: boolean;
  acting: string | null;
  onSend: (id: string) => void;
  onManual: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ivory-200 bg-ivory-50/80">
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Contributor
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              UPI
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Amount
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Status
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500" />
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr
              key={p.id}
              className="border-b border-ivory-100 last:border-0"
            >
              <td className="px-5 py-4">
                <p className="font-medium text-graphite-900">
                  {p.contributor_name ?? "—"}
                </p>
                <p className="text-xs text-graphite-500">{p.contributor_email}</p>
              </td>
              <td className="px-5 py-4 font-mono text-xs text-graphite-700">
                {p.upi_vpa ?? (
                  <span className="text-amber-600">Missing UPI</span>
                )}
              </td>
              <td className="px-5 py-4 font-medium text-emerald-700">
                {formatPaise(p.amount_paise)}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex justify-end gap-2">
                  {p.status === "pending" && razorpayXEnabled && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={acting === p.id || !p.upi_vpa}
                      onClick={() => onSend(p.id)}
                    >
                      {acting === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Send UPI
                        </>
                      )}
                    </Button>
                  )}
                  {p.status === "pending" && !razorpayXEnabled && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={acting === p.id}
                      onClick={() => onManual(p.id)}
                    >
                      {acting === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        status === "completed" || status === "approved"
          ? "bg-emerald-500/15 text-emerald-700"
          : status === "processing"
            ? "bg-blue-500/15 text-blue-600"
            : status === "failed"
              ? "bg-red-500/15 text-red-600"
              : "bg-amber-500/15 text-amber-700",
      )}
    >
      {status}
    </span>
  );
}
