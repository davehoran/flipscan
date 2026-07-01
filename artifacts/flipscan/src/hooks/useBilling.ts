import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

export type SubscriptionStatus = "free" | "trialing" | "active" | "expired" | "canceled";

export interface BillingStatus {
  status: SubscriptionStatus;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  paymentWarning: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useBilling() {
  const { isSignedIn } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    fetch(`${BASE}/api/billing/status`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setBilling(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  const isProAccess = billing?.status === "trialing" || billing?.status === "active";
  const daysLeftInTrial = billing?.trialEnd
    ? Math.max(0, Math.ceil((new Date(billing.trialEnd).getTime() - Date.now()) / 86400000))
    : null;

  async function startCheckout(plan: "monthly" | "annual" = "monthly") {
    const res = await fetch(`${BASE}/api/billing/checkout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  async function openPortal() {
    const res = await fetch(`${BASE}/api/billing/portal`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return { billing, loading, isProAccess, daysLeftInTrial, startCheckout, openPortal };
}
