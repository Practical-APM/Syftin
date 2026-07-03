"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreditPackId } from "@/lib/payments/razorpay-config";
import type { PaymentMethod } from "@/lib/payments/payment-surcharge";

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error: { description: string } }) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckoutInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Script load failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

type OrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  packLabel: string;
  orgName: string;
  customerEmail?: string;
  surchargePaise?: number;
  creditPaise?: number;
};

export function useRazorpayCheckout(onSuccess: () => void) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (packId: CreditPackId, paymentMethod: PaymentMethod = "upi") => {
      setPaying(true);
      setError(null);

      try {
        await loadRazorpayScript();
        if (!window.Razorpay) {
          throw new Error("Razorpay checkout unavailable.");
        }

        const orderRes = await fetch("/api/payments/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId, paymentMethod }),
        });
        const orderData = (await orderRes.json()) as OrderResponse & {
          error?: string;
        };
        if (!orderRes.ok) {
          throw new Error(orderData.error ?? "Could not start payment.");
        }

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay!({
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Syftin",
            description: `${orderData.packLabel} credit pack`,
            order_id: orderData.orderId,
            prefill: {
              name: orderData.orgName,
              email: orderData.customerEmail,
            },
            theme: { color: "#D4A012" },
            handler: async (response: RazorpayHandlerResponse) => {
              try {
                const verifyRes = await fetch("/api/payments/razorpay/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                });
                const verifyData = await verifyRes.json().catch(() => ({}));
                if (!verifyRes.ok) {
                  throw new Error(
                    (verifyData as { error?: string }).error ??
                      "Payment verification failed.",
                  );
                }
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => reject(new Error("Payment cancelled.")),
            },
          });

          rzp.on("payment.failed", (response) => {
            reject(
              new Error(
                response.error?.description ?? "Payment failed. Try again.",
              ),
            );
          });

          rzp.open();
        });

        onSuccess();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Payment could not complete.";
        if (message !== "Payment cancelled.") {
          setError(message);
        }
      } finally {
        setPaying(false);
      }
    },
    [onSuccess],
  );

  return { startCheckout, paying, error, setError };
}
