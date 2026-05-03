// src/components/Sidebar.tsx
import React, { useMemo, memo } from 'react';
import { useGameStore } from '../store';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenInventory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = memo(({ onOpenSettings, onOpenHelp, onOpenInventory }) => {
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
  const playerName = useGameStore(state => state.playerName);
  const lookupData = useGameStore(state => state.lookupData);

  const territorySummary = useMemo(() => {
    const myDistricts = Object.entries(districts)
      .filter(([, ownerId]) => ownerId === myId)
      .map(([id]) => Number(id));

    const groups: Record<number, { name: string; ids: number[] }> = {};

    myDistricts.forEach(id => {
      let islandId = 0;
      let islandName = "UNKNOWN SECTOR";

      if (lookupData?.districts && lookupData.areas && lookupData.islands) {
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
              islandId = island.id;
              islandName = island.name.toUpperCase();
            }
          }
        }
      } else {
        islandId = Math.floor(id / 1000);
        islandName = `SECTOR ${islandId}`;
      }

      if (!groups[islandId]) {
        groups[islandId] = { name: islandName, ids: [] };
      }
      groups[islandId].ids.push(id);
    });

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
        @keyframes pulse-orange {
            0% { box-shadow: 0 0 15px rgba(250, 112, 0, 0.4); border-color: rgba(250, 112, 0, 0.5); }
            50% { box-shadow: 0 0 30px rgba(250, 112, 0, 0.7); border-color: rgba(250, 112, 0, 1); }
            100% { box-shadow: 0 0 15px rgba(250, 112, 0, 0.4); border-color: rgba(250, 112, 0, 0.5); }
        }
        .animate-pulse-red { animation: pulse-red 2s infinite; }
        .animate-pulse-orange { animation: pulse-orange 2.5s infinite ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ea580c; border-radius: 10px; }
        .font-fix { line-height: 1.2; }
      `}</style>

      <aside className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-slate-950 w-80 border-r border-slate-800 shadow-2xl overflow-hidden font-body select-none text-left">
        
        {/* --- 1. Commander & Status Area --- */}
        <div className="flex-none p-6 pb-2 space-y-4">
          <div className="flex flex-col gap-1 border-l-2 border-orange-600 pl-3 mb-4">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] font-fix">Neural Link Operator</span>
            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter font-fix truncate">
              {playerName || "COMMANDER"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
              <div className="text-2xl font-black text-orange-500 italic font-fix">{turn}</div>
            </div>
            
            {/* ✅ 修正：ターンの表示テキストとスタイルを復元 */}
            <div className={`inline-flex items-center justify-center px-6 py-3 rounded-full border shadow-2xl transition-all ${
              isUnderAttack ? 'bg-red-950/40 border-red-500 animate-pulse-red' : 
              (isMyTurn ? 'bg-orange-600/20 border-[#fa7000] animate-pulse-orange shadow-[0_0_20px_rgba(250,112,0,0.3)]' : 'bg-slate-900/50 border-slate-800 opacity-50')
            }`}>
              <span className={`font-[900] tracking-[0.25em] text-xs uppercase font-fix ${
                isUnderAttack ? 'text-red-500' : (isMyTurn ? 'text-white' : 'text-slate-500')
              }`}>
                {isMyTurn ? 'YOUR TURN' : (isUnderAttack ? 'ENEMY ALERT' : 'STANDBY')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* HP / AP ゲージ */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Vitality {hp}/{maxHp}</span>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-500" style={{ width: `${(hp/(maxHp || 100))*100}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Energy {ap}%</span>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all duration-500" style={{ width: `${ap}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-2 rounded border border-slate-800 flex flex-col items-center">
                <span className="text-[8px] text-slate-600 font-bold uppercase mb-1">Combat ATK</span>
                <div className="text-lg font-black text-slate-100 italic font-fix">{atk}</div>
              </div>
              <div className="bg-slate-900/50 p-2 rounded border border-slate-800 flex flex-col items-center">
                <span className="text-[8px] text-slate-600 font-bold uppercase mb-1">Armor DEF</span>
                <div className="text-lg font-black text-slate-100 italic font-fix">{def}</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- 2. Territory Control Area --- */}
        <div className="flex-1 px-6 py-2 overflow-y-auto custom-scrollbar border-t border-white/5 mt-4">
          <div className="flex items-center gap-2 mb-4 pt-4">
            <span className="w-1 h-3 bg-orange-500"></span>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-fix">Territory Intelligence</span>
          </div>
          <div className="space-y-3">
            {territorySummary.length > 0 ? territorySummary.map(({ islandId, name, ids }) => (
              <div key={islandId} className="bg-slate-900/40 border border-white/5 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-orange-500/80 font-fix uppercase">{name}</span>
                  <span className="text-[9px] text-slate-500 font-mono">x{ids.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ids.map(id => (
                    <div key={id} className="px-1.5 py-0.5 bg-black/40 border border-slate-800 rounded text-[8px] text-slate-400 font-mono">
                      {String(id % 100).padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="py-8 text-center border border-dashed border-slate-800 rounded-lg">
                <span className="text-[9px] text-slate-600 uppercase font-bold font-fix">No Secured Sectors</span>
              </div>
            )}
          </div>
        </div>

        {/* --- 3. Inventory & Tactical Feed Area --- */}
        <div className="flex-none px-6 py-4 space-y-3 bg-slate-950/80 backdrop-blur-md">
          <button onClick={onOpenInventory} className="w-full py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded flex items-center justify-center gap-2 transition-all shadow-lg group">
            <span className="material-symbols-outlined text-emerald-400 text-sm group-hover:scale-110 transition-transform">inventory_2</span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-fix">Open Inventory</span>
          </button>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest font-fix">Tactical Feed</span>
              </div>
              <div className="flex gap-4">
                <button onClick={onOpenHelp} className="text-slate-600 hover:text-cyan-400 transition-colors"><span className="material-symbols-outlined text-base">help</span></button>
                <button onClick={onOpenSettings} className="text-slate-600 hover:text-orange-400 transition-colors"><span className="material-symbols-outlined text-base">settings</span></button>
              </div>
            </div>
            <div className="bg-black/60 rounded border border-white/5 h-36 p-3 text-[9px] font-mono custom-scrollbar overflow-y-auto space-y-1.5 shadow-inner">
              {logs.map((log, i) => (
                <div key={i} className={`flex items-baseline gap-2 leading-tight ${i === 0 ? 'text-orange-400 font-bold' : 'text-slate-500 opacity-80'}`}>
                  <span className="text-slate-800 shrink-0">[{log.time}]</span>
                  <span className="flex-1 break-words font-fix">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});