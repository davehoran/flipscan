import { useState } from "react";
import { Link } from "wouter";

const features = [
  { label: "Scans per day", free: "5 scans", pro: "Unlimited" },
  { label: "Save & bookmark items", free: false, pro: true },
  { label: "Saved items history", free: false, pro: true },
  { label: "Sell-through rate", free: true, pro: true },
  { label: "Flip analysis & margin %", free: true, pro: true },
  { label: "Live eBay pricing", free: true, pro: true },
  { label: "eBay listing link", free: true, pro: true },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-[#080810] text-white">
      {/* Header */}
      <div className="flex items-center px-[16px] pt-[12px] pb-[10px]">
        <Link href="/" className="w-[34px] h-[34px] rounded-full bg-white/10 flex items-center justify-center">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L2 7.5l5.5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <div className="flex-1 text-center font-bold text-[17px] tracking-[-0.3px]">Pricing</div>
        <div className="w-[34px]" />
      </div>

      <div className="px-[20px] pb-[40px]">
        {/* Hero */}
        <div className="text-center pt-[16px] pb-[28px]">
          <div className="inline-block bg-[#007AFF]/15 border border-[#007AFF]/30 rounded-full px-[14px] py-[6px] text-[#5BA3FF] text-[12px] font-semibold mb-[16px]">
            Try Pro free for 7 days — no credit card required
          </div>
          <h1 className="font-black text-[28px] tracking-[-1px] leading-tight mb-[8px]">
            Simple, honest pricing
          </h1>
          <p className="text-[#AEAEB2] text-[14px]">Start free. Upgrade when you're ready.</p>
        </div>

        {/* Monthly / Annual toggle */}
        <div className="flex items-center justify-center gap-[10px] mb-[24px]">
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

        {/* Cards */}
        <div className="flex flex-col gap-[14px]">
          {/* Free */}
          <div className="bg-[#12121d] border border-[#2a2a3c] rounded-[20px] p-[20px]">
            <div className="font-bold text-[18px] mb-[4px]">Free</div>
            <div className="text-[32px] font-black tracking-[-1px] mb-[16px]">$0</div>
            <Link href="/sign-up">
              <button className="w-full py-[13px] rounded-[12px] border border-[#3a3a4c] text-white font-semibold text-[15px] mb-[16px]">
                Get Started Free
              </button>
            </Link>
            <div className="flex flex-col gap-[10px]">
              {features.map((f) => (
                <div key={f.label} className="flex items-center gap-[10px]">
                  {typeof f.free === "boolean" ? (
                    f.free
                      ? <Check /> : <Cross />
                  ) : (
                    <Check />
                  )}
                  <span className="text-[14px] text-[#AEAEB2]">
                    {typeof f.free === "string" ? f.free : f.label}
                    {typeof f.free === "boolean" && !f.free && ` — ${f.label}`}
                    {typeof f.free === "boolean" && f.free && ` — ${f.label}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="bg-[#0a1628] border-2 border-[#007AFF] rounded-[20px] p-[20px] relative overflow-hidden">
            <div className="absolute top-[14px] right-[14px] bg-[#007AFF] rounded-full px-[10px] py-[3px] text-[11px] font-bold text-white">POPULAR</div>
            <div className="font-bold text-[18px] mb-[4px] text-[#007AFF]">Pro</div>
            <div className="flex items-baseline gap-[6px] mb-[4px]">
              <span className="text-[32px] font-black tracking-[-1px]">
                {annual ? "$74.99" : "$7.99"}
              </span>
              <span className="text-[#AEAEB2] text-[14px]">/{annual ? "year" : "month"}</span>
            </div>
            {annual && (
              <div className="text-[#34C759] text-[12px] font-semibold mb-[12px]">$6.25/mo — save 22%</div>
            )}
            <Link href="/sign-up">
              <button className="w-full py-[13px] rounded-[12px] bg-[#007AFF] hover:bg-[#0051CC] text-white font-bold text-[15px] mb-[16px] transition-colors">
                Start Free Trial
              </button>
            </Link>
            <p className="text-center text-[11px] text-[#AEAEB2] mb-[16px]">
              7 days free, then {annual ? "$74.99/year" : "$7.99/month"} — cancel anytime
            </p>
            <div className="flex flex-col gap-[10px]">
              {features.map((f) => (
                <div key={f.label} className="flex items-center gap-[10px]">
                  <Check />
                  <span className="text-[14px] text-white">
                    {typeof f.pro === "string" ? `${f.pro} — ${f.label}` : f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <div className="w-[20px] h-[20px] rounded-full bg-[#34C759]/15 flex items-center justify-center shrink-0">
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4l3 3 5-6" stroke="#34C759" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function Cross() {
  return (
    <div className="w-[20px] h-[20px] rounded-full bg-white/5 flex items-center justify-center shrink-0">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M1 1l6 6M7 1L1 7" stroke="#636366" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
