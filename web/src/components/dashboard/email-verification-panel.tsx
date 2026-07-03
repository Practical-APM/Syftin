"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui/card";
import { FieldGroup, FieldHint, FieldLabel, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FREE_TIER_MAX_RECORDS } from "@/lib/pricing/estimates";

export function EmailVerificationPanel({
  initialVerified,
  defaultEmail,
  onVerified,
}: {
  initialVerified: boolean;
  defaultEmail?: string;
  onVerified?: () => void;
}) {
  const [verified, setVerified] = useState(initialVerified);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (verified) {
    return (
      <Panel className="border-honey-500/25 bg-honey-500/5">
        <div className="flex items-center gap-2 text-sm text-honey-600 dark:text-honey-400">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Email verified — full volume limits unlocked.
        </div>
      </Panel>
    );
  }

  async function sendOtp() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/org/email/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Could not send code.");
      return;
    }
    setOtpSent(true);
    if ((data as { devOtp?: string }).devOtp) {
      setDevOtp((data as { devOtp?: string }).devOtp ?? null);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/org/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Verification failed.");
      return;
    }
    setVerified(true);
    onVerified?.();
  }

  return (
    <Panel className="border-amber-500/30 bg-amber-500/5">
      <p className="text-sm font-medium text-graphite-900 dark:text-ivory-50">
        Verify your email to unlock higher volumes
      </p>
      <p className="mt-1 text-xs text-graphite-500 dark:text-graphite-400">
        Unverified accounts are limited to {FREE_TIER_MAX_RECORDS} rows per job.
        Trial credits also require verification.
      </p>

      <div className="mt-4 space-y-3">
        <FieldGroup>
          <FieldLabel>Work email</FieldLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={otpSent}
          />
        </FieldGroup>

        {otpSent && (
          <FieldGroup>
            <FieldLabel>6-digit code</FieldLabel>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
            />
            {devOtp && <FieldHint>Dev code: {devOtp}</FieldHint>}
          </FieldGroup>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {!otpSent ? (
            <Button type="button" size="sm" disabled={loading} onClick={sendOtp}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={loading} onClick={verifyOtp}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}
