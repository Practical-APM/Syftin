import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

const RECONCILIATION_DELTA_THRESHOLD_PAISE = 100;

export async function isOrgBillingLocked(orgId: string): Promise<{
  locked: boolean;
  reason: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { locked: false, reason: null };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("billing_stream_locked, billing_lock_reason")
    .eq("id", orgId)
    .single();

  return {
    locked: Boolean(data?.billing_stream_locked),
    reason: (data?.billing_lock_reason as string | null) ?? null,
  };
}

export async function assertOrgBillingUnlocked(
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { locked, reason } = await isOrgBillingLocked(orgId);
  if (!locked) return { ok: true };

  return {
    ok: false,
    error:
      reason ??
      "This workspace is locked pending a billing reconciliation review. Contact support.",
  };
}

export async function clearOrgBillingLock(orgId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({
      billing_stream_locked: false,
      billing_lock_reason: null,
      billing_locked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (error) throw new Error(error.message);
}

export async function getBillingGuardStats(): Promise<{
  lockedOrgs: number;
  recentLedgerDeltas: number;
}> {
  if (!isSupabaseConfigured()) {
    return { lockedOrgs: 0, recentLedgerDeltas: 0 };
  }

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [lockedRes, deltaRes] = await Promise.all([
    admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("billing_stream_locked", true),
    admin
      .from("platform_ledger")
      .select("job_id", { count: "exact", head: true })
      .gt("reconciliation_delta_paise", RECONCILIATION_DELTA_THRESHOLD_PAISE)
      .gte("created_at", weekAgo),
  ]);

  return {
    lockedOrgs: lockedRes.count ?? 0,
    recentLedgerDeltas: deltaRes.count ?? 0,
  };
}
