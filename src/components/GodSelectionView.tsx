import React, { useState, memo, useMemo } from 'react';
import { useGameStore } from '../store';
import { REACT_TO_PHASER } from '../game/events/PhaserBridge';
import socket from '../socket';
import { CLIENT_EVENTS } from '../../shared/socketEvents.js';

interface GodSelectionViewProps {
  onComplete: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onBack: () => void;
}

interface GodSlot {
  id: number;
  textureKey: string;
  name: string;
  role: string;
  bonus: string;
  img: string;
  desc: string;
}

const INTERNAL_SPAWN_MAP: Record<number, number> = {
  1: 1201, 2: 1205, 3: 1101, 4: 1501, 
  5: 1120, 6: 1301, 7: 1401, 8: 1108, 
};

const GOD_SLOTS: GodSlot[] = [
  { id: 1, textureKey: 'god-neil',   name: "Neil", role: "WAR",         bonus: "ATK +20",    img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=400", desc: "近接攻撃ダメージ+25%、物理防御力強化。" },
  { id: 2, textureKey: 'god-garry',  name: "Garry", role: "STRATEGIST", bonus: "MAX AP +30", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400", desc: "タクティカルアビリティのクールダウン-15%。" },
  { id: 3, textureKey: 'god-shem',   name: "Shem", role: "BURN",       bonus: "SOLAR",      img: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=400", desc: "昼間戦闘フェーズ中、全弾薬にソーラーバーン効果付与。" },
  { id: 4, textureKey: 'god-quisie', name: "Quisie", role: "STEALTH",    bonus: "SILENT",     img: "https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=400", desc: "隠密探知範囲を拡大、足音の静音性+40%。" },
  { id: 5, textureKey: 'god-eduardo', name: "Eduardo", role: "HEAVY",      bonus: "ARMOR +40",  img: "https://images.unsplash.com/photo-1584281722573-0f723675017e?q=80&w=400", desc: "アーマー耐久値増加、燃焼ステータス無効化。" },
  { id: 6, textureKey: 'god-kurt',   name: "Kurt", role: "SUPPORT",    bonus: "SPEED +15",  img: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=400", desc: "山岳地帯ダッシュ速度・ジャンプ高度+20%。" },
  { id: 7, textureKey: 'god-stephen', name: "Stephen", role: "SHADOW",     bonus: "INVIS",      img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=400", desc: "夜間サイクル中の一時的な不可視化。" },
  { id: 8, textureKey: 'god-bernardine', name: "Bernardine", role: "RECON",      bonus: "SCAN",       img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=400", desc: "障害物越しのリソース・敵足跡をハイライト。" },
];

export const GodSelectionView: React.FC<GodSelectionViewProps> = memo(({ 
  onComplete, 
  onBack 
}) => {
  const players = useGameStore(state => state.players);
  const myId = useGameStore(state => state.myId);
  const selectedGodId = useGameStore(state => state.selectedGodId);
  const maxPlayers = useGameStore(state => state.maxPlayers);
  const errorMessage = useGameStore(state => state.errorMessage);
  const hideError = useGameStore(state => state.hideError);
  
  const [pendingSelection, setPendingSelection] = useState<GodSlot | null>(() => {
    if (!selectedGodId) return null;
    return GOD_SLOTS.find(g => g.id === selectedGodId) || null;
  });

  const readyInfo = useMemo(() => {
    return {
      total: maxPlayers || 2,
      ready: players.filter(p => p.selectedGodId || p.godId).length
    };
  }, [players, maxPlayers]);

  // 🚀 修正: 他のプレイヤー（自分以外）が既にその神をロックしているか判定
  const getLockInfo = (godId: number) => {
    const selector = players.find(p => p.id !== myId && (Number(p.selectedGodId) === godId || Number(p.godId) === godId));
    if (selector) return { name: selector.playerName || selector.username || "Operator" }; 
    return null;
  };

  const handleFinalSelect = () => {
    if (!pendingSelection) return;
    if (getLockInfo(pendingSelection.id)) return;
    if (selectedGodId !== null) return; 

    hideError();
    const godId = pendingSelection.id;
    const startId = INTERNAL_SPAWN_MAP[godId];

    const updatedPlayers = players.map(p => 
        p.id === myId ? { ...p, selectedGodId: godId, godId: godId, isReady: true } : p
    );

    useGameStore.setState({ 
      selectedGodId: godId,
      selectedDistrictId: startId,
      players: updatedPlayers
    });
    
    socket.emit(CLIENT_EVENTS.READY_TO_START, { 
      godId: godId, 
      districtId: startId 
    });
    
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.SET_AVATAR, { 
      detail: { godKey: pendingSelection.textureKey }
    }));
    
    onComplete(); 
  };

  return (
    <div className="absolute w-full h-full z-[10000] bg-slate-950 font-body text-slate-200 select-none flex items-center justify-center p-4 overflow-hidden text-left">
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]"></div>
      <div className="w-full max-w-6xl h-[90vh] flex flex-col bg-zinc-950/80 border border-white/10 rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-fadeIn text-left">
        
        {errorMessage && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[11000] min-w-[400px] animate-bounce text-left">
            <div className="bg-red-600/90 border border-red-400 text-white px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-4 text-left">
              <span className="material-symbols-outlined text-xl">warning</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1 text-left">Signal Error</span>
                <span className="text-sm font-black font-fix text-left">{errorMessage}</span>
              </div>
              <button onClick={hideError} className="ml-auto hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        )}

        <div className="px-10 py-8 flex flex-col items-start gap-1 shrink-0 border-b border-white/5 text-left">
          <h1 className="text-3xl font-black italic tracking-tighter text-orange-500 uppercase font-fix animate-glitch-text text-left">
            Choose the god you believe in
          </h1>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-400 font-black font-fix text-left">
              Syncing Units: {readyInfo.ready} / {readyInfo.total} Ready for Deployment
            </span>
          </div>
        </div>

        <div className="flex-1 px-10 py-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GOD_SLOTS.map((god) => {
              const lock = getLockInfo(god.id); 
              const isSelected = pendingSelection?.id === god.id;

              return (
                <div 
                  key={god.id} 
                  // 🚀 修正: ロックされている、または既に自分が確定済みの場合はクリック無効
                  onClick={() => !lock && selectedGodId === null && setPendingSelection(god)} 
                  className={`group relative flex flex-col bg-zinc-900/40 border-2 transition-all duration-300 rounded-xl overflow-hidden ${
                    isSelected 
                      ? "border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)] scale-[1.02]" 
                      : lock 
                        ? "border-transparent opacity-30 grayscale cursor-not-allowed" 
                        : selectedGodId !== null
                          ? "border-white/5 opacity-50 cursor-default" // 自分が確定済みなら他のカードを暗くする
                          : "border-white/5 hover:border-white/20 hover:bg-zinc-800/50 cursor-pointer"
                  }`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={god.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={god.name} />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-orange-600/30 backdrop-blur-sm">
                        <div className="bg-orange-500 text-black text-[10px] font-black px-4 py-1 skew-x-[-15deg] border-r-4 border-black font-fix text-left">
                          LINK ESTABLISHED
                        </div>
                      </div>
                    )}
                    {lock && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                         <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-zinc-700 px-3 py-1 font-fix mb-2 text-left text-center">Occupied</div>
                         <div className="text-[9px] text-orange-500 uppercase font-black font-fix animate-pulse text-left text-center">
                           Locked by {lock.name}
                         </div>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-black/80 px-2 py-1 text-[8px] font-black text-cyan-400 border border-cyan-400/30 uppercase tracking-widest font-fix text-left">
                      {god.role}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1 gap-3 text-left">
                    <h3 className={`text-lg font-black tracking-tight font-fix italic ${lock ? 'text-zinc-600' : 'text-white'}`}>
                      {god.name}
                    </h3>
                    <div className="h-px w-8 bg-orange-500/50"></div>
                    <p className={`text-[11px] leading-relaxed line-clamp-3 font-fix ${lock ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      {god.desc}
                    </p>
                    <div className={`mt-auto pt-4 flex items-center justify-between text-[10px] font-black font-fix ${lock ? 'text-zinc-700' : 'text-orange-500/80'}`}>
                       <span>BONUS: {god.bonus}</span>
                       <span className="material-symbols-outlined text-sm">bolt</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-10 py-8 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0 text-left">
          {/* 🚀 修正: 確定後は戻るボタンを消す（一方通行フロー） */}
          {selectedGodId === null ? (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all font-fix"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Abort Selection</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-6 py-3 text-cyan-500/40 text-[10px] font-black uppercase tracking-widest font-fix">
              <span className="material-symbols-outlined text-sm">lock</span>
              Neural Link Finalized
            </div>
          )}

          <div className={`flex flex-col items-end gap-3 transition-all duration-500 ${pendingSelection && !getLockInfo(pendingSelection.id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black italic font-fix">
              Initialize synchronization with <span className="text-orange-500 underline underline-offset-4">'{pendingSelection?.name}'</span>?
            </p>
            <button 
              onClick={handleFinalSelect}
              disabled={selectedGodId !== null} 
              className={`group relative px-16 py-4 text-black text-[12px] font-black uppercase tracking-widest overflow-hidden transition-all font-fix text-left
                ${selectedGodId !== null 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-orange-600 shadow-[0_0_30px_rgba(234,88,12,0.4)] active:scale-95'}`}
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-15deg]"></div>
              {selectedGodId !== null ? 'SYNC ESTABLISHED' : 'Confirm Neural Link'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(1.05); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes glitch-text {
          0% { text-shadow: 2px 0 #ff0000, -2px 0 #00ff00; }
          25% { text-shadow: -2px 0 #ff0000, 2px 0 #00ff00; }
          50% { text-shadow: 2px 2px #ff0000, -2px -2px #00ff00; }
          100% { text-shadow: none; }
        }
        .animate-glitch-text { animation: glitch-text 4s infinite linear alternate-reverse; }
        .font-fix { line-height: 1.2; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f97316; border-radius: 10px; }
      `}</style>
    </div>
  );
});

export default GodSelectionView;