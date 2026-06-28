import { Link } from "wouter";
import { useListSavedItems, useGetStats, useDeleteSavedItem, getListSavedItemsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function SavedList() {
  const { data: items, isLoading } = useListSavedItems();
  const { data: stats } = useGetStats();
  const deleteMutation = useDeleteSavedItem();
  const queryClient = useQueryClient();

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm("Remove this saved item?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F2F2F7] relative text-[#1C1C1E] font-sans">
      <div className="bg-white pt-[54px] px-[16px] pb-[16px] border-b-[0.5px] border-black/[0.08] sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Link href="/scan" className="w-[34px] h-[34px] rounded-full bg-[#F2F2F7] flex items-center justify-center active:bg-[#E8E8ED]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <div className="font-bold text-[17px] tracking-[-0.3px]">Saved History</div>
          <div className="w-[34px]"></div>
        </div>

        {stats && (
          <div className="flex items-center justify-between bg-black/5 rounded-[12px] p-3">
            <div className="text-center">
              <div className="text-[10px] text-[#8E8E93] font-semibold uppercase">Items</div>
              <div className="font-bold text-[15px]">{stats.totalSaved}</div>
            </div>
            <div className="w-[1px] h-6 bg-black/10"></div>
            <div className="text-center">
              <div className="text-[10px] text-[#8E8E93] font-semibold uppercase">Hot</div>
              <div className="font-bold text-[15px] text-[#34C759]">{stats.hotCount}</div>
            </div>
            <div className="w-[1px] h-6 bg-black/10"></div>
            <div className="text-center">
              <div className="text-[10px] text-[#8E8E93] font-semibold uppercase">Est. Profit</div>
              <div className="font-bold text-[15px] text-[#007AFF]">${stats.totalEstProfit}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-[14px]">
        {isLoading && (
          <div className="flex justify-center p-8 text-[#8E8E93]">Loading...</div>
        )}

        {items?.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center p-10 h-full text-[#8E8E93]">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm mb-4">📦</div>
            <h3 className="text-[#1C1C1E] font-bold text-lg mb-2">No saved items</h3>
            <p className="text-sm">Scan an item and tap "Save Item" to keep it here.</p>
            <Link href="/scan" className="mt-6 text-[#007AFF] font-semibold bg-[#007AFF]/10 px-5 py-2.5 rounded-full">
              Start Scanning
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {items?.map(item => (
            <Link key={item.id} href={`/saved/${item.id}`} className="bg-white rounded-[16px] p-[14px] flex gap-[12px] items-start shadow-[0_1px_4px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-transform">
              {item.imageUrl ? (
                <div className="w-[60px] h-[60px] rounded-[10px] shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.imageUrl})` }}></div>
              ) : (
                <div className="w-[60px] h-[60px] rounded-[10px] shrink-0 flex items-center justify-center text-[24px] bg-[#f0f0f5]">📦</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-[14px] text-[#1C1C1E] truncate pr-2">{item.name}</div>
                  <button onClick={(e) => handleDelete(item.id, e)} className="text-[#8E8E93] hover:text-[#FF3B30] p-1 -mt-1 -mr-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
                <div className="text-[12px] text-[#8E8E93] mb-2">{format(new Date(item.createdAt), "MMM d, yyyy")}</div>
                
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#1C1C1E]">${item.sold.avg} <span className="text-[#8E8E93] font-normal text-[11px]">avg sold</span></div>
                  <div className={`text-[11px] font-bold px-2 py-0.5 rounded ${item.sellThrough.rate >= 70 ? 'bg-[#34C759]/10 text-[#34C759]' : item.sellThrough.rate >= 40 ? 'bg-[#FF9500]/10 text-[#FF9500]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
                    {item.sellThrough.rate}% S/T
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
