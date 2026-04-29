// src/components/ErrorNotification.tsx
import React, { useEffect } from 'react';
import { useGameStore } from '../store';

export const ErrorNotification: React.FC = () => {
  const { errorMessage, hideError } = useGameStore();

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => hideError(), 4000); // 4秒で自動消去
      return () => clearTimeout(timer);
    }
  }, [errorMessage, hideError]);

  if (!errorMessage) return null;

  return (
    <div className="fixed inset-0 z-[300000] flex items-center justify-center pointer-events-none p-4">
      <div className="relative group animate-errorIn">
        {/* 外側のネオン管エフェクト */}
        <div className="absolute -inset-1 bg-orange-600 rounded blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
        
        {/* メインボックス */}
        <div className="relative bg-black border-2 border-orange-600 px-8 py-6 flex items-center gap-6 shadow-[0_0_20px_rgba(234,88,12,0.5)]">
          {/* 警告アイコン */}
          <div className="flex-shrink-0 w-12 h-12 border-2 border-orange-600 flex items-center justify-center rotate-45 bg-orange-600/10">
            <span className="text-orange-600 text-2xl font-black -rotate-45 font-fix">!</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] font-fix">
              System Alert: Operation Rejected
            </span>
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase font-fix">
              {errorMessage}
            </h2>
          </div>

          {/* 右側の装飾 */}
          <div className="ml-4 h-12 w-1 bg-orange-600/30 animate-shimmer"></div>
        </div>
        
        {/* 下部のスキャンライン風装飾 */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-orange-500/50 shadow-[0_0_10px_orange] animate-scan"></div>
      </div>

      <style>{`
        @keyframes errorIn {
          0% { transform: scale(0.9) skewX(-10deg); opacity: 0; filter: brightness(2); }
          50% { transform: scale(1.05) skewX(5deg); opacity: 1; filter: brightness(1.5); }
          100% { transform: scale(1) skewX(0deg); opacity: 1; filter: brightness(1); }
        }
        .animate-errorIn { animation: errorIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes scan { 0% { transform: translateY(0); } 100% { transform: translateY(-40px); opacity: 0; } }
        .animate-scan { animation: scan 2s linear infinite; }
      `}</style>
    </div>
  );
};