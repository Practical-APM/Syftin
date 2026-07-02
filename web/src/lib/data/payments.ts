import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionOrg } from "@/lib/auth/org";
import { getCreditBalance } from "@/lib/data/credits";

export type RazorpayOrderRow = {
  id: string;
  organization_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  receipt: string;
  created_at: string;
  paid_at: string | null;
};

export async function insertRazorpayOrder(
  orgId: string,
  input: {
    razorpayOrderId: string;
    amountCents: number;
    receipt: string;
  },
): Promise<RazorpayOrderRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("razorpay_orders")
    .insert({
      organization_id: orgId,
      razorpay_order_id: input.razorpayOrderId,
      amount_cents: input.amountCents,
      receipt: input.receipt,
      status: "created",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save payment order.");
  }

  return data as RazorpayOrderRow;
}

export async function getRazorpayOrderByRazorpayId(
  razorpayOrderId: string,
): Promise<RazorpayOrderRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("razorpay_orders")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (error || !data) return null;
  return data as RazorpayOrderRow;
}

export async function fulfillRazorpayPayment(input: {
  org: SessionOrg;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<
  | { ok: true; balance: number; alreadyFulfilled?: boolean }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const order = await getRazorpayOrderByRazorpayId(input.razorpayOrderId);

  if (!order) {
    return { ok: false, error: "Payment order not found." };
  }

  if (order.organization_id !== input.org.orgId) {
    return { ok: false, error: "Order does not belong to this workspace." };
  }

  if (order.status === "paid") {
    const balance = await getCreditBalance(input.org);
    return { ok: true, balance, alreadyFulfilled: true };
  }

  const { data: existingTx } = await admin
    .from("credit_transactions")
    .select("id")
    .eq("reference_id", input.razorpayPaymentId)
    .eq("kind", "deposit")
    .maybeSingle();

  if (existingTx) {
    const balance = await getCreditBalance(input.org);
    return { ok: true, balance, alreadyFulfilled: true };
  }

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("credit_balance_cents")
    .eq("id", input.org.orgId)
    .single();

  if (orgError || !org) {
    return { ok: false, error: "Workspace not found." };
  }

  const balance = Number(org.credit_balance_cents ?? 0);
  const next = balance + order.amount_cents;
  const now = new Date().toISOString();

  const { error: txError } = await admin.from("credit_transactions").insert({
    organization_id: input.org.orgId,
    amount_cents: order.amount_cents,
    kind: "deposit",
    description: "Razorpay credit top-up",
    reference_id: input.razorpayPaymentId,
  });

  if (txError) {
    if (txError.code === "23505") {
      const current = await getCreditBalance(input.org);
      return { ok: true, balance: current, alreadyFulfilled: true };
    }
    return { ok: false, error: txError.message };
  }

  const { error: orgUpdateError } = await admin
    .from("organizations")
    .update({ credit_balance_cents: next })
    .eq("id", input.org.orgId);

  if (orgUpdateError) {
    return { ok: false, error: orgUpdateError.message };
  }

  await admin
    .from("razorpay_orders")
    .update({
      status: "paid",
      razorpay_payment_id: input.razorpayPaymentId,
      paid_at: now,
    })
    .eq("razorpay_order_id", input.razorpayOrderId);

  return { ok: true, balance: next };
}

/** Webhook path — resolve org from stored order row */
export async function fulfillRazorpayPaymentByOrderId(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await getRazorpayOrderByRazorpayId(input.razorpayOrderId);
  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  const result = await fulfillRazorpayPayment({
    org: {
      orgId: order.organization_id,
      orgName: "",
      dpaSignedAt: null,
      role: "owner",
    },
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
  });

  if (!result.ok) return result;
  return { ok: true };
}
