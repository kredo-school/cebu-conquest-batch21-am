/// <reference types="vite/client" />
import React, { useEffect, useState, useCallback } from 'react';
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

// 🚀 Magic function: Automatically detects 5 distinct attribute styles based on item effects
const getItemStyle = (effect: string = '') => {
  const e = effect.toUpperCase();
  // ⚔️ ATK (Offensive)
  if (e.includes('ATK') || e.includes('ATTACK') || e.includes('DAMAGE') || e.includes('OFFENSE')) {
    return { type: 'ATK', icon: 'swords', color: 'text-red-500', border: 'border-red-500/50', hover: 'hover:border-red-500', bg: 'bg-red-500/10', btn: 'bg-red-600 hover:bg-red-500', badge: 'bg-red-500/20 text-red-400' };
  }
  // 🛡️ DEF (Defensive)
  if (e.includes('DEF') || e.includes('DEFENSE') || e.includes('SHIELD')) {
    return { type: 'DEF', icon: 'shield', color: 'text-blue-500', border: 'border-blue-500/50', hover: 'hover:border-blue-500', bg: 'bg-blue-500/10', btn: 'bg-blue-600 hover:bg-blue-500', badge: 'bg-blue-500/20 text-blue-400' };
  }
  // 💚 HP (Vitality / Recovery)
  if (e.includes('HP') || e.includes('HEALTH') || e.includes('RECOVERY') || e.includes('VITALITY')) {
    return { type: 'HP', icon: 'favorite', color: 'text-emerald-500', border: 'border-emerald-500/50', hover: 'hover:border-emerald-500', bg: 'bg-emerald-500/10', btn: 'bg-emerald-600 hover:bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400' };
  }
  // ⚡ AP (Action Points / Stamina)
  if (e.includes('AP') || e.includes('ACTION') || e.includes('STAMINA') || e.includes('ENERGY')) {
    return { type: 'AP', icon: 'bolt', color: 'text-amber-500', border: 'border-amber-500/50', hover: 'hover:border-amber-500', bg: 'bg-amber-500/10', btn: 'bg-amber-600 hover:bg-amber-500', badge: 'bg-amber-500/20 text-amber-400' };
  }
  // ✨ FAITH (Divine Alignment)
  if (e.includes('FAITH') || e.includes('GOD') || e.includes('DIVINE')) {
    return { type: 'FAITH', icon: 'auto_awesome', color: 'text-fuchsia-500', border: 'border-fuchsia-500/50', hover: 'hover:border-fuchsia-500', bg: 'bg-fuchsia-500/10', btn: 'bg-fuchsia-600 hover:bg-fuchsia-500', badge: 'bg-fuchsia-500/20 text-fuchsia-400' };
  }
  // 📦 Miscellaneous (Default Fallback)
  return { type: 'ITEM', icon: 'inventory_2', color: 'text-orange-500', border: 'border-orange-500/50', hover: 'hover:border-orange-500', bg: 'bg-orange-500/10', btn: 'bg-orange-600 hover:bg-orange-500', badge: 'bg-orange-500/20 text-orange-400' };
};

export const InventoryModal: React.FC<InventoryModalProps> = ({ onClose }) => {
  const { authenticatedFetch, addLog, lookupData, useItem: executeUseItem, inventory } = useGameStore();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // 📦 1. Fetch Inventory (For initial display: handled via PHP for persistent database synchronization)
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const json = await authenticatedFetch<Item[]>('get-inventory.php');
      if (json.status === 'success' && json.data) {
        setItems(json.data);
      }
    } catch {
      addLog("❌ Failed to retrieve tactical inventory database link");
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, addLog]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // 📦 Synchronize with input state on the Zustand store inventory
  useEffect(() => {
    if (inventory && Array.isArray(inventory)) {
      setItems(inventory as Item[]);
    }
  }, [inventory]);

  // ⚡ 2. Item Deployment Execution
  const handleDeployItem = (itemId: number) => {
    executeUseItem(itemId);
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

        {/* Item List */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar min-h-[400px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 animate-pulse uppercase font-black tracking-widest font-fix">Scanning Storage...</div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((item) => {
                
                // 🏝️ Resolve parent island sector assignment names
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

                // 🚀 Fetch responsive attribute theme style parameters
                const style = getItemStyle(item.effect);

                return (
                  <div key={item.id} className={`bg-slate-800/40 border ${style.border} ${style.hover} rounded-2xl p-4 flex gap-4 transition-all group relative overflow-hidden text-left shadow-lg`}>
                    
                    {/* Icon Display Area (Renders responsive attribute icon if image_url is missing) */}
                    <div className={`w-16 h-16 ${style.bg} rounded-xl flex items-center justify-center border border-white/10 shrink-0 overflow-hidden relative z-10`}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className={`material-symbols-outlined text-4xl ${style.color}`}>{style.icon}</span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between relative z-10">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex flex-col items-start">
                            <span className={`text-[8px] font-black ${style.color} uppercase tracking-tighter mb-0.5 font-fix opacity-80`}>
                              {islandName} [{style.type}]
                            </span>
                            <h3 className="text-sm font-black text-white uppercase leading-none font-fix">{item.name}</h3>
                          </div>
                          <span className={`text-[10px] font-black font-fix ${style.badge} px-1.5 py-0.5 rounded`}>
                            x{item.quantity}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 font-fix leading-relaxed">{item.description}</p>
                      </div>
                      <button 
                        onClick={() => handleDeployItem(item.id)}
                        className={`mt-3 w-full py-1.5 ${style.btn} text-white text-[10px] font-black uppercase rounded transition-all active:scale-95 shadow-lg font-fix`}
                      >
                        Deploy Item
                      </button>
                    </div>

                    {/* 🚀 Integrate sub-layer backdrop watermark icon */}
                    <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                        <span className={`material-symbols-outlined text-[80px] ${style.color}`}>{style.icon}</span>
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

export default InventoryModal;