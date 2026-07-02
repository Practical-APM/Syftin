import {
  getCreditBalance,
  listCreditTransactions,
} from "@/lib/data/credits";
import { CreditsPanel } from "@/components/dashboard/credits-panel";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

export default async function CreditsPage() {
  const [balance, transactions] = await Promise.all([
    getCreditBalance(),
    listCreditTransactions(),
  ]);

  return (
    <CreditsPanel
      initialBalance={balance}
      initialTransactions={transactions}
      razorpayEnabled={isRazorpayConfigured()}
    />
  );
}
