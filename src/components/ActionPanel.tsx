/// <reference types="vite/client" />
import React, { useMemo, memo } from "react";
import { useGameStore } from "../store";
import { REACT_TO_PHASER, emitToPhaser } from "../game/events/PhaserBridge";
import SoundManager from "../game/SoundManager";

/**
 * 🛰️ ActionPanel: プレイヤーの戦術アクションを管理する UI コンポーネント
 */
export const ActionPanel: React.FC = memo(() => {
  const turn = useGameStore((state) => state.turn);
  const selectedDistrictId = useGameStore((state) => state.selectedDistrictId);
  const isMyTurn = useGameStore((state) => state.isMyTurn);
  const ap = useGameStore((state) => state.ap);
  const attack = useGameStore((state) => state.attack);
  const stay = useGameStore((state) => state.stay);
  const addLog = useGameStore((state) => state.addLog); // 🚀 エラー表示用

  // ✅ GDD v3.1: ルックアップ辞書を取得
  const lookupData = useGameStore((state) => state.lookupData);

  /**
   * 🚀 プレイヤーの配置状態を監視
   */
  const myId = useGameStore((state) => state.myId);
  const players = useGameStore((state) => state.players);
  const me = players.find((p) => p.id === myId);

  // 自分の districtId が有効な数値でない場合は「出撃前」と判定
  const isDeployed = !!(me && me.districtId && me.districtId > 0);

  /**
   * ✅ GDD v3.1: lookupData を使って安全にターゲット情報を取得
   */
  const targetInfo = useMemo(() => {
    if (!selectedDistrictId || !lookupData) return null;

    // selectedDistrictId は5桁spotId。lookupData.districtsは3桁キーのため変換する
    const distId = selectedDistrictId >= 10000
      ? Math.floor(selectedDistrictId / 100)
      : selectedDistrictId;
    const district = lookupData.districts.get(distId);
    if (!district) return null;

    const areaId = district.parentAreaId;
    const area = areaId !== undefined && areaId !== null ? lookupData.areas.get(areaId) : undefined;
    const islandId = area?.parentIslandId;
    const island = islandId !== undefined && islandId !== null ? lookupData.islands.get(islandId) : undefined;

    return {
      island: island?.name?.toUpperCase() || area?.name?.toUpperCase() || "UNKNOWN SECTOR",
      code: selectedDistrictId,
      name: district.name,
    };
  }, [selectedDistrictId, lookupData]);

  /**
   * 🚀 拠点選択確定処理
   */
  const handleDeploy = () => {
    if (typeof selectedDistrictId !== "number") return;
    emitToPhaser(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, {
      startSpotId: selectedDistrictId,
    });
    useGameStore.getState().nextTurn();
  };

  /**
   * 🚀 攻撃実行（APチェック）
   */
  const handleAttack = () => {
    if (typeof selectedDistrictId === "number") {
      if (ap >= 5) {
        try { SoundManager.playSe("click"); } catch {}
        attack(selectedDistrictId);
      } else {
        // 🚀 英語化対応
        addLog("⚠️ Insufficient Energy! Command execution failed.");
      }
    }
  };

  /**
   * 1. 【出撃フェーズ】
   */
  if (turn === 0 || !isDeployed) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center pointer-events-none px-12 z-[100] animate-fadeIn text-left">
        <div className="bg-slate-900/95 backdrop-blur-2xl p-8 w-full max-w-xl flex flex-col items-center gap-6 pointer-events-auto border-t-2 border-orange-500 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-b-2xl">
          <div className="text-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 block font-fix">
              Strategic Deployment Phase
            </span>
            {targetInfo ? (
              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter font-fix text-white mb-1">
                  📍 {targetInfo.island}
                </h2>
                <span className="text-orange-500 font-mono text-sm font-bold bg-orange-500/10 px-3 py-0.5 rounded border border-orange-500/20 uppercase">
                  SEC-{targetInfo.code} : {targetInfo.name}
                </span>
              </div>
            ) : (
              <h2 className="text-2xl font-black italic uppercase tracking-tighter font-fix text-orange-600 animate-pulse">
                🗺️ Select Your Starting Base
              </h2>
            )}
          </div>
          <button
            onClick={handleDeploy}
            disabled={typeof selectedDistrictId !== "number"}
            className={`group relative overflow-hidden px-24 py-5 rounded-xl font-black italic tracking-widest text-xl transition-all shadow-2xl font-fix 
              ${typeof selectedDistrictId === "number" ? "bg-orange-600 text-white hover:bg-orange-500 active:scale-95" : "bg-slate-800 text-slate-600 cursor-not-allowed opacity-50"}`}
          >
            <div className="relative z-10">START MISSION</div>
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-15deg]"></div>
          </button>
        </div>
      </div>
    );
  }

  /**
   * 2. 【待機フェーズ】
   */
  if (!isMyTurn) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none z-50 text-left">
        <div className="bg-slate-900/80 backdrop-blur-md px-12 py-4 rounded-full border border-white/5 flex items-center gap-4 animate-pulse shadow-2xl">
          <span className="w-2 h-2 bg-slate-500 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]"></span>
          <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] font-fix">
            Processing Enemy Intel...
          </span>
        </div>
      </div>
    );
  }

  /**
   * 3. 【行動フェーズ】
   */
  return (
    <div className="absolute bottom-12 left-80 right-12 flex items-end justify-between pointer-events-none z-50 text-left">
      <div className="flex-1"></div>
      <div className="flex gap-3 items-end pointer-events-auto">
        
        {/* ⚔️ Engagement (攻撃) - AP 5 未満でロック ＆ 視覚的フィードバック */}
        <button
          onClick={handleAttack}
          disabled={typeof selectedDistrictId !== "number" || ap < 5}
          className={`group relative overflow-hidden rounded-2xl font-black italic tracking-widest transition-all duration-200 flex flex-col items-center justify-center gap-1 w-40 h-28 text-xl
            ${
              typeof selectedDistrictId === "number" && ap >= 5
                ? "bg-orange-600 text-white shadow-[0_10px_40px_rgba(234,88,12,0.4)] hover:bg-orange-500 hover:scale-105 active:scale-95 border-b-4 border-orange-800"
                : "bg-slate-900/95 text-slate-700 border border-red-500/20 cursor-not-allowed backdrop-blur-md shadow-inner opacity-40 grayscale"
            }`}
        >
          <span
            className={`material-symbols-outlined text-4xl transition-transform ${ap < 5 ? 'text-red-500' : 'group-enabled:group-hover:scale-110'}`}
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            {ap < 5 ? 'battery_critical' : 'swords'}
          </span>
          <span className="font-fix uppercase tracking-tighter text-[10px]">
            {ap < 5 ? 'LOW ENERGY' : 'Engagement'}
          </span>
          <div className={`absolute top-0 right-0 p-1 text-[8px] font-mono uppercase ${ap < 5 ? 'text-red-500 animate-pulse' : 'opacity-20'}`}>
            Cost: 5 AP
          </div>
        </button>

        {/* 🧘 Recover (待機/回復) - 🚀 詰み回避のため常に選択可能 */}
        <button
          onClick={() => {
            try { SoundManager.playSe("click"); } catch {}
            stay();
          }}
          className="group bg-slate-900/90 backdrop-blur-xl border border-white/10 text-slate-400 rounded-2xl font-black hover:bg-slate-800 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-32 h-28 text-sm shadow-2xl"
        >
          <span className="material-symbols-outlined text-emerald-400 text-3xl group-hover:scale-110 transition-transform">
            monitoring
          </span>
          <span className="font-fix uppercase tracking-widest text-[9px]">Recover</span>
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

export default ActionPanel;