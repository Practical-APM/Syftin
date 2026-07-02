"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccessRequest } from "@/hooks/use-access-request";
import { cn } from "@/lib/utils";

type AccessRequestFormProps = {
  source?: "landing" | "login";
  variant?: "hero" | "cta" | "login";
  className?: string;
  next?: string;
};

export function AccessRequestForm({
  source = "landing",
  variant = "hero",
  className,
  next = "/dashboard",
}: AccessRequestFormProps) {
  const {
    email,
    setEmail,
    submitted,
    loading,
    error,
    canUseMagicLink,
    submit,
  } = useAccessRequest({ source, next });

  const isCta = variant === "cta";
  const isLogin = variant === "login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit(email);
  }

  if (submitted) {
    return (
      <div
        className={cn(
          "rounded-xl border p-4",
          isCta
            ? "border-graphite-700 bg-graphite-800/60 text-left"
            : "border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-left shadow-sm",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              isCta ? "text-emerald-400" : "text-emerald-600",
            )}
          />
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                isCta ? "text-ivory-50" : "text-graphite-900 dark:text-ivory-50",
              )}
            >
              {canUseMagicLink ? "Check your email" : "You're on the list"}
            </p>
            <p
              className={cn(
                "mt-1 text-sm",
                isCta ? "text-graphite-400" : "text-graphite-500 dark:text-graphite-300",
              )}
            >
              {canUseMagicLink
                ? `We sent a sign-in link to ${email}.`
                : "If your email matches our pilot roster, you'll hear from us soon."}
            </p>
            {!canUseMagicLink && (
              <Link
                href="/dashboard"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-honey-500 hover:text-honey-400"
              >
                Preview the demo dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        isLogin ? "space-y-4" : isCta ? "mx-auto max-w-md" : "max-w-md",
        className,
      )}
    >
      {isLogin ? (
        <div>
          <label
            htmlFor="access-email-login"
            className="block text-sm font-medium text-graphite-900 dark:text-ivory-50"
          >
            Work email
          </label>
          <input
            id="access-email-login"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="mt-1.5 w-full rounded-lg border border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-950 px-3.5 py-2.5 text-sm text-graphite-900 dark:text-ivory-50 placeholder:text-graphite-400 dark:placeholder:text-graphite-500 focus:border-honey-500/50 focus:outline-none focus:ring-2 focus:ring-honey-500/15"
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-2 sm:flex-row",
            isCta && "sm:items-stretch",
          )}
        >
          <label htmlFor={`access-email-${variant}`} className="sr-only">
            Work email
          </label>
          <input
            id={`access-email-${variant}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={cn(
              "min-w-0 flex-1 rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2",
              isCta
                ? "border-graphite-700 bg-graphite-950 text-ivory-50 placeholder:text-graphite-500 focus:border-honey-500/50 focus:ring-honey-500/15"
                : "border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-950 text-graphite-900 dark:text-ivory-50 placeholder:text-graphite-400 dark:placeholder:text-graphite-500 focus:border-honey-500/50 focus:ring-honey-500/15",
            )}
          />
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className={cn("shrink-0", isCta && "sm:px-6")}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : canUseMagicLink ? (
              "Email sign-in link"
            ) : (
              "Request access"
            )}
          </Button>
        </div>
      )}

      {error && (
        <p
          className={cn(
            "text-sm",
            isCta ? "text-red-400" : "text-red-600",
            isLogin && "mt-0",
          )}
        >
          {error}
        </p>
      )}

      {isLogin ? (
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : canUseMagicLink ? (
            "Email me a sign-in link"
          ) : (
            "Continue with email"
          )}
        </Button>
      ) : null}

      {!isLogin && (
        <p
          className={cn(
            "mt-2 text-xs",
            isCta ? "text-graphite-500" : "text-graphite-400 dark:text-graphite-400",
          )}
        >
          Work email for buyer access.{" "}
          <a
            href="#who-its-for"
            className={cn(
              "font-medium underline-offset-2 hover:underline",
              isCta ? "text-graphite-400" : "text-graphite-500 dark:text-graphite-300",
            )}
          >
            Contributors
          </a>{" "}
          sign in separately.
        </p>
      )}
    </form>
  );
}
