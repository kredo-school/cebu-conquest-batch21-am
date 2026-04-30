// src/components/ActionPanel.tsx
import React, { useMemo, memo } from 'react';
import { useGameStore } from '../store';
import { REACT_TO_PHASER } from '../game/events/PhaserBridge';
import SoundManager from '../game/SoundManager';

/**
 * 🛰️ ActionPanel: プレイヤーの戦術アクションを管理する UI コンポーネント
 * 仕様: 拠点選択が完了するまで「START MISSION」画面を維持する 
 */
export const ActionPanel: React.FC = memo(() => {
  const turn = useGameStore(state => state.turn);
  const selectedDistrictId = useGameStore(state => state.selectedDistrictId);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const ap = useGameStore(state => state.ap);
  const attack = useGameStore(state => state.attack);
  const stay = useGameStore(state => state.stay);
  const endTurn = useGameStore(state => state.endTurn);

  // ✅ GDD v3.1: ルックアップ辞書を取得
  const lookupData = useGameStore(state => state.lookupData);

  /**
   * 🚀 プレイヤーの配置状態を監視
   */
  const myId = useGameStore(state => state.myId);
  const players = useGameStore(state => state.players);
  const me = players.find(p => p.id === myId);
  
  // 自分の districtId が有効な数値（11101等）でない場合は「出撃前」と判定
  const isDeployed = me && me.districtId && me.districtId > 0;

  /**
   * ✅ GDD v3.1: lookupData を使って安全にターゲット情報を取得
   */
  const targetInfo = useMemo(() => {
    if (!selectedDistrictId || !lookupData || !lookupData.districts) return null;

    const district = lookupData.districts.get(selectedDistrictId);
    if (!district) return null;

    // parentAreaId から Area と Island の名前を遡って取得（未定義時はフォールバック）
    const area = lookupData.areas?.get(district.parentAreaId);
    const island = lookupData.islands?.get(area?.parentIslandId);

    return {
      island: island?.name?.toUpperCase() || area?.name?.toUpperCase() || "UNKNOWN SECTOR",
      code: selectedDistrictId, // 例: 131
      name: district.name       // 例: Neon Citadel
    };
  }, [selectedDistrictId, lookupData]);

  /**
   * 🚀 拠点選択（デプロイ）確定処理
   */
  const handleDeploy = () => {
    if (!selectedDistrictId) return;
    try { SoundManager.playSe('click'); } catch(e) {}
    
    // 🚀 PhaserBridge 経由で出撃確定。Payload キー名を GDD v3.0 仕様に完全一致
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, { 
      detail: { startDistrictId: selectedDistrictId } 
    }));
    
    // サーバーの turnStart 信号を待たずに、UIを先行して進行（楽観的更新）
    useGameStore.getState().nextTurn();
  };

  /**
   * 1. 【出撃フェーズ】 ターン 0、または自分の位置が未確定の場合 
   */
  if (turn === 0 || !isDeployed) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center pointer-events-none px-12 z-[100] animate-fadeIn">
        <div className="bg-slate-900/95 backdrop-blur-2xl p-8 w-full max-w-xl flex flex-col items-center gap-6 pointer-events-auto border-t-2 border-orange-500 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-b-2xl text-left">
          <div className="text-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 block font-fix">Strategic Deployment Phase</span>
            {targetInfo ? (
              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter font-fix text-white mb-1">📍 {targetInfo.island}</h2>
                {/* ✅ 地区IDと地区名を表示 */}
                <span className="text-orange-500 font-mono text-sm font-bold bg-orange-500/10 px-3 py-0.5 rounded border border-orange-500/20 uppercase">SEC-{targetInfo.code} : {targetInfo.name}</span>
              </div>
            ) : (
              <h2 className="text-2xl font-black italic uppercase tracking-tighter font-fix text-orange-600 animate-pulse">🗺️ Select Your Starting Base</h2>
            )}
          </div>
          <button 
            onClick={handleDeploy} 
            disabled={!selectedDistrictId} 
            className={`group relative overflow-hidden px-24 py-5 rounded-xl font-black italic tracking-widest text-xl transition-all shadow-2xl font-fix 
              ${selectedDistrictId ? 'bg-orange-600 text-white hover:bg-orange-500 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}
          >
            <div className="relative z-10 text-left">START MISSION</div>
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-15deg]"></div>
          </button>
          {!selectedDistrictId && (
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest animate-bounce">マップ上の地区をクリックして選択してください</p>
          )}
        </div>
      </div>
    );
  }

  /**
   * 2. 【待機フェーズ】 相手のターン中
   */
  if (!isMyTurn) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none z-50">
        <div className="bg-slate-900/80 backdrop-blur-md px-12 py-4 rounded-full border border-white/5 flex items-center gap-4 animate-pulse shadow-2xl">
          <span className="w-2 h-2 bg-slate-500 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]"></span>
          <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] font-fix">Processing Enemy Intel...</span>
        </div>
      </div>
    );
  }

  /**
   * 3. 【行動フェーズ】 自分のターン：メインアクション
   */
  const canAttack = selectedDistrictId && ap >= 5;

  return (
    <div className="absolute bottom-12 left-80 right-12 flex items-end justify-between pointer-events-none z-50 text-left">
      <div className="flex-1"></div>
      <div className="flex gap-3 items-end pointer-events-auto">
        
        {/* ⚔️ Engagement (攻撃) - AP 5 消費 */}
        <button 
          onClick={() => { if (selectedDistrictId) { try { SoundManager.playSe('click'); } catch(e) {} attack(selectedDistrictId); } }} 
          disabled={!canAttack}
          className={`group relative overflow-hidden rounded-2xl font-black italic tracking-widest transition-all duration-200 flex flex-col items-center justify-center gap-1 w-40 h-28 text-xl
            ${canAttack 
              ? 'bg-orange-600 text-white shadow-[0_10px_40px_rgba(234,88,12,0.4)] hover:bg-orange-500 hover:scale-105 active:scale-95 border-b-4 border-orange-800' 
              : 'bg-slate-900/95 text-slate-600 border border-white/5 cursor-not-allowed backdrop-blur-md shadow-inner opacity-50'}`}
        >
          <span className="material-symbols-outlined text-4xl group-enabled:group-hover:scale-110 transition-transform" style={{ fontVariationSettings: '"FILL" 1' }}>swords</span>
          <span className="font-fix uppercase tracking-tighter text-[10px]">Engagement</span>
          <div className="absolute top-0 right-0 p-1 opacity-20 text-[8px] font-mono uppercase">Cost: 5 AP</div>
        </button>

        {/* 🧘 Neural Recover (回復) - Stay アクション */}
        <button 
          onClick={() => { try { SoundManager.playSe('click'); } catch(e) {} stay(); }} 
          className="group bg-slate-900/90 backdrop-blur-xl border border-white/10 text-slate-400 rounded-2xl font-black hover:bg-slate-800 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-32 h-28 text-sm shadow-2xl"
        >
          <span className="material-symbols-outlined text-emerald-400 text-3xl group-hover:scale-110 transition-transform">monitoring</span>
          <span className="font-fix uppercase tracking-widest text-[9px]">Recover</span>
        </button>

        {/* 🚀 Turn End (ターン終了承認) */}
        <button 
          onClick={() => { try { SoundManager.playSe('click'); } catch(e) {} endTurn(); }} 
          className="group bg-blue-950/40 border-2 border-blue-500/30 text-blue-400 rounded-2xl font-black hover:bg-blue-600 hover:text-white hover:border-blue-400 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-32 h-28 text-sm shadow-[0_0_20px_rgba(59,130,246,0.2)]"
        >
          <span className="material-symbols-outlined text-3xl group-hover:rotate-180 transition-transform duration-500">logout</span>
          <span className="font-fix uppercase tracking-widest text-[9px]">Turn End</span>
        </button>
      </div>

      <style>{`
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .font-fix { line-height: 1.2; }
      `}</style>
    </div>
  );
});