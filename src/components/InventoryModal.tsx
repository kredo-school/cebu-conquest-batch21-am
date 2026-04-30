import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import socket from '../socket';
import { CLIENT_EVENTS } from '../../shared/socketEvents'; // 🚀 追加

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

const ISLAND_NAMES: Record<number, string> = {
  11: "CEBU",
  12: "MACTAN",
  13: "BOHOL",
  14: "NEGROS",
  15: "SIQUIJOR"
};

export const InventoryModal: React.FC<InventoryModalProps> = ({ onClose }) => {
  const { authenticatedFetch, addLog } = useGameStore();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // 📦 1. インベントリ取得（初期表示用 / PHPから読むのはOK：永続データの読み取りのみ）
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

  /**
   * ⚡ 2. アイテム使用
   * 🚀 アーキテクチャ原則に従い、Socket 経由でけいのサーバーへ委譲。
   *    サーバー側で roomState を更新 → SYNC_STATE で全プレイヤーへ反映される。
   *    バフ計算・在庫減算もすべてサーバー責務。
   */
  const handleUseItem = (itemId: number, itemName: string) => {
    try {
      socket.emit(CLIENT_EVENTS.ACTION_USE_ITEM, { itemId });
      addLog(`🎒 アイテム使用リクエスト送信: ${itemName}`);
      onClose(); // SYNC_STATE が来れば HUD は自動更新される
    } catch {
      addLog("❌ アイテム使用中にエラーが発生しました");
    }
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

        {/* Item List */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar min-h-[400px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 animate-pulse uppercase font-black tracking-widest font-fix">Scanning Storage...</div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((item) => {
                const islandId = Math.floor(item.id / 1000);
                const islandName = ISLAND_NAMES[islandId];

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
                            {islandName && (
                              <span className="text-[8px] font-black text-orange-500/80 uppercase tracking-tighter mb-0.5 font-fix">
                                Origin: {islandName}
                              </span>
                            )}
                            <h3 className="text-sm font-black text-white uppercase leading-none font-fix">{item.name}</h3>
                          </div>
                          <span className="text-[10px] font-black text-orange-500 font-fix bg-orange-500/10 px-1.5 py-0.5 rounded">x{item.quantity}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 font-fix leading-relaxed">{item.description}</p>
                      </div>
                      <button 
                        onClick={() => handleUseItem(item.id, item.name)}
                        className="mt-3 w-full py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase rounded transition-all active:scale-95 shadow-lg shadow-orange-900/20 font-fix"
                      >
                        Use Item
                      </button>
                    </div>
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
             <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest font-fix">System Secure</span>
          </div>
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest font-fix">Storage Status: Optimal</span>
        </div>
      </div>
      
      {/* 構文エラーを修正したスタイル定義 */}
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