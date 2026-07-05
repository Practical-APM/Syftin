"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { AccessRequestForm } from "@/components/landing/access-request-form";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const errorCode = searchParams.get("error");
  const inviteMessage = searchParams.get("message");

  const initialError =
    errorCode === "auth"
      ? "Sign-in link expired or invalid. Please try again."
      : errorCode === "phase2"
        ? (inviteMessage
            ? decodeURIComponent(inviteMessage)
            : "Contributor portal is not enabled on this deployment.")
        : inviteMessage
          ? decodeURIComponent(inviteMessage)
          : null;

  const isContributor = next.startsWith("/contributor");

  return (
    <div className="flex min-h-dvh">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-graphite-950 p-12 lg:flex">
        <div className="gradient-radial-dark pointer-events-none absolute inset-0" />
        <div className="relative">
          <SyftinLogo variant="light" />
        </div>
        <div className="relative">
          <h2 className="text-3xl font-light tracking-tight text-ivory-50">
            {isContributor ? (
              <>
                Run a Syftin node,
                <br />
                <span className="text-emerald-400">earn from approved fetches.</span>
              </>
            ) : (
              <>
                Structured web data,
                <br />
                <span className="text-honey-400">delivered to your dashboard.</span>
              </>
            )}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-graphite-400">
            {isContributor
              ? "Sign in to manage devices, track earnings, and install the background node app."
              : "Track collection jobs, review quality scores, and download JSON files for the public sources your team relies on."}
          </p>
        </div>
        <p className="relative text-xs text-graphite-500">
          {isContributor
            ? "Contributor access is invite-only during the pilot."
            : "Early access is invite-only while we onboard new business customers."}
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-ivory-50 dark:bg-graphite-950 px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <SyftinLogo />
          </div>
          <h1 className="app-page-title text-2xl leading-tight">
            {isContributor ? "Contributor sign in" : "Sign in"}
          </h1>
          <p className="app-page-lead">
            {isContributor
              ? "We'll email you a secure sign-in link for the contributor portal."
              : "We'll email you a secure sign-in link for the Syftin dashboard."}
          </p>

          {initialError && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{initialError}</p>
          )}

          <AccessRequestForm
            source="login"
            variant="login"
            next={next}
            className="mt-8"
          />

          <p className="mt-8 text-center text-xs leading-relaxed text-graphite-400 dark:text-graphite-400">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-graphite-500 dark:text-graphite-300 hover:text-graphite-700 dark:hover:text-ivory-50">
              Terms
            </Link>
            ,{" "}
            <Link href="/dpa" className="text-graphite-500 dark:text-graphite-300 hover:text-graphite-700 dark:hover:text-ivory-50">
              DPA
            </Link>
            , and{" "}
            <Link href="/privacy" className="text-graphite-500 dark:text-graphite-300 hover:text-graphite-700 dark:hover:text-ivory-50">
              Privacy Policy
            </Link>
            .
          </p>
          {isContributor && (
            <p className="mt-4 text-center text-xs text-graphite-400 dark:text-graphite-400">
              Need the buyer dashboard?{" "}
              <Link
                href="/login"
                className="font-medium text-honey-600 dark:text-honey-400 hover:text-honey-500"
              >
                Business sign in
              </Link>
            </p>
          )}
          {!isContributor && (
            <p className="mt-4 text-center text-xs text-graphite-400 dark:text-graphite-400">
              Running a worker node?{" "}
              <Link
                href="/login?next=/contributor"
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
              >
                Contributor sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
