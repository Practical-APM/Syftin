import {
  getCreditBalance,
  listCreditTransactions,
} from "@/lib/data/credits";
import { CreditsPanel } from "@/components/dashboard/credits-panel";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { createClient } from "@/lib/supabase/server";

export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [balance, transactions] = await Promise.all([
    getCreditBalance(),
    listCreditTransactions(),
  ]);

  return (
    <CreditsPanel
      initialBalance={balance}
      initialTransactions={transactions}
      razorpayEnabled={isRazorpayConfigured()}
      defaultEmail={user?.email ?? undefined}
    />
  );
}
