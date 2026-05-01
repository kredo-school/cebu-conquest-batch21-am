// src/components/GodSelectionView.tsx

import React, { useState, memo, useMemo, useEffect } from 'react';
import { useGameStore } from '../store';
import { REACT_TO_PHASER } from '../game/events/PhaserBridge';

interface GodSelectionViewProps {
  onComplete: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onBack: () => void;
}

const GOD_SLOTS = [
  { id: 1, textureKey: 'god-john',   name: "ラプラプの加護", role: "WAR",         bonus: "ATK +20",    img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=400", desc: "島嶼戦における近接攻撃ダメージを25%上昇させ、物理防御力を強化する。" },
  { id: 2, textureKey: 'god-garry',  name: "マクタンの知恵", role: "STRATEGIST", bonus: "MAX AP +30", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400", desc: "全分隊員のタクティカルアビリティのクールダウンを15%短縮する。" },
  { id: 3, textureKey: 'god-quesie', name: "アポ・ラキの怒り", role: "BURN",      bonus: "SOLAR",      img: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=400", desc: "昼間戦闘フェーズ中、全ての弾薬にソーラーバーン（焼尽）効果を付与する。" },
  { id: 4, textureKey: 'god-neil',   name: "マヤリの静寂",   role: "STEALTH",   bonus: "SILENT",     img: "https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=400", desc: "隠密探知範囲を拡大し、足音の静音性を40%向上させる。" },
  { id: 5, textureKey: 'god-edo',    name: "ルマウィグの力", role: "HEAVY",      bonus: "ARMOR +40",  img: "https://images.unsplash.com/photo-1584281722573-0f723675017e?q=80&w=400", desc: "アーマーの耐久値を増加させ、燃焼ステータス効果を無効化する。" },
  { id: 6, textureKey: 'god-shem',   name: "ハヌマンの疾風", role: "SUPPORT",   bonus: "SPEED +15",  img: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=400", desc: "移動速度と回避率を上昇させる。" },
  { id: 7, textureKey: 'god-kurt',   name: "バクナワの影",   role: "SHADOW",    bonus: "INVIS",      img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=400", desc: "マッチの夜間サイクル中、一時的な不可視化（インビジビリティ）を可能にする。" },
  { id: 8, textureKey: 'god-secret', name: "イダナレの恵み", role: "RECON",     bonus: "SCAN",       img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=400", desc: "障害物越しにリソースクレートや敵の足跡をハイライト表示する。" },
];

export const GodSelectionView: React.FC<GodSelectionViewProps> = memo(({ 
  onComplete, 
  onBack 
}) => {
  const selectGod = useGameStore(state => state.selectGod);
  const players = useGameStore(state => state.players);
  const myId = useGameStore(state => state.myId);
  const selectedGodId = useGameStore(state => state.selectedGodId);
  const maxPlayers = useGameStore(state => state.maxPlayers);
  
  // ✅ 修正：エラーメッセージ表示用のストア取得
  const errorMessage = useGameStore(state => state.errorMessage);
  const hideError = useGameStore(state => state.hideError);
  
  const [pendingSelection, setPendingSelection] = useState<typeof GOD_SLOTS[0] | null>(null);

  // 🚀 画面表示時に、もし既に神が選ばれていたら選択状態を復元（ロールバック対策）
  useEffect(() => {
    if (selectedGodId) {
      const current = GOD_SLOTS.find(g => g.id === selectedGodId);
      if (current) setPendingSelection(current);
    }
  }, [selectedGodId]);

  const readyInfo = useMemo(() => {
    const humanPlayers = players.filter(p => !p.isNpc);
    return {
      total: maxPlayers || 4,
      ready: humanPlayers.filter(p => p.selectedGodId || p.godId).length
    };
  }, [players, maxPlayers]);

  const getLockInfo = (godId: number) => {
    const selector = players.find(p => p.id !== myId && (Number(p.selectedGodId) === godId || Number(p.godId) === godId));
    if (selector) return { name: selector.playerName || "Operator" };
    return null;
  };

  const handleFinalSelect = () => {
    if (!pendingSelection) return;
    
    // 1. 選択前にエラー表示をクリア
    hideError();
    
    // 2. Zustand経由でサーバーへ送信
    selectGod(pendingSelection.id);
    
    // 3. Phaser更新
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.SET_AVATAR, { 
      detail: { godKey: pendingSelection.textureKey }
    }));
    
    onComplete(); 
  };

  return (
    <div className="absolute w-full h-full z-[10000] bg-slate-950 font-body text-slate-200 select-none flex items-center justify-center p-4 overflow-hidden">
      
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]"></div>

      <div className="w-full max-w-6xl h-[90vh] flex flex-col bg-zinc-950/80 border border-white/10 rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-fadeIn">
        
        {/* ✅ 修正：エラートースト表示エリア */}
        {errorMessage && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[11000] min-w-[400px] animate-bounce">
            <div className="bg-red-600/90 border border-red-400 text-white px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-4">
              <span className="material-symbols-outlined text-xl">warning</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">Signal Error</span>
                <span className="text-sm font-black font-fix">{errorMessage}</span>
              </div>
              <button onClick={hideError} className="ml-auto hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        )}

        {/* ヘッダーエリア */}
        <div className="px-10 py-8 flex flex-col items-start gap-1 shrink-0 border-b border-white/5">
          <h1 className="text-3xl font-black italic tracking-tighter text-orange-500 uppercase font-fix animate-glitch-text">
            Choose the god you believe in
          </h1>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-400 font-black font-fix">
              Syncing Units: {readyInfo.ready} / {readyInfo.total} Ready for Deployment
            </span>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="flex-1 px-10 py-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GOD_SLOTS.map((god) => {
              const lock = getLockInfo(god.id); 
              const isSelected = pendingSelection?.id === god.id;

              return (
                <div 
                  key={god.id} 
                  onClick={() => !lock && setPendingSelection(god)} 
                  className={`group relative flex flex-col bg-zinc-900/40 border-2 transition-all duration-300 cursor-pointer rounded-xl overflow-hidden ${
                    isSelected 
                      ? "border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)] scale-[1.02]" 
                      : lock 
                        ? "border-transparent opacity-30 grayscale cursor-not-allowed" 
                        : "border-white/5 hover:border-white/20 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={god.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={god.name} />
                    
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-orange-600/30 backdrop-blur-sm">
                        <div className="bg-orange-500 text-black text-[10px] font-black px-4 py-1 skew-x-[-15deg] border-r-4 border-black font-fix">
                          LINK ESTABLISHED
                        </div>
                      </div>
                    )}
                    
                    {lock && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                         <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-zinc-700 px-3 py-1 font-fix mb-2">Occupied</div>
                         <div className="text-[9px] text-orange-500 uppercase font-black font-fix animate-pulse">
                           Locked by {lock.name}
                         </div>
                      </div>
                    )}

                    <div className="absolute top-3 right-3 bg-black/80 px-2 py-1 text-[8px] font-black text-cyan-400 border border-cyan-400/30 uppercase tracking-widest font-fix">
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

        {/* フッターエリア */}
        <div className="px-10 py-8 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all font-fix"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Abort Selection
          </button>

          <div className={`flex flex-col items-end gap-3 transition-all duration-500 ${pendingSelection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black italic font-fix">
              Initialize synchronization with <span className="text-orange-500 underline underline-offset-4">'{pendingSelection?.name}'</span>?
            </p>
            <button 
              onClick={handleFinalSelect}
              className="group relative px-16 py-4 bg-orange-600 text-black text-[12px] font-black uppercase tracking-widest overflow-hidden transition-all shadow-[0_0_30px_rgba(234,88,12,0.4)] active:scale-95 font-fix"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-15deg]"></div>
              Confirm Neural Link
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