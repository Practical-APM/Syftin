"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseClientConfigured } from "@/lib/env";

export type AccessRequestSource = "landing" | "login";

export function useAccessRequest({
  source = "landing",
  next = "/dashboard",
}: {
  source?: AccessRequestSource;
  next?: string;
} = {}) {
  const canUseMagicLink = isSupabaseClientConfigured();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(emailValue: string) {
    const trimmed = emailValue.trim();
    if (!trimmed) return;

    setError(null);
    setLoading(true);
    setEmail(trimmed);

    if (canUseMagicLink) {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });
      setLoading(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      setSubmitted(true);
      return;
    }

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, source }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not save your email.");
      return;
    }
    setSubmitted(true);
  }

  return {
    email,
    setEmail,
    submitted,
    loading,
    error,
    canUseMagicLink,
    submit,
  };
}
