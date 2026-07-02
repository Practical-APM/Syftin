import { isRazorpayConfigured, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { razorpayApi } from "@/lib/payments/razorpay-auth";

export function isRazorpayXConfigured(): boolean {
  return isRazorpayConfigured() && Boolean(process.env.RAZORPAYX_ACCOUNT_NUMBER);
}

function getRazorpayXAccountNumber(): string {
  const account = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!account) {
    throw new Error("RAZORPAYX_ACCOUNT_NUMBER is not configured.");
  }
  return account;
}

type ContactResponse = { id: string };
type FundAccountResponse = { id: string };
type PayoutResponse = {
  id: string;
  status: string;
  utr?: string | null;
};

export async function createRazorpayXContact(input: {
  name: string;
  email: string;
  referenceId: string;
}): Promise<ContactResponse> {
  return razorpayApi<ContactResponse>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.slice(0, 50),
      email: input.email,
      type: "vendor",
      reference_id: input.referenceId.slice(0, 40),
    }),
  });
}

export async function createRazorpayXFundAccountVpa(input: {
  contactId: string;
  vpa: string;
}): Promise<FundAccountResponse> {
  return razorpayApi<FundAccountResponse>("/fund_accounts", {
    method: "POST",
    body: JSON.stringify({
      contact_id: input.contactId,
      account_type: "vpa",
      vpa: { address: input.vpa },
    }),
  });
}

export async function createRazorpayXUpiPayout(input: {
  fundAccountId: string;
  amountPaise: number;
  referenceId: string;
  narration?: string;
}): Promise<PayoutResponse> {
  return razorpayApi<PayoutResponse>("/payouts", {
    method: "POST",
    body: JSON.stringify({
      account_number: getRazorpayXAccountNumber(),
      fund_account_id: input.fundAccountId,
      amount: input.amountPaise,
      currency: "INR",
      mode: "UPI",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: input.referenceId.slice(0, 40),
      narration: (input.narration ?? "Syftin contributor payout").slice(0, 30),
    }),
  });
}

export { verifyWebhookSignature as verifyRazorpayXWebhookSignature };
