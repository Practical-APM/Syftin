import { createAdminClient } from "@/lib/supabase/admin";
import {
  createRazorpayXContact,
  createRazorpayXFundAccountVpa,
  createRazorpayXUpiPayout,
  isRazorpayXConfigured,
} from "@/lib/payments/razorpayx";

export type PayoutEvent = {
  id: string;
  contributor_id: string;
  contributor_email: string | null;
  contributor_name: string | null;
  upi_vpa: string | null;
  amount_paise: number;
  provider: string;
  provider_ref: string | null;
  status: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string | null;
};

type ContributorRow = {
  email: string | null;
  display_name: string | null;
  upi_vpa: string | null;
  razorpay_contact_id: string | null;
  razorpay_fund_account_id: string | null;
};

function mapPayoutRow(row: {
  id: string;
  contributor_id: string;
  amount_paise: number | string;
  provider: string;
  provider_ref: string | null;
  status: string;
  failure_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  contributors: ContributorRow | ContributorRow[] | null;
}): PayoutEvent {
  const c = row.contributors;
  const contributor = Array.isArray(c) ? c[0] : c;
  return {
    id: row.id,
    contributor_id: row.contributor_id,
    contributor_email: contributor?.email ?? null,
    contributor_name: contributor?.display_name ?? null,
    upi_vpa: contributor?.upi_vpa ?? null,
    amount_paise: Number(row.amount_paise),
    provider: row.provider,
    provider_ref: row.provider_ref,
    status: row.status,
    failure_reason: row.failure_reason ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  };
}

const PAYOUT_SELECT = `
  id,
  contributor_id,
  amount_paise,
  provider,
  provider_ref,
  status,
  failure_reason,
  created_at,
  updated_at,
  contributors ( email, display_name, upi_vpa, razorpay_contact_id, razorpay_fund_account_id )
`;

export async function listPendingPayouts(): Promise<PayoutEvent[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payout_events")
    .select(PAYOUT_SELECT)
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapPayoutRow(row as Parameters<typeof mapPayoutRow>[0]));
}

export async function listRecentPayouts(limit = 20): Promise<PayoutEvent[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payout_events")
    .select(PAYOUT_SELECT)
    .in("status", ["completed", "failed", "approved"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapPayoutRow(row as Parameters<typeof mapPayoutRow>[0]));
}

async function getPayoutById(payoutId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payout_events")
    .select(PAYOUT_SELECT)
    .eq("id", payoutId)
    .single();

  if (error || !data) return null;
  return mapPayoutRow(data as Parameters<typeof mapPayoutRow>[0]);
}

async function ensureContributorFundAccount(
  contributorId: string,
  contributor: ContributorRow,
): Promise<string> {
  if (contributor.razorpay_fund_account_id) {
    return contributor.razorpay_fund_account_id;
  }

  if (!contributor.upi_vpa) {
    throw new Error("Contributor has no UPI ID on file.");
  }

  const admin = createAdminClient();
  let contactId = contributor.razorpay_contact_id;

  if (!contactId) {
    const contact = await createRazorpayXContact({
      name: contributor.display_name ?? contributor.email ?? "Contributor",
      email: contributor.email ?? `contributor+${contributorId.slice(0, 8)}@syftin.io`,
      referenceId: contributorId,
    });
    contactId = contact.id;
    await admin
      .from("contributors")
      .update({
        razorpay_contact_id: contactId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contributorId);
  }

  const fundAccount = await createRazorpayXFundAccountVpa({
    contactId,
    vpa: contributor.upi_vpa,
  });

  await admin
    .from("contributors")
    .update({
      razorpay_fund_account_id: fundAccount.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contributorId);

  return fundAccount.id;
}

/** Manual approval when RazorpayX is not configured */
export async function approvePayoutManual(
  payoutId: string,
  providerRef?: string,
): Promise<void> {
  const admin = createAdminClient();
  const payout = await getPayoutById(payoutId);
  if (!payout) throw new Error("Payout not found.");
  if (payout.status !== "pending") throw new Error("Payout is not pending.");

  const now = new Date().toISOString();
  const { error } = await admin
    .from("payout_events")
    .update({
      status: "approved",
      provider_ref: providerRef ?? `manual-${Date.now()}`,
      updated_at: now,
    })
    .eq("id", payoutId);

  if (error) throw new Error(error.message);

  await admin
    .from("contributors")
    .update({ balance_paise: 0, updated_at: now })
    .eq("id", payout.contributor_id);
}

/** Submit UPI payout via RazorpayX */
export async function disbursePayoutViaRazorpayX(payoutId: string): Promise<{
  payoutId: string;
  razorpayPayoutId: string;
  status: string;
}> {
  if (!isRazorpayXConfigured()) {
    throw new Error("RazorpayX is not configured.");
  }

  const admin = createAdminClient();
  const { data: row, error: fetchError } = await admin
    .from("payout_events")
    .select(PAYOUT_SELECT)
    .eq("id", payoutId)
    .single();

  if (fetchError || !row) throw new Error("Payout not found.");

  const payout = mapPayoutRow(row as Parameters<typeof mapPayoutRow>[0]);
  if (payout.status !== "pending") {
    throw new Error("Payout is not pending.");
  }

  const disbursePaise =
    Number((row as { net_amount_paise?: number | null }).net_amount_paise) ||
    Math.max(payout.amount_paise - 200, 0);

  const contributorRaw = row.contributors as ContributorRow | ContributorRow[];
  const contributor = Array.isArray(contributorRaw)
    ? contributorRaw[0]
    : contributorRaw;

  if (!contributor?.upi_vpa) {
    throw new Error("Contributor must add a UPI ID before payout.");
  }

  const fundAccountId = await ensureContributorFundAccount(
    payout.contributor_id,
    contributor,
  );

  const rzPayout = await createRazorpayXUpiPayout({
    fundAccountId,
    amountPaise: disbursePaise,
    referenceId: payout.id,
    narration: "Syftin earnings",
  });

  const now = new Date().toISOString();

  const { error: updateError } = await admin
    .from("payout_events")
    .update({
      status: "processing",
      provider_ref: rzPayout.id,
      updated_at: now,
    })
    .eq("id", payoutId)
    .eq("status", "pending");

  if (updateError) throw new Error(updateError.message);

  await admin
    .from("contributors")
    .update({ balance_paise: 0, updated_at: now })
    .eq("id", payout.contributor_id);

  return {
    payoutId,
    razorpayPayoutId: rzPayout.id,
    status: rzPayout.status,
  };
}

export async function handleRazorpayXPayoutWebhook(input: {
  event: string;
  payoutId: string;
  referenceId?: string | null;
  failureReason?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const payout =
    (input.referenceId ? await getPayoutById(input.referenceId) : null) ??
    (await findPayoutByProviderRef(input.payoutId));

  if (!payout) return;

  const now = new Date().toISOString();

  if (input.event === "payout.processed") {
    await admin
      .from("payout_events")
      .update({
        status: "completed",
        provider_ref: input.payoutId,
        updated_at: now,
      })
      .eq("id", payout.id);
    return;
  }

  if (input.event === "payout.failed" || input.event === "payout.reversed") {
    await admin
      .from("payout_events")
      .update({
        status: "failed",
        failure_reason: input.failureReason ?? input.event,
        updated_at: now,
      })
      .eq("id", payout.id);

    const { data: contributor } = await admin
      .from("contributors")
      .select("balance_paise")
      .eq("id", payout.contributor_id)
      .single();

    const current = Number(contributor?.balance_paise ?? 0);
    await admin
      .from("contributors")
      .update({
        balance_paise: current + payout.amount_paise,
        updated_at: now,
      })
      .eq("id", payout.contributor_id);
  }
}

async function findPayoutByProviderRef(
  providerRef: string,
): Promise<PayoutEvent | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payout_events")
    .select(PAYOUT_SELECT)
    .eq("provider_ref", providerRef)
    .maybeSingle();

  if (error || !data) return null;
  return mapPayoutRow(data as Parameters<typeof mapPayoutRow>[0]);
}

/** @deprecated Use approvePayoutManual or disbursePayoutViaRazorpayX */
export async function approvePayout(
  payoutId: string,
  providerRef?: string,
): Promise<void> {
  if (isRazorpayXConfigured()) {
    await disbursePayoutViaRazorpayX(payoutId);
    return;
  }
  await approvePayoutManual(payoutId, providerRef);
}

export type AutoPayoutResult = {
  attempted: number;
  succeeded: number;
  errors: { payoutId: string; message: string }[];
};

/** Disburse all pending payouts when RazorpayX is configured (env-gated in callers). */
export async function processPendingPayoutsAuto(): Promise<AutoPayoutResult> {
  const result: AutoPayoutResult = {
    attempted: 0,
    succeeded: 0,
    errors: [],
  };

  if (!isRazorpayXConfigured()) return result;

  const pending = await listPendingPayouts();
  for (const payout of pending) {
    result.attempted++;
    try {
      await disbursePayoutViaRazorpayX(payout.id);
      result.succeeded++;
    } catch (err) {
      result.errors.push({
        payoutId: payout.id,
        message: err instanceof Error ? err.message : "Payout failed",
      });
    }
  }

  return result;
}
