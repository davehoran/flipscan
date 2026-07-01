import { Link } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { useBilling } from "../hooks/useBilling";

export default function AccountPage() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { billing, daysLeftInTrial, openPortal, loading } = useBilling();

  const status = billing?.status ?? "free";
  const statusLabel: Record<string, string> = {
    free: "Free",
    trialing: "Pro Trial",
    active: "Pro",
    expired: "Trial Ended",
    canceled: "Canceled",
  };
  const statusColor: Record<string, string> = {
    free: "#636366",
    trialing: "#007AFF",
    active: "#34C759",
    expired: "#FF3B30",
    canceled: "#FF9500",
  };

  return (
    <div className="min-h-[100dvh] bg-[#F2F2F7] text-[#1C1C1E]">
      {/* Header */}
      <div className="bg-[#F2F2F7] pt-[12px] px-[16px] pb-[12px] flex items-center gap-[10px] border-b-[0.5px] border-black/[0.08] sticky top-0 z-20">
        <Link href="/scan" className="w-[34px] h-[34px] rounded-full bg-white border-none flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L2 7.5l5.5 6" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <div className="font-bold text-[17px] text-[#1C1C1E] flex-1 tracking-[-0.3px] text-center">Account</div>
        <div className="w-[34px]" />
      </div>

      <div className="px-[16px] pt-[20px] pb-[40px] flex flex-col gap-[14px]">
        {/* Profile */}
        <div className="bg-white rounded-[16px] p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-[12px]">
            {user?.imageUrl && (
              <img src={user.imageUrl} alt="" className="w-[44px] h-[44px] rounded-full" />
            )}
            <div>
              <div className="font-semibold text-[15px]">{user?.fullName ?? user?.firstName ?? "—"}</div>
              <div className="text-[13px] text-[#636366]">{user?.emailAddresses[0]?.emailAddress}</div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-[16px] py-[14px] border-b border-[#F2F2F7]">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[14px]">Current plan</span>
              {loading ? (
                <div className="w-[60px] h-[18px] bg-[#F2F2F7] rounded animate-pulse" />
              ) : (
                <span className="font-bold text-[14px]" style={{ color: statusColor[status] ?? "#636366" }}>
                  {statusLabel[status] ?? status}
                </span>
              )}
            </div>
            {status === "trialing" && daysLeftInTrial !== null && (
              <div className="text-[12px] text-[#636366] mt-[4px]">
                {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} left in trial
              </div>
            )}
          </div>

          {(status === "free" || status === "expired" || status === "canceled") && (
            <Link href="/upgrade">
              <div className="px-[16px] py-[14px] flex justify-between items-center border-b border-[#F2F2F7] active:bg-[#F2F2F7]">
                <span className="text-[#007AFF] font-semibold text-[14px]">
                  {status === "free" ? "Start Free Trial" : "Resubscribe to Pro"}
                </span>
                <Chevron />
              </div>
            </Link>
          )}

          {(status === "trialing" || status === "active") && (
            <button
              onClick={openPortal}
              className="w-full px-[16px] py-[14px] flex justify-between items-center border-b border-[#F2F2F7] active:bg-[#F2F2F7]"
            >
              <span className="font-medium text-[14px]">Manage Subscription</span>
              <Chevron />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <Link href="/refer">
            <div className="px-[16px] py-[14px] flex justify-between items-center border-b border-[#F2F2F7] active:bg-[#F2F2F7]">
              <div className="flex items-center gap-[10px]">
                <span className="text-[18px]">🎁</span>
                <span className="font-medium text-[14px]">Refer a Friend</span>
              </div>
              <Chevron />
            </div>
          </Link>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full px-[16px] py-[14px] flex items-center gap-[10px] active:bg-[#F2F2F7]"
          >
            <span className="text-[18px]">🚪</span>
            <span className="font-medium text-[14px] text-[#FF3B30]">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1l5 5-5 5" stroke="#C7C7CC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
