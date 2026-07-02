import { createAdminClient } from "@/lib/supabase/admin";
import {
  type ComputeTier,
  requiredTierForDomain,
} from "@/lib/contributor/fetch-tier";
import { computeFetchRewardPaise } from "@/lib/contributor/economics";
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
  return { ok: true };
}

export async function chargeBatchCredits(
  orgId: string,
  batchId: string,
  shardCount: number,
  pricingMode: string, // "per_shard" | "per_batch"
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isCreditsEnforced() || !isSupabaseConfigured()) {
    return { ok: true };
  }

  const amountCents =
    pricingMode === "per_batch"
      ? DEFAULT_JOB_COST_CENTS
      : DEFAULT_JOB_COST_CENTS * shardCount;

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

  // Only refund if pricing was per_shard. 
  const admin = createAdminClient();
  const { data: batch, error: batchError } = await admin
    .from("job_batches")
    .select("batch_pricing")
    .eq("id", batchId)
    .single();

  if (batchError || !batch || batch.batch_pricing !== "per_shard") {
    return { ok: true };
  }

  const refundAmount = DEFAULT_JOB_COST_CENTS * failedCount;

  const { error: txError } = await admin.from("credit_transactions").insert({
    organization_id: orgId,
    amount_cents: refundAmount,
    kind: "refund",
    description: `Refund for ${failedCount} failed shards in batch`,
    reference_id: batchId,
  });

  if (txError) return { ok: false, error: txError.message };

  const { error: updateError } = await admin
    .rpc('increment_credit_balance', {
       org_id: orgId,
       amount_cents: refundAmount
    });
    
  if (updateError) {
     // If RPC doesn't exist, fallback to read-modify-write
     const { data: org } = await admin.from("organizations").select("credit_balance_cents").eq("id", orgId).single();
     if (org) {
         await admin.from("organizations").update({ credit_balance_cents: Number(org.credit_balance_cents) + refundAmount }).eq("id", orgId);
     }
  }

  return { ok: true };
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
): Promise<void> {
  if (!isPhase2Enabled() || !isSupabaseConfigured()) return;

  const requiredTier = (jobComputeTier ??
    requiredTierForDomain(domain)) as ComputeTier;

  const isHighValue = ["amazon.com", "linkedin.com", "google.com"].includes(domain.toLowerCase());

  const admin = createAdminClient();
  
  if (isHighValue) {
    const groupId = crypto.randomUUID();
    await admin.from("fetch_tasks").insert([
      {
        job_id: jobId,
        target_url: targetUrl,
        domain,
        status: "pending",
        reward_paise: computeFetchRewardPaise(requiredTier),
        required_tier: requiredTier,
        consensus_group_id: groupId,
        required_region: requiredRegion ?? null,
      },
      {
        job_id: jobId,
        target_url: targetUrl,
        domain,
        status: "pending",
        reward_paise: computeFetchRewardPaise(requiredTier),
        required_tier: requiredTier,
        consensus_group_id: groupId,
        required_region: requiredRegion ?? null,
      }
    ]);
  } else {
    await admin.from("fetch_tasks").insert({
      job_id: jobId,
      target_url: targetUrl,
      domain,
      status: "pending",
      reward_paise: computeFetchRewardPaise(requiredTier),
      required_tier: requiredTier,
      required_region: requiredRegion ?? null,
    });
  }
}

export { DEMO_ORG_ID };
