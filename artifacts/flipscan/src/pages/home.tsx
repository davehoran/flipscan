import { Link } from "wouter";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 30% 0%,#1a1040 0%,#0d0d1a 55%)" }}>
      
      {/* Decorative background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(0,122,255,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(0,122,255,0.2) 1px,transparent 1px)", backgroundSize: "30px 30px" }}></div>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center text-center">
        {/* Brand Icon */}
        <div className="w-20 h-20 mb-8 rounded-3xl bg-[#007AFF] shadow-[0_8px_32px_rgba(0,122,255,0.4)] flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 200 200" fill="none">
            <path d="M50 70H60V60H50V70ZM140 60V70H150V60H140ZM150 130H140V140H150V130ZM60 140H50V130H60V140Z" fill="white"/>
            <path d="M70 50H130V60H70V50Z" fill="white"/>
            <path d="M70 140H130V150H70V140Z" fill="white"/>
            <path d="M50 70H60V130H50V70Z" fill="white"/>
            <path d="M140 70H150V130H140V70Z" fill="white"/>
            <path d="M85 85L115 115M115 85L85 115" stroke="white" strokeWidth="12" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="text-4xl font-black text-white tracking-[-1.5px] mb-3">Scan Flip</h1>
        <p className="text-[#8E8E93] text-lg font-medium tracking-tight mb-10 max-w-[280px]">
          Instant eBay price intelligence from your phone camera.
        </p>

        {/* Feature bullets */}
        <div className="flex flex-col gap-4 w-full mb-12 text-left">
          <div className="flex items-center gap-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(0,122,255,0.2)] flex items-center justify-center text-[#007AFF]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
            </div>
            <div>
              <div className="text-white font-semibold text-[15px]">Live Market Data</div>
              <div className="text-[rgba(255,255,255,0.5)] font-normal text-xs">Active & sold comps</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(52,199,89,0.2)] flex items-center justify-center text-[#34C759]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div>
              <div className="text-white font-semibold text-[15px]">Sell-Through Rate</div>
              <div className="text-[rgba(255,255,255,0.5)] font-normal text-xs">Know how fast it sells</div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(255,149,0,0.2)] flex items-center justify-center text-[#FF9500]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <div className="text-white font-semibold text-[15px]">Flip Analysis</div>
              <div className="text-[rgba(255,255,255,0.5)] font-normal text-xs">Calculated profit margins</div>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Link href="/sign-up" className="w-full flex items-center justify-center py-[18px] rounded-[16px] bg-[#007AFF] text-white font-bold text-[17px] shadow-[0_4px_12px_rgba(0,122,255,0.3)] hover:bg-[#0051CC] transition-colors active:scale-[0.98]">
            Get Started
          </Link>
          <Link href="/sign-in" className="w-full flex items-center justify-center py-[18px] rounded-[16px] bg-transparent text-white font-semibold text-[17px] hover:bg-[rgba(255,255,255,0.05)] transition-colors active:scale-[0.98]">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
