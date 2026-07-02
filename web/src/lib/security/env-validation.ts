import { isPhase2Enabled, isSupabaseClientConfigured } from "@/lib/env";

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

  return issues;
}

export function logProductionEnvIssues(): void {
  const issues = validateProductionEnv();
  for (const issue of issues) {
    const prefix = issue.level === "error" ? "[syftin env error]" : "[syftin env warn]";
    console.warn(`${prefix} ${issue.message}`);
  }
}
