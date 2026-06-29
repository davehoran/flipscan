import { useRoute, Link } from "wouter";
import { useGetSavedItem } from "@workspace/api-client-react";

export default function SavedItemView() {
  const [, params] = useRoute("/saved/:id");
  const { data: scanResult, isLoading } = useGetSavedItem(Number(params?.id), {
    query: {
      enabled: !!params?.id
    }
  });

  if (isLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-[#F2F2F7]">Loading...</div>;
  }

  if (!scanResult) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-[#F2F2F7]">Item not found</div>;
  }

  const isHot = scanResult.sellThrough.rate >= 70;
  const isModerate = scanResult.sellThrough.rate >= 40 && scanResult.sellThrough.rate < 70;
  const sellThruColor = isHot ? "#34C759" : isModerate ? "#FF9500" : "#FF3B30";
  const sellThruBg = isHot ? "rgba(52,199,89,0.12)" : isModerate ? "rgba(255,149,0,0.12)" : "rgba(255,59,48,0.12)";
  const sellThruEmoji = isHot ? "🔥" : isModerate ? "⚡" : "🐢";

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F2F2F7] relative text-[#1C1C1E]">
      <div className="bg-[#F2F2F7] pt-[54px] px-[16px] pb-[12px] flex items-center gap-[10px] border-b-[0.5px] border-black/[0.08] sticky top-0 z-20">
        <Link href="/saved" className="w-[34px] h-[34px] rounded-full bg-white border-none flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.1)] active:bg-[#E8E8ED]">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L2 7.5l5.5 6" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <div className="font-bold text-[17px] text-[#1C1C1E] flex-1 tracking-[-0.3px] text-center">Saved Item</div>
        <div className="w-[34px]"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-[14px] flex flex-col gap-[10px] pb-10">
        
        {/* Item Card */}
        <div className="bg-white rounded-[16px] p-[14px] flex gap-[12px] items-start shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          {scanResult.imageUrl ? (
            <div className="w-[68px] h-[68px] rounded-[12px] shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${scanResult.imageUrl})` }}></div>
          ) : (
            <div className="w-[68px] h-[68px] rounded-[12px] shrink-0 flex items-center justify-center text-[30px] bg-[#eee]">📦</div>
          )}
          <div className="flex-1 min-w-0 pt-[1px]">
            <div className="font-bold text-[14px] text-[#1C1C1E] leading-[1.35] mb-[3px]">{scanResult.name}</div>
            <div className="font-normal text-[12px] text-[#8E8E93] mb-[8px]">{scanResult.category}</div>
            <div className="flex gap-[6px] flex-wrap">
              <div className="bg-[#E8F5E9] rounded-[20px] px-[9px] py-[3px]">
                <span className="font-semibold text-[11px] text-[#2E7D32]">{scanResult.confidence}% match</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Grid */}
        <div className="grid grid-cols-2 gap-[10px]">
          <div className="bg-white rounded-[16px] p-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-[5px] mb-[10px]">
              <div className="w-[6px] h-[6px] rounded-full bg-[#FF9500] shrink-0"></div>
              <span className="font-semibold text-[10px] text-[#8E8E93] uppercase tracking-[0.5px]">Active</span>
            </div>
            <div className="font-extrabold text-[21px] text-[#1C1C1E] tracking-[-0.6px] leading-[1]">${scanResult.active.avg}</div>
            <div className="font-normal text-[11px] text-[#8E8E93] mt-[2px] mb-[10px]">avg listed</div>
            <div className="h-[1px] bg-[#F2F2F7] mb-[10px]"></div>
            <div className="flex flex-col gap-[5px]">
              <div className="flex justify-between items-center"><span className="font-normal text-[11px] text-[#8E8E93]">Low</span><span className="font-semibold text-[12px] text-[#1C1C1E]">${scanResult.active.low}</span></div>
              <div className="flex justify-between items-center"><span className="font-normal text-[11px] text-[#8E8E93]">High</span><span className="font-semibold text-[12px] text-[#1C1C1E]">${scanResult.active.high}</span></div>
              <div className="flex justify-between items-center"><span className="font-normal text-[11px] text-[#8E8E93]">Count</span><span className="font-medium text-[11px] text-[#8E8E93]">{scanResult.active.count}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-[16px] p-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-[5px] mb-[10px]">
              <div className="w-[6px] h-[6px] rounded-full bg-[#34C759] shrink-0"></div>
              <span className="font-semibold text-[10px] text-[#8E8E93] uppercase tracking-[0.5px]">Sold · 90d</span>
              {scanResult.sold.isEstimated && <span className="font-semibold text-[9px] bg-black/5 px-1 rounded">EST.</span>}
            </div>
            <div className="font-extrabold text-[21px] text-[#1C1C1E] tracking-[-0.6px] leading-[1]">${scanResult.sold.avg}</div>
            <div className="font-normal text-[11px] text-[#8E8E93] mt-[2px] mb-[10px]">avg sold</div>
            <div className="h-[1px] bg-[#F2F2F7] mb-[10px]"></div>
            <div className="flex flex-col gap-[5px]">
              <div className="flex justify-between items-center"><span className="font-normal text-[11px] text-[#8E8E93]">Low</span><span className="font-semibold text-[12px] text-[#1C1C1E]">${scanResult.sold.low}</span></div>
              <div className="flex justify-between items-center"><span className="font-normal text-[11px] text-[#8E8E93]">High</span><span className="font-semibold text-[12px] text-[#1C1C1E]">${scanResult.sold.high}</span></div>
              <div className="flex justify-between items-center"><span className="font-normal text-[11px] text-[#8E8E93]">Count</span><span className="font-medium text-[11px] text-[#8E8E93]">{scanResult.sold.count}</span></div>
            </div>
          </div>
        </div>

        {/* Sell-Through Rate */}
        <div className="bg-white rounded-[16px] p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-[14px]">
            <div>
              <div className="font-semibold text-[10px] text-[#8E8E93] uppercase tracking-[0.6px] mb-[6px]">Sell-Through Rate</div>
              <div className="flex items-baseline gap-[7px]">
                <div className="font-black text-[40px] leading-[1] tracking-[-1.5px]" style={{ color: sellThruColor }}>{scanResult.sellThrough.rate}%</div>
                <div className="font-normal text-[12px] text-[#8E8E93]">in 90 days</div>
              </div>
            </div>
            <div className="rounded-[20px] px-[13px] py-[6px]" style={{ background: sellThruBg }}>
              <span className="font-bold text-[12px]" style={{ color: sellThruColor }}>{sellThruEmoji} {scanResult.sellThrough.label}</span>
            </div>
          </div>

          <div className="h-[7px] rounded-[4px] overflow-hidden mb-[7px] relative bg-[#F2F2F7]">
            <div className="absolute left-0 top-0 bottom-0 w-[40%]" style={{ background: "linear-gradient(90deg,rgba(255,59,48,0.18),rgba(255,59,48,0.1))" }}></div>
            <div className="absolute left-[40%] top-0 bottom-0 w-[30%]" style={{ background: "linear-gradient(90deg,rgba(255,149,0,0.14),rgba(255,149,0,0.1))" }}></div>
            <div className="absolute left-[70%] top-0 bottom-0 right-0" style={{ background: "linear-gradient(90deg,rgba(52,199,89,0.14),rgba(52,199,89,0.1))" }}></div>
            <div className="absolute left-0 top-0 bottom-0 rounded-[4px] w-full" style={{ width: `${scanResult.sellThrough.rate}%`, background: sellThruColor }}></div>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-[10px] text-[#FF3B30]">Slow &lt;40%</span>
            <span className="font-medium text-[10px] text-[#FF9500]">Moderate</span>
            <span className="font-medium text-[10px] text-[#34C759]">Hot &gt;70%</span>
          </div>
        </div>

        {/* Flip Analysis */}
        <div className="rounded-[16px] p-[18px] overflow-hidden relative bg-[#007AFF] shadow-[0_6px_20px_rgba(0,122,255,0.28)]">
          <div className="absolute -top-[40px] -right-[20px] w-[140px] h-[140px] rounded-full border-[20px] border-white/[0.04]"></div>
          <div className="absolute top-[60px] -right-[60px] w-[100px] h-[100px] rounded-full bg-white/[0.07]"></div>
          
          <div className="relative z-10">
            <div className="font-bold text-[15px] text-white">Flip Analysis</div>
            <div className="font-normal text-[12px] text-white/60 mb-[16px]">Based on 90-day eBay sold data</div>
            
            {(() => {
              const midList = (scanResult.flip.listLow + scanResult.flip.listHigh) / 2;
              const marginPct = midList > 0 ? Math.round((scanResult.flip.estProfit / midList) * 100) : 0;
              const marginColor = marginPct <= 30 ? "#FF3B30" : marginPct <= 60 ? "#FF9500" : "#34C759";
              const marginBg = marginPct <= 30 ? "rgba(255,59,48,0.28)" : marginPct <= 60 ? "rgba(255,149,0,0.28)" : "rgba(52,199,89,0.28)";
              const marginBorder = marginPct <= 30 ? "rgba(255,59,48,0.35)" : marginPct <= 60 ? "rgba(255,149,0,0.35)" : "rgba(52,199,89,0.35)";
              return (
                <div className="grid grid-cols-2 gap-[8px]">
                  <div className="bg-white/[0.14] rounded-[12px] py-[11px] px-[8px] text-center">
                    <div className="font-normal text-[10px] text-white/60 mb-[4px]">Buy Below</div>
                    <div className="font-extrabold text-[19px] text-white tracking-[-0.5px]">${scanResult.flip.buyBelow}</div>
                  </div>
                  <div className="bg-white/[0.14] rounded-[12px] py-[11px] px-[8px] text-center">
                    <div className="font-normal text-[10px] text-white/60 mb-[4px]">List At</div>
                    <div className="font-bold text-[13px] text-white">${scanResult.flip.listLow}–${scanResult.flip.listHigh}</div>
                  </div>
                  <div className="bg-[#34C759]/[0.28] border border-[#34C759]/[0.35] rounded-[12px] py-[11px] px-[8px] text-center flex flex-col justify-center">
                    <div className="font-normal text-[10px] text-white/80 mb-[2px]">Est. Profit</div>
                    <div className="font-bold text-[13px] text-white">+${scanResult.flip.estProfit}</div>
                  </div>
                  <div className="rounded-[12px] py-[11px] px-[8px] text-center flex flex-col justify-center border" style={{ background: marginBg, borderColor: marginBorder }}>
                    <div className="font-normal text-[10px] text-white/80 mb-[2px]">Est. Margin</div>
                    <div className="font-bold text-[13px]" style={{ color: marginColor }}>{marginPct}%</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2">
          <a href={scanResult.ebayUrl} target="_blank" rel="noopener noreferrer" className="bg-[#007AFF] text-white font-semibold text-[14px] rounded-[14px] p-[15px] flex justify-center items-center gap-[6px] active:bg-[#0051CC] transition-colors w-full">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            List on eBay
          </a>
        </div>

      </div>
    </div>
  );
}
