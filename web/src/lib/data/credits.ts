import { createAdminClient } from "@/lib/supabase/admin";
import {
  type ComputeTier,
  minFetchTierFromLegalNotes,
  requiredTierForDomain,
  tierRank,
} from "@/lib/contributor/fetch-tier";
import { getDomainBenchmarkEntry } from "@/lib/data/benchmarks";
import { computeFetchRewardPaise } from "@/lib/contributor/economics";
import { readSyftinEconomics } from "@/lib/pricing/read-syftin-economics";
import { getWhitelistEntryForDomain } from "@/lib/data/domains";
import { createClient } from "@/lib/supabase/server";
import { getSessionOrg, type SessionOrg } from "@/lib/auth/org";
import {
  DEFAULT_JOB_COST_CENTS,
  DEMO_ORG_ID,
  isAuthRequired,
  isPhase2Enabled,
  isSupabaseConfigured,
} from "@/lib/env";

export type CreditTransaction = {
  id: string;
  amount_cents: number;
  kind: string;
  description: string | null;
  created_at: string;
};

declare global {
  var __syftinMockCredits: CreditTransaction[] | undefined;
  var __syftinMockBalanceCents: number | undefined;
}

function mockBalance(): number {
  if (global.__syftinMockBalanceCents === undefined) {
    global.__syftinMockBalanceCents = 500_000;
  }
  return global.__syftinMockBalanceCents;
}

function mockTransactions(): CreditTransaction[] {
  if (!global.__syftinMockCredits) {
    global.__syftinMockCredits = [
      {
        id: "tx1",
        amount_cents: 500_000,
        kind: "deposit",
        description: "Pilot credit grant",
        created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      },
    ];
  }
  return global.__syftinMockCredits;
}

async function resolveOrg(org?: SessionOrg): Promise<SessionOrg> {
  if (org) return org;
  const sessionOrg = await getSessionOrg();
  if (!sessionOrg) throw new Error("No workspace found.");
  return sessionOrg;
}

export async function getCreditBalance(org?: SessionOrg): Promise<number> {
  if (!isSupabaseConfigured()) return mockBalance();

  const workspace = await resolveOrg(org);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("credit_balance_cents")
    .eq("id", workspace.orgId)
    .single();

  if (error || !data) return 0;
  return Number(data.credit_balance_cents ?? 0);
}

export async function listCreditTransactions(
  org?: SessionOrg,
): Promise<CreditTransaction[]> {
  if (!isSupabaseConfigured()) return mockTransactions();

  const workspace = await resolveOrg(org);
  const supabase = isAuthRequired()
    ? await createClient()
    : createAdminClient();

  const { data, error } = await supabase
    .from("credit_transactions")
    .select("id, amount_cents, kind, description, created_at")
    .eq("organization_id", workspace.orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    amount_cents: Number(row.amount_cents),
  })) as CreditTransaction[];
}

export function isCreditsEnforced(): boolean {
  return (
    isPhase2Enabled() &&
    process.env.NEXT_PUBLIC_ENFORCE_CREDITS === "true"
  );
}

async function incrementOrgBalance(
  orgId: string,
  amountCents: number,
): Promise<void> {
  const admin = createAdminClient();
  const { error: updateError } = await admin.rpc("increment_credit_balance", {
    org_id: orgId,
    amount_cents: amountCents,
  });

  if (updateError) {
    const { data: org } = await admin
      .from("organizations")
      .select("credit_balance_cents")
      .eq("id", orgId)
      .single();
    if (org) {
      await admin
        .from("organizations")
        .update({
          credit_balance_cents: Number(org.credit_balance_cents) + amountCents,
        })
        .eq("id", orgId);
    }
  }
}

async function getChargePaise(referenceId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_transactions")
    .select("amount_cents")
    .eq("reference_id", referenceId)
    .eq("kind", "job_charge")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return 0;
  return Math.abs(Number(data.amount_cents));
}

async function getRefundedPaise(referenceId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_transactions")
    .select("amount_cents")
    .eq("reference_id", referenceId)
    .eq("kind", "refund");

  return (data ?? []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.amount_cents)),
    0,
  );
}

/** Idempotent refund capped at remaining charge for a reference. */
export async function creditRefund(
  orgId: string,
  referenceId: string,
  refundPaise: number,
  description: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isCreditsEnforced() || !isSupabaseConfigured() || refundPaise <= 0) {
    return { ok: true };
  }

  const chargePaise = await getChargePaise(referenceId);
  const alreadyRefunded = await getRefundedPaise(referenceId);
  const maxRefundable = Math.max(0, chargePaise - alreadyRefunded);
  const amount = Math.min(Math.round(refundPaise), maxRefundable);
  if (amount <= 0) return { ok: true };

  const admin = createAdminClient();
  const { error: txError } = await admin.from("credit_transactions").insert({
    organization_id: orgId,
    amount_cents: amount,
    kind: "refund",
    description,
    reference_id: referenceId,
  });

  if (txError) return { ok: false, error: txError.message };

  await incrementOrgBalance(orgId, amount);
  return { ok: true };
}

/** Partial refund when a buyer cancels before delivery completes. */
export async function refundCancelledJob(
  orgId: string,
  jobId: string,
  input: {
    recordCount: number | null;
    exampleSchema: Record<string, unknown> | null;
  },
): Promise<void> {
  if (!isCreditsEnforced() || !isSupabaseConfigured()) return;

  const chargePaise = await getChargePaise(jobId);
  if (chargePaise <= 0) return;

  const syftin = input.exampleSchema?._syftin;
  const effectiveMax =
    syftin &&
    typeof syftin === "object" &&
    !Array.isArray(syftin)
      ? Number((syftin as Record<string, unknown>).effective_max_records) || 500
      : 500;

  const recordsDelivered = Number(input.recordCount ?? 0);
  let deliveredFraction = 0;

  if (recordsDelivered > 0 && effectiveMax > 0) {
    deliveredFraction = Math.min(1, recordsDelivered / effectiveMax);
  } else {
    const admin = createAdminClient();
    const { data: tasks } = await admin
      .from("fetch_tasks")
      .select("status")
      .eq("job_id", jobId);

    const total = tasks?.length ?? 0;
    const completed =
      tasks?.filter((t) => t.status === "completed").length ?? 0;
    if (total > 0) {
      deliveredFraction = Math.min(1, completed / total);
    }
  }

  const deliveredPaise = Math.round(chargePaise * deliveredFraction);
  const refundPaise = Math.max(0, chargePaise - deliveredPaise);

  await creditRefund(
    orgId,
    jobId,
    refundPaise,
    deliveredFraction > 0
      ? `Partial refund for cancelled job (${Math.round(deliveredFraction * 100)}% delivered)`
      : "Full refund for cancelled job",
  );
}

/** Partial refund when a completed job under-delivered vs effective target. */
export async function refundUnderDeliveredJob(
  orgId: string,
  jobId: string,
  input: {
    recordCount: number | null;
    exampleSchema: Record<string, unknown> | null;
  },
): Promise<{ refundedPaise: number } | { ok: false; error: string }> {
  if (!isCreditsEnforced() || !isSupabaseConfigured()) {
    return { refundedPaise: 0 };
  }

  const chargePaise = await getChargePaise(jobId);
  if (chargePaise <= 0) return { refundedPaise: 0 };

  const syftin = input.exampleSchema?._syftin;
  const effectiveMax =
    syftin &&
    typeof syftin === "object" &&
    !Array.isArray(syftin)
      ? Number((syftin as Record<string, unknown>).effective_max_records) || 500
      : 500;

  const recordsDelivered = Number(input.recordCount ?? 0);
  if (effectiveMax <= 0 || recordsDelivered >= effectiveMax * 0.8) {
    return { refundedPaise: 0 };
  }

  const deliveredFraction = Math.min(1, recordsDelivered / effectiveMax);
  const deliveredPaise = Math.round(chargePaise * deliveredFraction);
  const refundPaise = Math.max(0, chargePaise - deliveredPaise);

  if (refundPaise <= 0) return { refundedPaise: 0 };

  const result = await creditRefund(
    orgId,
    jobId,
    refundPaise,
    `Partial refund — ${recordsDelivered}/${effectiveMax} rows delivered`,
  );
  if (!result.ok) return result;
  return { refundedPaise: refundPaise };
}

export async function chargeJobCredits(
  orgId: string,
  jobId: string,
  amountCents = DEFAULT_JOB_COST_CENTS,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isCreditsEnforced() || !isSupabaseConfigured()) {
    return { ok: true };
  }

  const admin = createAdminClient();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("credit_balance_cents")
    .eq("id", orgId)
    .single();

  if (orgError || !org) return { ok: false, error: "Workspace not found." };

  const balance = Number(org.credit_balance_cents ?? 0);
  if (balance < amountCents) {
    return {
      ok: false,
      error: `Insufficient credits. This job costs ₹${(amountCents / 100).toFixed(0)}; balance is ₹${(balance / 100).toFixed(0)}.`,
    };
  }

  const { error: txError } = await admin.from("credit_transactions").insert({
    organization_id: orgId,
    amount_cents: -amountCents,
    kind: "job_charge",
    description: "Extraction job",
    reference_id: jobId,
  });

  if (txError) return { ok: false, error: txError.message };

  const { error: updateError } = await admin
    .from("organizations")
    .update({ credit_balance_cents: balance - amountCents })
    .eq("id", orgId);

  if (updateError) return { ok: false, error: updateError.message };

  const { maybeDispatchCreditLowEvent } = await import("@/lib/data/credit-alerts");
  await maybeDispatchCreditLowEvent(orgId);

  return { ok: true };
}

export async function chargeBatchCredits(
  orgId: string,
  batchId: string,
  amountCents: number,
  shardCount: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isCreditsEnforced() || !isSupabaseConfigured()) {
    return { ok: true };
  }

  const admin = createAdminClient();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("credit_balance_cents")
    .eq("id", orgId)
    .single();

  if (orgError || !org) return { ok: false, error: "Workspace not found." };

  const balance = Number(org.credit_balance_cents ?? 0);
  if (balance < amountCents) {
    return {
      ok: false,
      error: `Insufficient credits. This batch costs ₹${(amountCents / 100).toFixed(0)}; balance is ₹${(balance / 100).toFixed(0)}.`,
    };
  }

  const { error: txError } = await admin.from("credit_transactions").insert({
    organization_id: orgId,
    amount_cents: -amountCents,
    kind: "job_charge",
    description: `Batch extraction (${shardCount} URLs)`,
    reference_id: batchId,
  });

  if (txError) return { ok: false, error: txError.message };

  const { error: updateError } = await admin
    .from("organizations")
    .update({ credit_balance_cents: balance - amountCents })
    .eq("id", orgId);

  if (updateError) return { ok: false, error: updateError.message };

  const { maybeDispatchCreditLowEvent } = await import("@/lib/data/credit-alerts");
  await maybeDispatchCreditLowEvent(orgId);

  return { ok: true };
}

export async function refundFailedShards(
  orgId: string,
  batchId: string,
  failedCount: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isCreditsEnforced() || !isSupabaseConfigured() || failedCount <= 0) {
    return { ok: true };
  }

  // Refund proportional share for failed shards on budget-priced batches.
  const admin = createAdminClient();
  const { data: batch, error: batchError } = await admin
    .from("job_batches")
    .select("batch_pricing, total_shards, example_schema")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    return { ok: true };
  }

  const meta = (batch.example_schema as { _syftin?: { budget_cents?: number } })?._syftin;
  const batchBudgetCents = meta?.budget_cents;
  const perShardRefund =
    batchBudgetCents && batch.total_shards > 0
      ? Math.round(batchBudgetCents / batch.total_shards)
      : DEFAULT_JOB_COST_CENTS;
  const refundAmount = perShardRefund * failedCount;

  return creditRefund(
    orgId,
    batchId,
    refundAmount,
    `Refund for ${failedCount} failed shards in batch`,
  );
}

export async function addDemoCredits(
  org?: SessionOrg,
  amountCents = 50_000,
): Promise<number> {
  if (!isSupabaseConfigured()) {
    const next = mockBalance() + amountCents;
    global.__syftinMockBalanceCents = next;
    mockTransactions().unshift({
      id: `tx_${Date.now()}`,
      amount_cents: amountCents,
      kind: "deposit",
      description: "Demo top-up",
      created_at: new Date().toISOString(),
    });
    return next;
  }

  const workspace = await resolveOrg(org);
  const admin = createAdminClient();
  const balance = await getCreditBalance(workspace);
  const next = balance + amountCents;

  await admin.from("credit_transactions").insert({
    organization_id: workspace.orgId,
    amount_cents: amountCents,
    kind: "deposit",
    description: "Credit top-up",
  });

  await admin
    .from("organizations")
    .update({ credit_balance_cents: next })
    .eq("id", workspace.orgId);

  return next;
}

export async function createFetchTaskForJob(
  jobId: string,
  targetUrl: string,
  domain: string,
  jobComputeTier?: string,
  requiredRegion?: string,
  exampleSchema?: Record<string, unknown>,
): Promise<void> {
  if (!isPhase2Enabled() || !isSupabaseConfigured()) return;

  let requiredTier = (jobComputeTier ??
    requiredTierForDomain(domain)) as ComputeTier;

  const whitelistEntry = await getWhitelistEntryForDomain(domain);
  const notesTier = minFetchTierFromLegalNotes(whitelistEntry?.legal_notes);
  if (notesTier && tierRank(notesTier) > tierRank(requiredTier)) {
    requiredTier = notesTier;
  }

  const benchEntry = await getDomainBenchmarkEntry(domain);
  if (
    benchEntry?.fetchMethod &&
    benchEntry.fetchMethod !== "http" &&
    benchEntry.fetchMethod !== "static" &&
    tierRank("ranger") > tierRank(requiredTier)
  ) {
    requiredTier = "ranger";
  }

  const economicsCtx = readSyftinEconomics(
    exampleSchema,
    domain,
    whitelistEntry,
  );
  const rewardCtx = {
    domain,
    domainBaseFeePaise: economicsCtx.domainBaseFeePaise,
    effectiveRecords: economicsCtx.effectiveRecords,
    grossRevenuePaise: economicsCtx.grossRevenuePaise,
    workerPayoutCeilingPaise: economicsCtx.workerPayoutCeilingPaise,
    expectedFetchTasks: economicsCtx.expectedFetchTasks,
  };
  const rewardPaise = computeFetchRewardPaise(requiredTier, false, rewardCtx);
  const requiresConsensus = economicsCtx.requiresConsensus;

  const admin = createAdminClient();

  const { data: jobRow } = await admin
    .from("jobs")
    .select("priority")
    .eq("id", jobId)
    .maybeSingle();
  const priority = (jobRow?.priority as number | undefined) ?? 0;

  if (requiresConsensus) {
    const groupId = crypto.randomUUID();
    await admin.from("fetch_tasks").insert([
      {
        job_id: jobId,
        target_url: targetUrl,
        domain,
        status: "pending",
        page_index: 0,
        reward_paise: rewardPaise,
        required_tier: requiredTier,
        consensus_group_id: groupId,
        required_region: requiredRegion ?? null,
        priority,
      },
      {
        job_id: jobId,
        target_url: targetUrl,
        domain,
        status: "pending",
        page_index: 0,
        reward_paise: rewardPaise,
        required_tier: requiredTier,
        consensus_group_id: groupId,
        required_region: requiredRegion ?? null,
        priority,
      },
    ]);
  } else {
    await admin.from("fetch_tasks").insert({
      job_id: jobId,
      target_url: targetUrl,
      domain,
      status: "pending",
      page_index: 0,
      reward_paise: rewardPaise,
      required_tier: requiredTier,
      required_region: requiredRegion ?? null,
      priority,
    });
  }
}

export { DEMO_ORG_ID };
