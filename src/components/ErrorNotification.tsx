import React, { useEffect, memo } from 'react';
import { useGameStore } from '../store';

/**
 * 🛰️ ErrorNotification: サーバーからの拒絶応答や通信エラーを表示
 * 担当: いっせい (React + Vite + TS) [cite: 13]
 * 仕様: Week 5 エラーUI実装項目 
 */
export const ErrorNotification: React.FC = memo(() => {
  const errorMessage = useGameStore(state => state.errorMessage);
  const hideError = useGameStore(state => state.hideError);

  useEffect(() => {
    if (errorMessage) {
      // 🚀 4秒後に自動消去し、Zustandストアをクリーンに保つ
      const timer = setTimeout(() => hideError(), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, hideError]);

  if (!errorMessage) return null;

  return (
    <div className="fixed inset-0 z-[300000] flex items-center justify-center pointer-events-none p-4 select-none">
      <div className="relative group animate-errorIn">
        
        {/* ⚡ 背景ネオンエフェクト: オレンジ色の残光 */}
        <div className="absolute -inset-1 bg-orange-600 rounded blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
        
        {/* 🛡️ メインパネル: 堅牢なミリタリースタイル */}
        <div className="relative bg-black border-2 border-orange-600 px-8 py-6 flex items-center gap-6 shadow-[0_0_30px_rgba(234,88,12,0.6)]">
          
          {/* ⚠️ 警告シンボル: 45度回転したスクエアアイコン */}
          <div className="flex-shrink-0 w-12 h-12 border-2 border-orange-600 flex items-center justify-center rotate-45 bg-orange-600/20">
            <span className="text-orange-500 text-3xl font-black -rotate-45 font-fix">!</span>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mb-1 font-fix">
              System Alert: Action Rejected
            </span>
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase font-fix drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              {errorMessage}
            </h2>
          </div>

          {/* 🚀 装飾: 通信パルス風のアニメーションライン */}
          <div className="ml-4 h-14 w-1.5 bg-orange-600/30 overflow-hidden">
             <div className="w-full h-full bg-orange-500 animate-shimmer"></div>
          </div>
        </div>
        
        {/* 🎞️ 下部スキャンライン: システムの稼働感を演出 */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-orange-500 shadow-[0_0_15px_#f97316] animate-scan"></div>
      </div>

      <style>{`
        @keyframes errorIn {
          0% { transform: scale(0.8) skewX(-15deg); opacity: 0; filter: brightness(3); }
          60% { transform: scale(1.05) skewX(5deg); opacity: 1; filter: brightness(1.5); }
          100% { transform: scale(1) skewX(0deg); opacity: 1; filter: brightness(1); }
        }
        .animate-errorIn { animation: errorIn 0.4s cubic-bezier(0.17, 0.89, 0.32, 1.28) forwards; }

        @keyframes scan { 
          0% { transform: translateY(0); opacity: 1; } 
          100% { transform: translateY(-60px); opacity: 0; } 
        }
        .animate-scan { animation: scan 1.5s ease-out infinite; }

        @keyframes shimmer {
          0% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        .animate-shimmer { animation: shimmer 1s infinite linear; }
        
        .font-fix { line-height: 1.1; }
      `}</style>
    </div>
  );
});