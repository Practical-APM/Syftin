import { isPhase2Enabled, isPhase4Enabled, isSupabaseClientConfigured } from "@/lib/env";

export type EnvIssue = {
  level: "error" | "warn";
  message: string;
};

export function validateProductionEnv(): EnvIssue[] {
  if (process.env.NODE_ENV !== "production") return [];

  const issues: EnvIssue[] = [];

  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    issues.push({
      level: "warn",
      message:
        "NEXT_PUBLIC_SITE_URL is unset — contributor install scripts and redirects may use the wrong host.",
    });
  }

  if (!isSupabaseClientConfigured()) {
    issues.push({
      level: "error",
      message:
        "Supabase client keys missing in production — auth and data persistence will not work.",
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    issues.push({
      level: "error",
      message: "SUPABASE_SERVICE_ROLE_KEY is required in production.",
    });
  }

  if (process.env.NEXT_PUBLIC_AUTH_REQUIRED !== "true") {
    issues.push({
      level: "warn",
      message:
        "NEXT_PUBLIC_AUTH_REQUIRED is not true — dashboard routes may be open without login.",
    });
  }

  if (process.env.NEXT_PUBLIC_SHOW_DEV_SETUP === "true") {
    issues.push({
      level: "warn",
      message: "NEXT_PUBLIC_SHOW_DEV_SETUP=true exposes internal setup UI in production.",
    });
  }

  if (isPhase2Enabled()) {
    if (!process.env.RAZORPAY_KEY_SECRET && process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      issues.push({
        level: "warn",
        message: "Razorpay public key set without RAZORPAY_KEY_SECRET — checkout will fail.",
      });
    }
    if (
      process.env.RAZORPAY_WEBHOOK_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET.length < 16
    ) {
      issues.push({
        level: "warn",
        message: "RAZORPAY_WEBHOOK_SECRET looks short — verify Razorpay dashboard value.",
      });
    }
  }

  if (
    (process.env.PLATFORM_ADMIN_EMAILS ?? "").trim() === "" &&
    process.env.NEXT_PUBLIC_AUTH_REQUIRED === "true"
  ) {
    issues.push({
      level: "warn",
      message: "PLATFORM_ADMIN_EMAILS is empty — no one can access /admin in production.",
    });
  }

  if (!process.env.GEMINI_API_KEY?.trim() && !process.env.AI_DRAFT_BASE_URL?.trim()) {
    issues.push({
      level: "warn",
      message:
        "No AI draft provider configured — AI job setup uses demo drafts (set GEMINI_API_KEY or AI_DRAFT_BASE_URL).",
    });
  }

  if (!process.env.HEALTH_CHECK_SECRET?.trim()) {
    issues.push({
      level: "warn",
      message:
        "HEALTH_CHECK_SECRET unset — /api/health returns only public status (recommended for uptime monitors).",
    });
  }

  if (isPhase2Enabled() && !process.env.CRON_SECRET?.trim()) {
    issues.push({
      level: "warn",
      message:
        "CRON_SECRET unset — Vercel Cron and /api/cron/contributor-ops will reject requests.",
    });
  }

  if (
    process.env.NODE_ENV === "production" &&
    !process.env.SLACK_OPS_WEBHOOK_URL?.trim() &&
    !process.env.OPS_WEBHOOK_URL?.trim()
  ) {
    issues.push({
      level: "warn",
      message:
        "No OPS_WEBHOOK_URL or SLACK_OPS_WEBHOOK_URL — platform cron will not send heartbeat alerts.",
    });
  }

  if (isPhase4Enabled()) {
    const hasPayloadBucket = Boolean(process.env.PAYLOAD_S3_BUCKET?.trim());
    const hasPayloadCreds = Boolean(
      process.env.PAYLOAD_S3_ACCESS_KEY_ID?.trim() &&
        process.env.PAYLOAD_S3_SECRET_ACCESS_KEY?.trim(),
    );
    if (!hasPayloadBucket || !hasPayloadCreds) {
      issues.push({
        level: "error",
        message:
          "PAYLOAD_S3_BUCKET and PAYLOAD_S3_ACCESS_KEY_ID/SECRET are required in production — raw HTML must not land in Postgres.",
      });
    }
    if (
      process.env.SUPABASE_POOLER_URL?.trim() &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    ) {
      issues.push({
        level: "warn",
        message:
          "SUPABASE_POOLER_URL is set without NEXT_PUBLIC_SUPABASE_URL — client auth needs the direct project URL.",
      });
    }
    if (!process.env.EMAIL_API_KEY?.trim()) {
      issues.push({
        level: "error",
        message:
          "EMAIL_API_KEY required in production — email OTP verification must be sent to buyers.",
      });
    }
    if (process.env.EMAIL_OTP_DEV_BYPASS?.trim()) {
      issues.push({
        level: "error",
        message:
          "EMAIL_OTP_DEV_BYPASS must not be set in production.",
      });
    }
  }

  if (process.env.NEXT_PUBLIC_ENFORCE_CREDITS !== "true" && isPhase2Enabled()) {
    issues.push({
      level: "warn",
      message:
        "NEXT_PUBLIC_ENFORCE_CREDITS is not true — pilot should enforce prepaid credits.",
    });
  }

  if (process.env.AUTO_DISBURSE_CONTRIBUTOR_PAYOUTS === "true") {
    issues.push({
      level: "warn",
      message:
        "AUTO_DISBURSE_CONTRIBUTOR_PAYOUTS=true — pilot should use manual payout approval.",
    });
  }

  return issues;
}

export function logProductionEnvIssues(): void {
  const issues = validateProductionEnv();
  for (const issue of issues) {
    const prefix = issue.level === "error" ? "[syftin env error]" : "[syftin env warn]";
    console.warn(`${prefix} ${issue.message}`);
  }
}
