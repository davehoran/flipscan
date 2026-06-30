import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAnalyzeItem, useCreateSavedItem } from "@workspace/api-client-react";
import { DEMO_ITEMS } from "@/lib/demo-data";
import { ScanResult } from "@workspace/api-client-react/src/generated/api.schemas";

// ... (Will add the full implementation here) ...
// Splitting to another file to save space in the thought block, wait, I can just write it.

export default function ScanFlow() {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<"camera" | "analyzing" | "results">("camera");
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [demoIndex, setDemoIndex] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<0 | 1 | 2 | 3>(0);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const analyzeMutation = useAnalyzeItem();
  const createSavedItem = useCreateSavedItem();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---
  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setCapturedImageUrl(result);
        startRealAnalysis(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRealAnalysis = (imgData: string) => {
    setScreen("analyzing");
    setAnalysisStep(0);
    
    // Simulate steps timing even while real API is running, then wait for real API
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= 3) setAnalysisStep(step as any);
      if (step === 3) clearInterval(interval);
    }, 950);

    analyzeMutation.mutate({ data: { image: imgData } }, {
      onSuccess: (data) => {
        setScanResult(data);
        // Wait for animations to finish if they haven't yet
        setTimeout(() => {
          setScreen("results");
        }, Math.max(0, 3400 - (Date.now() - startTime)));
      },
      onError: (err) => {
        alert("Couldn't identify that item — try another angle");
        setScreen("camera");
      }
    });
    const startTime = Date.now();
  };

  const startDemo = () => {
    const currentDemo = DEMO_ITEMS[demoIndex];
    setScanResult({
      name: currentDemo.name,
      category: currentDemo.category,
      confidence: currentDemo.confidence,
      searchTerm: currentDemo.name,
      active: currentDemo.listed,
      sold: { ...currentDemo.sold, isEstimated: false },
      sellThrough: { 
        rate: currentDemo.sellThru, 
        label: currentDemo.sellThru >= 70 ? "Hot" : currentDemo.sellThru >= 40 ? "Moderate" : "Slow" 
      },
      flip: {
        buyBelow: currentDemo.buyBelow,
        listLow: currentDemo.listLow,
        listHigh: currentDemo.listHigh,
        estProfit: (currentDemo.listLow + currentDemo.listHigh)/2 - currentDemo.buyBelow
      },
      ebayUrl: "https://ebay.com",
      _demoData: currentDemo
    });
    setDemoIndex((prev) => (prev + 1) % DEMO_ITEMS.length);
    setCapturedImageUrl(null);
    setScreen("analyzing");
    setAnalysisStep(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= 3) setAnalysisStep(step as any);
      if (step === 3) {
        clearInterval(interval);
        setTimeout(() => setScreen("results"), 550);
      }
    }, 950);
  };

  const saveItem = () => {
    if (!scanResult) return;
    createSavedItem.mutate({
      data: {
        name: scanResult.name,
        category: scanResult.category,
        confidence: scanResult.confidence,
        searchTerm: scanResult.searchTerm,
        imageUrl: capturedImageUrl,
        active: scanResult.active,
        sold: scanResult.sold,
        sellThrough: scanResult.sellThrough,
        flip: scanResult.flip,
        ebayUrl: scanResult.ebayUrl
      }
    }, {
      onSuccess: () => {
        setToastMsg(`Saved ${scanResult.name}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2600);
      }
    });
  };

  // --- Render Helpers ---
  const isHot = scanResult?.sellThrough.rate >= 70;
  const isModerate = scanResult?.sellThrough.rate >= 40 && scanResult?.sellThrough.rate < 70;
  const sellThruColor = isHot ? "#34C759" : isModerate ? "#FF9500" : "#FF3B30";
  const sellThruBg = isHot ? "rgba(52,199,89,0.12)" : isModerate ? "rgba(255,149,0,0.12)" : "rgba(255,59,48,0.12)";
  const sellThruEmoji = isHot ? "🔥" : isModerate ? "⚡" : "🐢";

  return (
    <div className="flex flex-col min-h-[100dvh] overflow-hidden bg-black text-white selection:bg-blue-500/30">
      
      {/* Hidden Inputs */}
      <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
      <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleCapture} />

      {/* CAMERA SCREEN */}
      {screen === "camera" && (
        <div className="flex flex-col h-[100dvh] relative">
          <div className="pt-[56px] px-5 pb-[10px] flex justify-between items-center z-10">
            <div>
              <div className="font-black text-2xl tracking-[-1px] text-white leading-none">Scan Flip</div>
              <div className="font-normal text-[11px] text-white/35 mt-1 tracking-[0.3px] leading-none">eBay Price Intelligence</div>
            </div>
            <div className="flex items-center gap-[6px] bg-[rgba(52,199,89,0.12)] border border-[rgba(52,199,89,0.25)] rounded-[20px] px-[11px] py-[5px]">
              <div className="w-[7px] h-[7px] rounded-full bg-[#34C759] animate-[breathe_1.8s_ease-in-out_infinite]"></div>
              <span className="font-medium text-[11px] text-[#34C759]">Live Data</span>
            </div>
          </div>

          <div className="flex-1 mx-5 my-2 relative">
            <div className="absolute inset-0 rounded-[18px] overflow-hidden bg-[#080810]">
              <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(0,122,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,122,255,0.035) 1px,transparent 1px)", backgroundSize: "30px 30px" }}></div>
              <div className="absolute left-5 right-5 h-[1.5px] animate-[scanLine_2.4s_ease-in-out_infinite_alternate]" style={{ background: "linear-gradient(90deg,transparent,rgba(0,122,255,0.7) 20%,rgba(120,200,255,1) 50%,rgba(0,122,255,0.7) 80%,transparent)", filter: "drop-shadow(0 0 6px rgba(0,150,255,0.9))" }}>
                <div className="absolute left-0 right-0 -top-[40px] h-[80px]" style={{ background: "linear-gradient(180deg,transparent,rgba(0,122,255,0.05),transparent)" }}></div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-[14px]">
                <div className="opacity-25">
                  <svg width="56" height="48" viewBox="0 0 56 48" fill="none">
                    <path d="M20 6H11a6 6 0 00-6 6v24a6 6 0 006 6h34a6 6 0 006-6V12a6 6 0 00-6-6h-9l-3-6H23l-3 6z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="28" cy="24" r="9" stroke="white" strokeWidth="2"/>
                    <circle cx="28" cy="24" r="3.5" stroke="white" strokeWidth="1.5" strokeDasharray="2 3"/>
                    <circle cx="42" cy="15" r="2.5" fill="white" opacity="0.6"/>
                  </svg>
                </div>
                <div className="font-normal text-[12px] text-white/25 tracking-[0.5px] text-center">Point at any item</div>
              </div>
            </div>
            {/* Brackets */}
            <div className="absolute top-0 left-0 w-[30px] h-[30px] border-t-[2.5px] border-l-[2.5px] border-[rgba(0,150,255,0.85)] rounded-tl-[4px] z-[2]"></div>
            <div className="absolute top-0 right-0 w-[30px] h-[30px] border-t-[2.5px] border-r-[2.5px] border-[rgba(0,150,255,0.85)] rounded-tr-[4px] z-[2]"></div>
            <div className="absolute bottom-0 left-0 w-[30px] h-[30px] border-b-[2.5px] border-l-[2.5px] border-[rgba(0,150,255,0.85)] rounded-bl-[4px] z-[2]"></div>
            <div className="absolute bottom-0 right-0 w-[30px] h-[30px] border-b-[2.5px] border-r-[2.5px] border-[rgba(0,150,255,0.85)] rounded-br-[4px] z-[2]"></div>
          </div>

          <div className="text-center px-5 pt-[10px] pb-[6px] font-normal text-[12px] text-white/30">
            Snap a photo or tap Demo to explore
          </div>

          <div className="flex items-center justify-between px-[44px] pt-[8px] pb-[30px]">
            <button onClick={() => galleryInputRef.current?.click()} className="w-[54px] h-[54px] rounded-[16px] bg-white/[0.08] border-[1.5px] border-white/[0.12] flex flex-col items-center justify-center gap-[4px] active:bg-white/[0.18] transition-colors">
              <svg width="22" height="19" viewBox="0 0 22 19" fill="none">
                <rect x="1" y="2" width="20" height="16" rx="3" stroke="rgba(255,255,255,0.75)" strokeWidth="1.7"/>
                <circle cx="7.5" cy="8" r="2.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5"/>
                <path d="M1 13.5l5.5-5 3.5 3.5 3-3 5 5.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              <span className="font-semibold text-[8px] text-white/40 tracking-[0.5px]">GALLERY</span>
            </button>

            <button onClick={() => fileInputRef.current?.click()} className="w-[82px] h-[82px] rounded-full bg-transparent border-[3px] border-white/70 flex items-center justify-center active:scale-[0.94] transition-transform duration-100">
              <div className="w-[68px] h-[68px] rounded-full bg-white"></div>
            </button>

            <button onClick={startDemo} className="w-[54px] h-[54px] rounded-[16px] bg-[#007AFF]/[0.14] border-[1.5px] border-[#007AFF]/[0.38] flex flex-col items-center justify-center gap-[4px] active:bg-[#007AFF]/[0.28] transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <polygon points="6,3.5 15,9 6,14.5" fill="rgba(100,170,255,0.9)"/>
              </svg>
              <span className="font-semibold text-[8px] text-[rgba(100,170,255,0.75)] tracking-[0.5px]">DEMO</span>
            </button>
          </div>
        </div>
      )}

      {/* ANALYZING SCREEN */}
      {screen === "analyzing" && (
        <div className="flex flex-col h-[100dvh]">
          <div className="flex-1 relative overflow-hidden" style={{ background: scanResult?._demoData?.bg || "#111" }}>
            {capturedImageUrl && (
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${capturedImageUrl})` }}></div>
            )}
            {!capturedImageUrl && scanResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-[16px]">
                <div className="text-[80px] leading-none animate-[breathe_2.2s_ease-in-out_infinite]">{scanResult._demoData?.emoji}</div>
                <div className="font-semibold text-[14px] text-white/40 text-center px-[40px] tracking-[0.2px]">{scanResult.name}</div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-[55%] pointer-events-none" style={{ background: "linear-gradient(transparent,rgba(0,0,0,0.92))" }}></div>
            
            {scanResult && analysisStep >= 1 && (
              <div className="absolute bottom-[18px] left-[20px] right-[20px] animate-in fade-in duration-500">
                <div className="font-medium text-[10px] text-white/45 tracking-[0.8px] mb-[5px]">IDENTIFIED</div>
                <div className="font-bold text-[17px] text-white leading-[1.25] mb-[3px]">{scanResult.name}</div>
                <div className="font-normal text-[13px] text-white/50">{scanResult.category}</div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-t-[24px] px-[22px] pt-[22px] pb-[36px] shrink-0 animate-[slideUp_0.35s_ease]">
            <div className="flex justify-between items-start mb-[22px]">
              <div>
                <div className="font-bold text-[17px] text-[#1C1C1E] mb-[3px]">Analyzing image</div>
                <div className="font-normal text-[13px] text-[#8E8E93]">Searching eBay marketplace data</div>
              </div>
              <div className="w-[9px] h-[9px] rounded-full bg-[#007AFF] mt-[4px] animate-[breathe_1s_ease-in-out_infinite]"></div>
            </div>

            {[
              { title: "Visual Search", desc: "Matching image to eBay catalog", stepNum: 0 },
              { title: "Active Listings", desc: "Scanning current eBay prices", stepNum: 1 },
              { title: "Sell-Through Rate", desc: "Calculating sold vs active ratio", stepNum: 2 },
            ].map((step, i) => {
              const isPast = analysisStep > step.stepNum;
              const isActive = analysisStep === step.stepNum;
              const bg = isPast ? "#34C759" : isActive ? "#007AFF" : "#E5E5EA";
              return (
                <div key={i} className="flex items-center gap-[14px] mb-[18px] last:mb-0">
                  <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 transition-colors duration-400" style={{ background: bg }}>
                    {isPast && (
                      <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5L5 9 12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                    {isActive && (
                      <div className="w-[14px] h-[14px] rounded-full border-[2.5px] border-white/28 border-t-white animate-[spin_0.7s_linear_infinite]"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[14px] text-[#1C1C1E]">{step.title}</div>
                    <div className="font-normal text-[12px] text-[#8E8E93]">{step.desc}</div>
                  </div>
                  {isPast && <span className="font-semibold text-[12px] text-[#34C759] animate-in fade-in">✓ Done</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RESULTS SCREEN */}
      {screen === "results" && scanResult && (
        <div className="flex flex-col h-[100dvh] bg-[#F2F2F7] relative text-[#1C1C1E]">
          
          {showToast && (
            <div className="absolute bottom-[110px] left-[50%] z-[99] bg-[#1C1C1E] text-white font-semibold text-[13px] px-[18px] py-[10px] rounded-[22px] whitespace-nowrap animate-[toastIn_0.25s_ease] flex items-center gap-[7px] -translate-x-1/2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" fill="#34C759"/><path d="M4 7l2.5 2.5L10 4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {toastMsg}
            </div>
          )}

          <div className="bg-[#F2F2F7] pt-[54px] px-[16px] pb-[12px] flex items-center gap-[10px] border-b-[0.5px] border-black/[0.08] sticky top-0 z-20">
            <button onClick={() => { setScreen("camera"); setScanResult(null); setCapturedImageUrl(null); }} className="w-[34px] h-[34px] rounded-full bg-white border-none flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.1)] active:bg-[#E8E8ED]">
              <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L2 7.5l5.5 6" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className="font-bold text-[17px] text-[#1C1C1E] flex-1 tracking-[-0.3px] text-center">Scan Flip</div>
            <Link href="/saved" className="w-[34px] h-[34px] rounded-full bg-white border-none flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.1)] active:bg-[#E8E8ED]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto">
          <div className="p-[14px] flex flex-col gap-[10px] pb-[120px]">
            
            {/* Item Card */}
            <div className="bg-white rounded-[16px] p-[14px] flex gap-[12px] items-start shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              {capturedImageUrl ? (
                <div className="w-[68px] h-[68px] rounded-[12px] shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${capturedImageUrl})` }}></div>
              ) : (
                <div className="w-[68px] h-[68px] rounded-[12px] shrink-0 flex items-center justify-center text-[30px]" style={{ background: scanResult._demoData?.bg || "#eee" }}>{scanResult._demoData?.emoji || "📦"}</div>
              )}
              <div className="flex-1 min-w-0 pt-[1px]">
                <div className="font-bold text-[14px] text-[#1C1C1E] leading-[1.35] mb-[3px]">{scanResult.name}</div>
                <div className="font-normal text-[12px] text-[#8E8E93] mb-[8px]">{scanResult.category}</div>
                <div className="flex gap-[6px] flex-wrap">
                  <div className="bg-[#E8F5E9] rounded-[20px] px-[9px] py-[3px]">
                    <span className="font-semibold text-[11px] text-[#2E7D32]">{scanResult.confidence}% match</span>
                  </div>
                  {scanResult.sellThrough.label === "Hot" && (
                     <div className="rounded-[20px] px-[9px] py-[3px] bg-[#34C759]/10">
                       <span className="font-semibold text-[11px] text-[#34C759]">Trending Up</span>
                     </div>
                  )}
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
                <div className="absolute left-0 top-0 bottom-0 rounded-[4px] transition-[width] duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-0" style={{ width: `${scanResult.sellThrough.rate}%`, background: sellThruColor }}></div>
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
                        <div className="font-semibold text-[11px] text-white/60 mb-[4px]">Buy Below</div>
                        <div className="font-extrabold text-[19px] text-white tracking-[-0.5px]">${scanResult.flip.buyBelow}</div>
                      </div>
                      <div className="bg-white/[0.14] rounded-[12px] py-[11px] px-[8px] text-center">
                        <div className="font-semibold text-[11px] text-white/60 mb-[4px]">List At</div>
                        <div className="font-extrabold text-[19px] text-white tracking-[-0.5px]">${scanResult.flip.listLow}–${scanResult.flip.listHigh}</div>
                      </div>
                      <div className="bg-[#34C759]/[0.28] border border-[#34C759]/[0.35] rounded-[12px] py-[11px] px-[8px] text-center flex flex-col justify-center">
                        <div className="font-semibold text-[11px] text-white/80 mb-[2px]">Est. Profit</div>
                        <div className="font-extrabold text-[19px] text-white tracking-[-0.5px]">+${scanResult.flip.estProfit}</div>
                      </div>
                      <div className="rounded-[12px] py-[11px] px-[8px] text-center flex flex-col justify-center" style={{ background: marginColor }}>
                        <div className="font-semibold text-[11px] text-white/80 mb-[2px]">Est. Margin</div>
                        <div className="font-extrabold text-[19px] text-white tracking-[-0.5px]">{marginPct}%</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-[10px] mt-2">
              <button onClick={saveItem} disabled={createSavedItem.isPending} className="bg-white border-[1.5px] border-[#007AFF] text-[#007AFF] font-semibold text-[14px] rounded-[14px] p-[15px] flex justify-center items-center gap-[6px] active:bg-[#EEF4FF] disabled:opacity-50 transition-colors">
                <svg width="14" height="18" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M1 1h12v16l-6-4.5L1 17V1z"/></svg>
                Save Item
              </button>
              <a href={scanResult.ebayUrl} target="_blank" rel="noopener noreferrer" className="bg-[#007AFF] text-white font-semibold text-[14px] rounded-[14px] p-[15px] flex justify-center items-center gap-[6px] active:bg-[#0051CC] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                List on eBay
              </a>
            </div>

          </div>
          </div>
        </div>
      )}
    </div>
  );
}
