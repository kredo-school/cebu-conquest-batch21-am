// src/components/Sidebar.tsx
import React, { useMemo, memo } from 'react';
import { useGameStore } from '../store';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenInventory: () => void;
}

// 🚀 最適化：React.memo でラップし、不要な再描画をガード
export const Sidebar: React.FC<SidebarProps> = memo(({ onOpenSettings, onOpenHelp, onOpenInventory }) => {
  // 🚀 個別のセレクタを使用して、必要な値の変化にのみ反応
  const hp = useGameStore(state => state.hp);
  const maxHp = useGameStore(state => state.maxHp);
  const ap = useGameStore(state => state.ap);
  const turn = useGameStore(state => state.turn);
  const logs = useGameStore(state => state.logs);
  const atk = useGameStore(state => state.atk);
  const def = useGameStore(state => state.def);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const isUnderAttack = useGameStore(state => state.isUnderAttack);
  const districts = useGameStore(state => state.districts);
  const myId = useGameStore(state => state.myId);
  
  // ✅ GDD v3.1: ルックアップ辞書を取得
  const lookupData = useGameStore(state => state.lookupData);

  // 🚀 GDD v3.1: lookupDataを使用して安全に領土をグループ化
  const territorySummary = useMemo(() => {
    const myDistricts = Object.entries(districts)
      .filter(([_, ownerId]) => ownerId === myId)
      .map(([id]) => Number(id));

    const groups: Record<number, { name: string; ids: number[] }> = {};

    myDistricts.forEach(id => {
      let islandId = 0; // フォールバックID
      let islandName = "UNKNOWN SECTOR";

      if (lookupData && lookupData.districts && lookupData.areas && lookupData.islands) {
        // 陣地は地区(District: 3桁)またはSpot(5桁)で記録される可能性を考慮
        let district = lookupData.districts.get(id);
        if (!district && lookupData.spots) {
          const spot = lookupData.spots.get(id);
          if (spot) district = lookupData.districts.get(spot.parentDistrictId);
        }

        if (district) {
          const area = lookupData.areas.get(district.parentAreaId);
          if (area) {
            const island = lookupData.islands.get(area.parentIslandId);
            if (island) {
              islandId = island.id; // 正しい島ID（4桁等）
              islandName = island.name.toUpperCase();
            }
          }
        }
      } else {
        // lookupData が未取得の場合の旧ロジックフォールバック
        islandId = Math.floor(id / 1000);
        islandName = `SECTOR ${islandId}`;
      }

      if (!groups[islandId]) {
        groups[islandId] = { name: islandName, ids: [] };
      }
      groups[islandId].ids.push(id);
    });

    // 配列に変換してID順にソートして返す
    return Object.entries(groups).map(([iId, data]) => ({
      islandId: Number(iId),
      name: data.name,
      ids: data.ids
    })).sort((a, b) => a.islandId - b.islandId);
  }, [districts, myId, lookupData]);

  return (
    <>
      <style>{`
        @keyframes pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); border-color: rgba(239, 68, 68, 0.5); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 1); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 0.5); }
        }
        .animate-pulse-red { animation: pulse-red 2s infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f97316; border-radius: 10px; }
        .font-fix { line-height: 1.2; }
      `}</style>

      <aside className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-slate-950 w-80 border-r border-slate-800 shadow-2xl overflow-hidden font-body select-none text-left">
        
        {/* --- 1. Status Area --- */}
        <div className="flex-none p-6 pb-2 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
              <div className="text-2xl font-black text-orange-500 italic font-fix">{turn}</div>
            </div>
            <div className={`inline-flex items-center justify-center px-6 py-3 rounded-full border shadow-2xl transition-all ${
              isUnderAttack ? 'bg-red-950/40 border-red-500 animate-pulse-red' : 
              (isMyTurn ? 'bg-gradient-to-r from-[#3d2414] via-[#52331f] to-[#3d2414] border-[#7a482b]' : 'bg-slate-900 border-slate-800 opacity-50')
            }`}>
              <span className={`font-[900] tracking-[0.25em] text-xs uppercase font-fix ${isUnderAttack ? 'text-red-500' : 'text-[#fa7000]'}`}>
                {isMyTurn ? 'PLAYER TURN' : (isUnderAttack ? 'ENEMY ALERT' : 'STANDBY')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-500">HP {hp}/{maxHp}</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-500" style={{ width: `${(hp/(maxHp || 100))*100}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-500">AP (STAMINA) {ap}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all duration-500" style={{ width: `${ap}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-2 rounded border border-slate-800 flex flex-col items-center">
                <span className="text-[8px] text-slate-600 font-bold uppercase mb-1">ATK</span>
                <div className="text-lg font-black text-slate-100 italic font-fix">{atk}</div>
              </div>
              <div className="bg-slate-900/50 p-2 rounded border border-slate-800 flex flex-col items-center">
                <span className="text-[8px] text-slate-600 font-bold uppercase mb-1">DEF</span>
                <div className="text-lg font-black text-slate-100 italic font-fix">{def}</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- 2. Territory Control Area --- */}
        <div className="flex-1 px-6 py-2 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-3 bg-orange-500"></span>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Territory Control</span>
          </div>
          
          <div className="space-y-4">
            {territorySummary.length > 0 ? territorySummary.map(({ islandId, name, ids }) => (
              <div key={islandId} className="bg-slate-900/30 border border-white/5 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  {/* ✅ GDD v3.1: マスターデータから取得した島名を表示 */}
                  <span className="text-[10px] font-bold text-orange-500/80 font-fix uppercase">
                    {name}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">x{ids.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ids.map(id => (
                    // ✅ GDD v3.1: IDの下2桁をユニット番号として表示
                    <div key={id} className="px-2 py-0.5 bg-black/40 border border-slate-800 rounded text-[9px] text-slate-300 font-mono">
                      {String(id % 100).padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="py-4 text-center border border-dashed border-slate-800 rounded-lg">
                <span className="text-[9px] text-slate-600 uppercase font-bold tracking-tighter">No Territory Secured</span>
              </div>
            )}
          </div>
        </div>

        {/* --- 3. Inventory & System Area --- */}
        <div className="flex-none px-6 py-4 space-y-3">
          <button 
            onClick={onOpenInventory}
            className="w-full py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded flex items-center justify-center gap-2 transition-all group pointer-events-auto"
          >
            <span className="material-symbols-outlined text-emerald-400 text-sm group-hover:scale-110 transition-transform">inventory_2</span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-fix text-left">Inventory</span>
          </button>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest font-fix text-left">System Log</span>
              </div>
              <div className="flex gap-3">
                <button onClick={onOpenHelp} className="text-slate-600 hover:text-cyan-400 transition-colors pointer-events-auto">
                  <span className="material-symbols-outlined text-base">help</span>
                </button>
                <button onClick={onOpenSettings} className="text-slate-600 hover:text-orange-400 transition-colors pointer-events-auto">
                  <span className="material-symbols-outlined text-base">settings</span>
                </button>
              </div>
            </div>
            
            <div className="bg-black/40 rounded border border-white/5 h-32 p-3 text-[9px] font-mono text-slate-500 custom-scrollbar overflow-y-auto space-y-1.5">
              {logs.map((log, i) => (
                <p key={i} className={`${i === 0 ? 'text-orange-400 font-bold text-left' : 'opacity-60 text-left'}`}>
                  <span className="text-slate-800 mr-1">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});