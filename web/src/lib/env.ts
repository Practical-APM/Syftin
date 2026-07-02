export function isSupabaseServerConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** True when server can read/write jobs via service role */
export function isSupabaseConfigured() {
  return isSupabaseServerConfigured();
}

export function isSupabaseClientConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const DEMO_ORG_ID = "a0000000-0000-4000-8000-000000000001";

/** Show technical setup checklist (Supabase, Ollama, worker) in dashboard */
export function isDevDashboard() {
  if (process.env.NEXT_PUBLIC_SHOW_DEV_SETUP === "true") return true;
  if (process.env.NEXT_PUBLIC_SHOW_DEV_SETUP === "false") return false;
  return process.env.NODE_ENV === "development";
}

/**
 * Persona C (platform admin) maintains the global domain whitelist.
 * Persona A (buyer) selects from it only. Writes allowed in dev / explicit flag.
 */
export function canManageWhitelist() {
  if (process.env.NEXT_PUBLIC_ALLOW_DOMAIN_WRITE === "true") return true;
  if (process.env.NEXT_PUBLIC_ALLOW_DOMAIN_WRITE === "false") return false;
  return isDevDashboard();
}

/**
 * When true, /dashboard and mutating /api routes require a Supabase session.
 * Default: required in production when Supabase client keys exist; open in dev.
 */
export function isAuthRequired() {
  if (process.env.NEXT_PUBLIC_AUTH_REQUIRED === "true") return true;
  if (process.env.NEXT_PUBLIC_AUTH_REQUIRED === "false") return false;
  return (
    process.env.NODE_ENV === "production" && isSupabaseClientConfigured()
  );
}

/** Client-safe mirror of isAuthRequired() */
export function isAuthRequiredClient() {
  if (process.env.NEXT_PUBLIC_AUTH_REQUIRED === "true") return true;
  if (process.env.NEXT_PUBLIC_AUTH_REQUIRED === "false") return false;
  return (
    process.env.NODE_ENV === "production" && isSupabaseClientConfigured()
  );
}

/** Phase 2: distributed edge fetch + contributor portal */
export function isPhase2Enabled() {
  if (process.env.NEXT_PUBLIC_PHASE2_ENABLED === "true") return true;
  if (process.env.NEXT_PUBLIC_PHASE2_ENABLED === "false") return false;
  return process.env.NODE_ENV === "development";
}

export function isPhase2EnabledClient() {
  return process.env.NEXT_PUBLIC_PHASE2_ENABLED === "true" || isPhase2Enabled();
}

/** Minimum UPI payout threshold in paise (₹500) */
export const PAYOUT_THRESHOLD_PAISE = 50_000;

/** When true, pending contributor payouts are sent via RazorpayX without manual admin click */
export function isAutoDisbursePayoutsEnabled() {
  return process.env.AUTO_DISBURSE_CONTRIBUTOR_PAYOUTS === "true";
}

/** Job creation cost in cents when credits enforcement is on */
export const DEFAULT_JOB_COST_CENTS = 500;

/** Public site URL for contributor install scripts and node API */
export function getPublicSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/** Phase 3: batch orchestration, task types, push dispatch */
export function isPhase3Enabled() {
  if (process.env.NEXT_PUBLIC_PHASE3_ENABLED === "true") return true;
  if (process.env.NEXT_PUBLIC_PHASE3_ENABLED === "false") return false;
  return process.env.NODE_ENV === "development";
}

export function isPhase3EnabledClient() {
  return process.env.NEXT_PUBLIC_PHASE3_ENABLED === "true" || isPhase3Enabled();
}

/** Maximum URLs in a single batch submission */
export const MAX_BATCH_URLS = (() => {
  const raw = process.env.MAX_BATCH_URLS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 100;
})();
