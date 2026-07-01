import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useBilling } from "../hooks/useBilling";

export default function UpgradePage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(false);
  const { billing, daysLeftInTrial, startCheckout, loading: billingLoading } = useBilling();
  const [, setLocation] = useLocation();

  // Handle ?success=true redirect
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("success=true")) {
      setTimeout(() => setLocation("/scan"), 2500);
    }
  }, [setLocation]);

  const isSuccess = typeof window !== "undefined" && window.location.search.includes("success=true");

  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] bg-[#080810] text-white flex flex-col items-center justify-center px-[24px] text-center">
        <div className="text-[64px] mb-[16px]">🎉</div>
        <h1 className="font-black text-[26px] tracking-[-0.8px] mb-[8px]">You're on Pro!</h1>
        <p className="text-[#AEAEB2] text-[15px]">Redirecting you to the scanner…</p>
      </div>
    );
  }

  if (billingLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#080810] flex items-center justify-center">
        <div className="w-[32px] h-[32px] border-[3px] border-[#007AFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const status = billing?.status ?? "free";
  const isExpired = status === "expired";
  const isCanceled = status === "canceled";
  const isTrialing = status === "trialing";

  const ctaLabel = isExpired || isCanceled
    ? `Subscribe — ${annual ? "$74.99/year" : "$7.99/month"}`
    : `Start Free Trial — ${annual ? "$74.99/year" : "$7.99/month after 7 days"}`;

  async function handleCheckout() {
    setLoading(true);
    await startCheckout(annual ? "annual" : "monthly");
    setLoading(false);
  }

  return (
    <div className="min-h-[100dvh] bg-[#080810] text-white">
      {/* Header */}
      <div className="flex items-center px-[16px] pt-[12px] pb-[10px]">
        <Link href="/scan" className="w-[34px] h-[34px] rounded-full bg-white/10 flex items-center justify-center">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L2 7.5l5.5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <div className="flex-1 text-center font-bold text-[17px] tracking-[-0.3px]">Upgrade to Pro</div>
        <div className="w-[34px]" />
      </div>

      <div className="px-[20px] pb-[40px]">
        {/* Status banners */}
        {isTrialing && daysLeftInTrial !== null && (
          <div className="bg-[#007AFF]/15 border border-[#007AFF]/30 rounded-[12px] px-[16px] py-[12px] mb-[20px] text-center">
            <span className="text-[#5BA3FF] font-semibold text-[14px]">
              ⏳ {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} left in your free trial
            </span>
          </div>
        )}
        {isExpired && (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-[12px] px-[16px] py-[12px] mb-[20px] text-center">
            <span className="text-[#FF6B6B] font-semibold text-[14px]">
              Your free trial has ended — subscribe to continue
            </span>
          </div>
        )}
        {isCanceled && (
          <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-[12px] px-[16px] py-[12px] mb-[20px] text-center">
            <span className="text-[#FFB340] font-semibold text-[14px]">
              Your subscription has ended — resubscribe to regain Pro access
            </span>
          </div>
        )}

        {/* Hero */}
        <div className="text-center pt-[8px] pb-[24px]">
          <h1 className="font-black text-[26px] tracking-[-0.8px] mb-[8px]">Scan Flip Pro</h1>
          <p className="text-[#AEAEB2] text-[14px]">Unlimited scans. Save your best finds.</p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-[10px] mb-[20px]">
          <span className={`text-[14px] font-medium ${!annual ? "text-white" : "text-[#AEAEB2]"}`}>Monthly</span>
          <button
            onClick={() => setAnnual((a) => !a)}
            className={`relative w-[48px] h-[28px] rounded-full transition-colors ${annual ? "bg-[#007AFF]" : "bg-[#3a3a4c]"}`}
          >
            <span className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow transition-transform ${annual ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
          </button>
          <span className={`text-[14px] font-medium ${annual ? "text-white" : "text-[#AEAEB2]"}`}>
            Annual <span className="text-[#34C759] text-[11px] font-bold">-22%</span>
          </span>
        </div>

        {/* Price */}
        <div className="text-center mb-[24px]">
          <div className="flex items-baseline justify-center gap-[6px]">
            <span className="text-[42px] font-black tracking-[-1.5px]">{annual ? "$74.99" : "$7.99"}</span>
            <span className="text-[#AEAEB2] text-[16px]">/{annual ? "year" : "month"}</span>
          </div>
          {annual && <p className="text-[#34C759] text-[13px] font-semibold mt-[2px]">$6.25/mo — save 22%</p>}
        </div>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-[16px] rounded-[14px] bg-[#007AFF] hover:bg-[#0051CC] text-white font-bold text-[16px] mb-[10px] transition-colors disabled:opacity-60"
        >
          {loading ? "Redirecting…" : ctaLabel}
        </button>
        <p className="text-center text-[11px] text-[#636366] mb-[28px]">
          {isExpired || isCanceled
            ? "Cancel anytime from account settings"
            : "No credit card required for trial · Cancel anytime"}
        </p>

        {/* Feature list */}
        <div className="bg-[#12121d] border border-[#2a2a3c] rounded-[20px] p-[20px]">
          <div className="font-semibold text-[14px] text-[#AEAEB2] uppercase tracking-[0.5px] mb-[14px]">What's included</div>
          <div className="flex flex-col gap-[12px]">
            {[
              "Unlimited scans",
              "Save & bookmark items",
              "Full saved items history",
              "Sell-through rate analysis",
              "Flip margin estimation",
              "Live eBay active & sold data",
            ].map((f) => (
              <div key={f} className="flex items-center gap-[10px]">
                <div className="w-[20px] h-[20px] rounded-full bg-[#34C759]/15 flex items-center justify-center shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="#34C759" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[14px] text-white">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
