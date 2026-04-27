import React, { useState } from 'react';
import { useGameStore } from '../store';

interface GodSelectionViewProps {
  onComplete: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

const GOD_SLOTS = [
  { id: 1, name: "ラプラプの加護", role: "WAR", bonus: "ATK +20", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=400", desc: "島嶼戦における近接攻撃ダメージを25%上昇させ、物理防御力を強化する。" },
  { id: 2, name: "マクタンの知恵", role: "STRATEGIST", bonus: "MAX AP +30", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400", desc: "全分隊員のタクティカルアビリティのクールダウンを15%短縮する。" },
  { id: 3, name: "アポ・ラキの怒り", role: "BURN", bonus: "SOLAR", img: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=400", desc: "昼間戦闘フェーズ中、全ての弾薬にソーラーバーン（焼尽）効果を付与する。" },
  { id: 4, name: "マヤリの静寂", role: "STEALTH", bonus: "SILENT", img: "https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=400", desc: "隠密探知範囲を拡大し、足音の静音性を40%向上させる。" },
  { id: 5, name: "ルマウィグの力", role: "HEAVY", bonus: "ARMOR +40", img: "https://images.unsplash.com/photo-1584281722573-0f723675017e?q=80&w=400", desc: "アーマーの耐久値を増加させ、燃焼ステータス効果を無効化する。" },
  { id: 6, name: "ハヌマンの疾風", role: "SUPPORT", bonus: "SPEED +15", img: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=400", desc: "山岳地帯におけるダッシュ速度とジャンプ高度を20%向上させる。" },
  { id: 7, name: "バクナワの影", role: "SHADOW", bonus: "INVIS", img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=400", desc: "マッチの夜間サイクル中、一時的な不可視化（インビジビリティ）を可能にする。" },
  { id: 8, name: "イダナレの恵み", role: "RECON", bonus: "SCAN", img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=400", desc: "障害物越しにリソースクレートや敵の足跡をハイライト表示する。" },
];

export const GodSelectionView: React.FC<GodSelectionViewProps> = ({ onComplete }) => {
  const { selectGod, players, myId, selectedGodId, maxPlayers } = useGameStore();
  
  const [pendingSelection, setPendingSelection] = useState<typeof GOD_SLOTS[0] | null>(null);

  const humanPlayers = players.filter(p => !p.isNpc);
  const totalCount = maxPlayers || 4;
  const readyCount = humanPlayers.filter(p => p.selectedGodId || p.godId).length;

  const getLockInfo = (godId: number) => {
    const selector = players.find(p => p.id !== myId && (p.selectedGodId === godId || p.godId === godId));
    if (selector) return { name: selector.playerName || "Operator" };
    return null;
  };

  const handleFinalSelect = () => {
    if (pendingSelection) {
      selectGod(pendingSelection.id);
      onComplete(); 
    }
  };

  return (
    // 🚀 修正：fixed inset-0 ではなく absolute w-full h-full を使用し、親コンテナ（App.tsx）のサイズに完全に追従させる
    <div className="absolute w-full h-full z-[10000] bg-slate-950 font-body text-slate-200 select-none flex items-center justify-center p-4">
      
      <div className="w-full max-w-6xl h-[90vh] flex flex-col bg-zinc-950/60 border border-white/10 rounded-lg overflow-hidden relative shadow-2xl backdrop-blur-md">
        
        <div className="px-8 py-6 flex flex-col items-start gap-1 shrink-0">
          {/* 🚀 修正：font-fix追加 */}
          <h1 className="text-2xl font-black italic tracking-tighter text-orange-500 uppercase font-fix">
            Choose the god you believe in
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-400"></span>
            {/* 🚀 修正：font-fix追加 */}
            <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold font-fix">
              分隊待機中: {readyCount} / {totalCount} 準備完了
            </span>
          </div>
        </div>

        {/* 🚀 修正：スクロールバーのスタイルは global(index.css) に任せるためクラスのみ適用 */}
        <div className="flex-1 px-8 pb-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {GOD_SLOTS.map((god) => {
              const lock = getLockInfo(god.id);
              const isSelected = pendingSelection?.id === god.id || selectedGodId === god.id;

              return (
                <div 
                  key={god.id} 
                  onClick={() => !lock && setPendingSelection(god)}
                  className={`group relative flex flex-col bg-zinc-900/30 border transition-all duration-300 cursor-pointer h-full ${
                    isSelected 
                      ? "border-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.3)]" 
                      : lock ? "border-white/5 opacity-40 grayscale cursor-not-allowed" : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="relative h-28 overflow-hidden bg-zinc-800">
                    <img src={god.img} className="w-full h-full object-cover" alt={god.name} />
                    
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-orange-600/20 backdrop-blur-[1px]">
                        {/* 🚀 修正：font-fix追加 */}
                        <div className="bg-orange-600 text-black text-[9px] font-black px-3 py-1 skew-x-[-15deg] border-r-4 border-black shadow-lg font-fix">
                          あなた (SELECTED)
                        </div>
                      </div>
                    )}
                    
                    {lock && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                         {/* 🚀 修正：font-fix追加 */}
                         <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest border border-zinc-700 px-2 py-1 font-fix">ロック中</span>
                         <span className="text-[8px] text-zinc-600 mt-1 uppercase font-fix">{lock.name}</span>
                      </div>
                    )}

                    {/* 🚀 修正：font-fix追加 */}
                    <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 text-[7px] font-black text-cyan-400 border border-cyan-400/20 uppercase tracking-widest font-fix">
                      {god.role}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1 gap-2 text-left">
                    {/* 🚀 修正：font-fix追加 */}
                    <h3 className={`text-sm font-bold tracking-tight font-fix ${lock ? 'text-zinc-600' : 'text-zinc-100'}`}>{god.name}</h3>
                    <p className={`text-[10px] leading-tight line-clamp-3 font-fix ${lock ? 'text-zinc-700' : 'text-zinc-400'}`}>{god.desc}</p>
                    
                    {/* 🚀 修正：font-fix追加 */}
                    <button className={`mt-auto w-full py-1.5 text-[9px] font-black uppercase tracking-widest border transition-all font-fix ${
                      isSelected ? 'bg-orange-600 text-black border-orange-600' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {isSelected ? "選択済み" : lock ? "ロック中" : "選択する"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-8 py-6 border-t border-white/5 bg-black/20 flex items-end justify-between shrink-0">
          {/* 🚀 修正：font-fix追加 */}
          <button className="px-5 py-2 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all font-fix">
            Return to the lobby
          </button>

          <div className={`flex flex-col items-end gap-3 transition-all duration-500 ${pendingSelection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            {/* 🚀 修正：font-fix追加 */}
            <p className="text-zinc-400 text-[9px] uppercase tracking-[0.2em] font-bold italic font-fix">
              Do you believe in <span className="text-orange-500 underline">'{pendingSelection?.name}'</span>?
            </p>
            {/* 🚀 修正：font-fix追加 */}
            <button 
              onClick={handleFinalSelect}
              className="px-12 py-3 bg-orange-600 text-black text-[11px] font-black uppercase tracking-widest hover:brightness-110 shadow-[0_0_30px_rgba(234,88,12,0.4)] active:scale-95 transition-all font-fix"
            >
              Yes, I believe in it
            </button>
          </div>
        </div>
      </div>
      
      {/* 🚀 不要な <style> ブロックを削除 */}
    </div>
  );
};