/// <reference types="vite/client" />
import React, { useMemo } from 'react';
import { useGameStore } from '../store';

// ✅ Deployment site candidates matching production 5-digit spotId
const START_CANDIDATES = [
  // ── Cebu North Sector ──
  { id: 11101, fallbackName: "Maya Port" },
  { id: 11102, fallbackName: "Sugarcane Field" },
  { id: 11108, fallbackName: "Farmer House" },
  { id: 11112, fallbackName: "Bogo Transit Terminal" },
  { id: 11113, fallbackName: "Bogo Hilltop Shrine" },
  // ── Cebu Central Sector ──
  { id: 13101, fallbackName: "IT Park" },
  { id: 13102, fallbackName: "Waterfront Hotel" },
  { id: 13103, fallbackName: "Ayala Malls Center" },
  { id: 13204, fallbackName: "Basilica del Santo Niño" },
];

interface Props {
  onSelect: (id: number) => void;
}

export const StartPosModal: React.FC<Props> = ({ onSelect }) => {
  // ✅ GDD v3.1: Retrieve lookup dictionary
  const lookupData = useGameStore(state => state.lookupData);

  // 🚀 Group candidates dynamically by fetching master data using 5-digit IDs
  const groupedCandidates = useMemo(() => {
    // ✅ Fix: Set value type explicitly as an array
    const groups: Record<number, { id: number; name: string; unitId: number }[]> = {};
    
    START_CANDIDATES.forEach(candidate => {
      let areaId = 0;
      let name = candidate.fallbackName;
      let unitId = candidate.id % 1000; // Fallback

      if (lookupData && lookupData.spots && lookupData.districts) {
        const spot = lookupData.spots.get(candidate.id);
        if (spot) {
          name = spot.name; // Override with master data name
          unitId = spot.id % 100; // GDD v3.1: spot sequence is the lower 2 digits
          const district = lookupData.districts.get(spot.parentDistrictId);
          if (district) {
            areaId = district.parentAreaId;
          }
        }
      } else {
        // Legacy logic fallback if lookupData is not retrieved
        areaId = Math.floor(candidate.id / 1000);
      }

      if (!groups[areaId]) groups[areaId] = [];
      groups[areaId].push({ id: candidate.id, name, unitId });
    });
    return groups;
  }, [lookupData]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-[450px] bg-slate-900 border-2 border-orange-500 p-8 rounded-[20px] text-center shadow-[0_0_30px_rgba(249,115,22,0.3)] flex flex-col max-h-[85vh] overflow-hidden">
        
        <div className="flex items-center justify-center gap-3 mb-4 shrink-0">
          <span className="text-2xl">🚩</span>
          <h2 className="text-2xl font-black text-orange-500 italic tracking-[2px] uppercase font-fix m-0 text-left">TERRITORY SELECTION</h2>
        </div>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-6 font-fix shrink-0 text-left">
          Please choose the district that will become your first territory.<br />
          <span className="text-xs text-slate-500 block mt-1 font-fix">Commander, please designate your primary deployment zone from the registry.</span>
        </p>

        <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          {Object.entries(groupedCandidates).map(([areaIdStr, spots]) => {
            const areaId = Number(areaIdStr);
            
            // ✅ Dynamically fetch area name from master data
            let areaName = `UNKNOWN SECTOR ${areaId}`;
            if (lookupData && lookupData.areas) {
              const area = lookupData.areas.get(areaId);
              if (area) areaName = area.name.toUpperCase();
            }

            return (
              <div key={areaId} className="space-y-2">
                // 🚀 Area Header
                <div className="flex items-center gap-2 px-1">
                  <span className="w-1 h-3 bg-orange-500"></span>
                  <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase font-fix">
                    {areaName}
                  </span>
                </div>

                // Destination Buttons
                <div className="grid gap-2">
                  {spots.map(spot => (
                    <button 
                      key={spot.id} 
                      onClick={() => onSelect(spot.id)}
                      className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-700/50 hover:bg-orange-500 hover:border-orange-500 hover:text-slate-950 rounded-lg transition-all group pointer-events-auto"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-mono text-[9px] opacity-50 font-fix group-hover:opacity-100 uppercase">
                          Unit-{String(spot.unitId).padStart(2, '0')}
                        </span>
                        <span className="font-black text-[15px] font-fix">{spot.name}</span>
                      </div>
                      <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        // Footer Decals
        <div className="mt-6 pt-4 border-t border-white/5 shrink-0 flex justify-between items-center">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest font-fix">Neural Link: Online</span>
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest font-fix">B21-AM-CEBU</span>
        </div>
      </div>
      
      <style>{`
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f97316; border-radius: 10px; }
        .font-fix { line-height: 1.2; }
      `}</style>
    </div>
  );
};

export default StartPosModal;