import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { dispatchCreditLowEvent } from "@/lib/data/webhook-subscriptions";

const CREDIT_LOW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Dispatch credit.low subscription event when balance drops at or below threshold.
 * Deduplicated to once per 24h per org.
 */
export async function maybeDispatchCreditLowEvent(orgId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("credit_balance_cents, credit_low_threshold_paise")
    .eq("id", orgId)
    .single();

  if (!org) return;

  const balanceMinor = Number(org.credit_balance_cents ?? 0);
  const thresholdMinor = Number(org.credit_low_threshold_paise ?? 50_000);

  if (balanceMinor > thresholdMinor) return;

  const since = new Date(Date.now() - CREDIT_LOW_COOLDOWN_MS).toISOString();
  const { count } = await admin
    .from("webhook_delivery_log")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("event_type", "credit.low")
    .gte("created_at", since);

  if ((count ?? 0) > 0) return;

  await dispatchCreditLowEvent(orgId, balanceMinor, thresholdMinor).catch(
    console.error,
  );
}
