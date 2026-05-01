// src/components/InventoryModal.tsx
import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store';

interface Item {
  id: number;
  name: string;
  effect: string;
  description: string;
  quantity: number;
  image_url?: string;
}

interface InventoryModalProps {
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ onClose }) => {
  // ✅ GDD v3.1: Zustand から useItem (けいさんのサーバー通信用) を追加抽出
  const { authenticatedFetch, addLog, lookupData, useItem } = useGameStore();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // 📦 1. インベントリ取得（初期表示用：永続化データのため PHP 経由）
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const json = await authenticatedFetch('get-inventory.php');
      if (json.status === 'success') {
        setItems(json.data);
      }
    } catch {
      addLog("❌ インベントリの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // ⚡ 2. アイテム使用処理
  const handleDeployItem = (itemId: number) => {
    /**
     * 🚀 実装ポイント:
     * ストア側で一括管理している useItem(itemId) を呼び出します。
     * これにより、けいさんが想定しているペイロード { itemId: number } が
     * 正確に Socket.IO で送信されます。
     */
    useItem(itemId);
    
    // UIを閉じ、サーバーからの SYNC_STATE による状態更新（HP/AP等）を待ちます
    onClose(); 
  };

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-fadeIn">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
          <div className="text-left">
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase font-fix">Tactical Inventory</h2>
            <p className="text-[10px] text-orange-500 font-bold tracking-[0.3em] uppercase mt-1 font-fix">Supply & Support Gear</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>

        {/* Item List (Bento Grid Style) */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar min-h-[400px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 animate-pulse uppercase font-black tracking-widest font-fix">Scanning Storage...</div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((item) => {
                
                // ✅ GDD v3.1: lookupData (Map) を使用して O(1) で島名を解決
                let islandName = "UNKNOWN SECTOR";
                if (lookupData) {
                  const spot = lookupData.spots.get(item.id);
                  const district = spot ? lookupData.districts.get(spot.parentDistrictId) : null;
                  const area = district ? lookupData.areas.get(district.parentAreaId) : null;
                  const island = area ? lookupData.islands.get(area.parentIslandId) : null;
                  
                  if (island) {
                    islandName = island.name.toUpperCase();
                  }
                }

                return (
                  <div key={item.id} className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 flex gap-4 hover:border-orange-500/30 transition-all group relative overflow-hidden text-left">
                    <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center border border-white/5 shrink-0 overflow-hidden relative z-10">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-slate-600 text-3xl">package_2</span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between relative z-10">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex flex-col items-start">
                            <span className="text-[8px] font-black text-orange-500/80 uppercase tracking-tighter mb-0.5 font-fix">
                              Origin: {islandName}
                            </span>
                            <h3 className="text-sm font-black text-white uppercase leading-none font-fix">{item.name}</h3>
                          </div>
                          <span className="text-[10px] font-black text-orange-500 font-fix bg-orange-500/10 px-1.5 py-0.5 rounded">x{item.quantity}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 font-fix leading-relaxed">{item.description}</p>
                      </div>
                      <button 
                        onClick={() => handleDeployItem(item.id)}
                        className="mt-3 w-full py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase rounded transition-all active:scale-95 shadow-lg shadow-orange-900/20 font-fix"
                      >
                        Deploy Item
                      </button>
                    </div>
                    {/* Background Icon Decoration */}
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none">
                       <span className="material-symbols-outlined text-8xl italic">inventory_2</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <span className="material-symbols-outlined text-6xl mb-2">inventory_2</span>
              <p className="text-xs font-black uppercase tracking-widest font-fix">Inventory Empty</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-950/50 border-t border-white/5 flex justify-between items-center">
          <div className="flex gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest font-fix">Encrypted Connection Active</span>
          </div>
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest font-fix">Tactical Storage Status: Optimal</span>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};