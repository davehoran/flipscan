import { useState } from "react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ReferPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "success" | "limit" | "error">("idle");
  const [code, setCode] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch(`${BASE}/api/referral/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendEmail: email, personalMessage: message || undefined }),
      });
      const data = await res.json();
      if (res.status === 429) { setState("limit"); return; }
      if (!res.ok) { setState("error"); return; }
      setCode(data.code ?? "");
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#F2F2F7] text-[#1C1C1E]">
      {/* Header */}
      <div className="bg-[#F2F2F7] pt-[12px] px-[16px] pb-[12px] flex items-center gap-[10px] border-b-[0.5px] border-black/[0.08] sticky top-0 z-20">
        <Link href="/scan" className="w-[34px] h-[34px] rounded-full bg-white border-none flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L2 7.5l5.5 6" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <div className="font-bold text-[17px] text-[#1C1C1E] flex-1 tracking-[-0.3px] text-center">Refer a Friend</div>
        <div className="w-[34px]" />
      </div>

      <div className="px-[20px] pt-[24px] pb-[40px]">
        {state === "success" ? (
          <div className="text-center pt-[32px]">
            <div className="text-[56px] mb-[16px]">🎉</div>
            <h2 className="font-bold text-[22px] tracking-[-0.5px] mb-[8px]">Invite sent!</h2>
            <p className="text-[#636366] text-[15px] mb-[24px]">
              Your friend will receive a code for <strong>one free month of Pro</strong>.
            </p>
            {code && (
              <div className="bg-white rounded-[16px] p-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-[24px]">
                <p className="text-[#636366] text-[12px] mb-[8px]">Their promo code</p>
                <div className="font-black text-[24px] tracking-[2px] text-[#007AFF]">{code}</div>
              </div>
            )}
            <button
              onClick={() => { setState("idle"); setEmail(""); setMessage(""); setCode(""); }}
              className="text-[#007AFF] font-semibold text-[15px]"
            >
              Send another invite
            </button>
          </div>
        ) : (
          <>
            <div className="bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-[16px] p-[16px] mb-[24px]">
              <p className="text-[#007AFF] font-semibold text-[14px]">
                🎁 Your friend gets <strong>one free month of Pro</strong> when they subscribe.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
              <div>
                <label className="block font-semibold text-[13px] text-[#1C1C1E] mb-[6px]">Friend's email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-[14px] py-[13px] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none focus:border-[#007AFF]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[13px] text-[#1C1C1E] mb-[6px]">
                  Personal message <span className="text-[#AEAEB2] font-normal">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hey, you should check out this app — I use it to find great flips on eBay!"
                  maxLength={500}
                  rows={3}
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-[14px] py-[13px] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none focus:border-[#007AFF] resize-none"
                />
              </div>

              {state === "limit" && (
                <p className="text-[#FF3B30] text-[13px] font-medium">You've reached the daily referral limit of 10.</p>
              )}
              {state === "error" && (
                <p className="text-[#FF3B30] text-[13px] font-medium">Something went wrong — please try again.</p>
              )}

              <button
                type="submit"
                disabled={state === "sending"}
                className="w-full py-[15px] rounded-[14px] bg-[#007AFF] text-white font-bold text-[16px] disabled:opacity-60"
              >
                {state === "sending" ? "Sending…" : "Send Invite"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
