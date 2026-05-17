/// <reference types="vite/client" />
import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      {/* Background Blur */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>

      {/* Monitor Panel */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-cyan-500/20 bg-cyan-500/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-cyan-400 italic tracking-tighter uppercase font-fix">Tactical Manual</h2>
            <p className="text-[10px] text-cyan-700 font-bold tracking-[0.3em] uppercase mt-1 font-fix">Operation: Cebu Conquest</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
          
          {/* Section 1: Objective */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-cyan-400">target</span>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest font-fix">01. Victory Conditions</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed pl-11 font-fix">
              Annihilate enemy presence across Cebu Island sectors. The Commander who secures the **highest occupancy rate (Occupancy)** by the end of the operation claims ultimate territorial dominance. Annex hostile hubs and expand your network grid.
            </p>
          </section>

          {/* Section 2: Resources */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-cyan-400">bolt</span>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest font-fix">02. Resource Management</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-11">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <span className="text-cyan-400 font-black text-[10px] uppercase block mb-2 font-fix">AP (Action Points)</span>
                <p className="text-slate-300 text-xs font-fix">Required for execution parameters including relocation, offensive assaults, and sector annexation. Regenerates automatically at the start of each turn matrix.</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <span className="text-orange-400 font-black text-[10px] uppercase block mb-2 font-fix">Armor (HP)</span>
                <p className="text-slate-300 text-xs font-fix">Represents baseline unit structural durability. Dropping to 0 results in complete combat link disconnection, risking total network grid forfeiture.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Divine Blessings */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-cyan-400">auto_awesome</span>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest font-fix">03. Guardian Blessings</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed pl-11 mb-4 font-fix">
              Unique parameter modifiers and active tactical buffs are established based on the guardian deity synchronized prior to squad deployment.
            </p>
            <ul className="grid grid-cols-2 gap-3 pl-11 text-[11px] text-slate-500 font-bold uppercase italic">
              <li className="font-fix">• Lapu-Lapu: Offensive Augmentation</li>
              <li className="font-fix">• Sebuna: Maximum AP Expansion</li>
              <li className="font-fix">• Kredo: Network Sync Acceleration</li>
              <li className="font-fix">• Bakunawa: Tactical Cloaking Protocols</li>
            </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/50 border-t border-cyan-500/10 text-center">
          <p className="text-[9px] text-cyan-900 font-black tracking-[0.5em] uppercase font-fix">System: Manual v1.0.4 - Operational</p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;