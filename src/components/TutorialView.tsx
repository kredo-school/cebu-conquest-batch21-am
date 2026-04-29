import React, { useState, memo } from 'react';
import { useGameStore } from '../store';

/**
 * 🛰️ TutorialView: 新規プレイヤーへの作戦ブリーフィング画面
 * 担当: いっせい (React + Vite + TS)
 * 仕様: v3.0 5島制覇・8神体制・5桁ID体系準拠
 */

const TUTORIAL_STEPS = [
  {
    title: "MISSION OBJECTIVE",
    subtitle: "作戦目的と勝利条件",
    content: [
      "全5島（セブ・マクタン・ネグロス・ボホール・シキホル）の完全制覇、または10ターン終了時に最多地区を支配せよ。",
      "敵対勢力に全ての地区を奪われるか、HPが0になった時点でミッション失敗（即時敗北）となる。"
    ],
    accent: "border-orange-500",
    textAccent: "text-orange-500",
    glow: "shadow-[0_0_40px_rgba(249,115,22,0.2)]"
  },
  {
    title: "RESOURCE MANAGEMENT",
    subtitle: "生命線：HPとAP",
    content: [
      "HP (体力): 0になると即ゲームオーバー。戦場にリスポーン（復活）は存在しない。慎重な判断を求められる。",
      "AP (スタミナ): 移動や攻撃で5消費。0になると行動不能に陥るため、リソース管理が不可欠だ。",
      "Stay（待機）を選択することで、HP+20 / AP+30 の急速回復が可能。"
    ],
    accent: "border-cyan-500",
    textAccent: "text-cyan-500",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.2)]"
  },
  {
    title: "TACTICAL ACTIONS",
    subtitle: "戦術コマンドとバトルロジック",
    content: [
      "攻撃: 隣接する空き地を占領、または敵陣を攻撃して奪い取る。戦線を押し上げろ。",
      "防御: 敵からの攻撃を半減させる。逃げる場合は、失敗時に大きなペナルティを伴うが自陣へ撤退できる。",
      "バトルの勝敗は、攻撃側の ATK と防御側の DEF による比例確率で算出される。"
    ],
    accent: "border-orange-500",
    textAccent: "text-orange-500",
    glow: "shadow-[0_0_40px_rgba(249,115,22,0.2)]"
  },
  {
    title: "FAITH & SPECIALTY",
    subtitle: "神の加護と特産品バフ",
    content: [
      "8柱の神々から一柱を選択し、ATK増加やAP拡張などの強力な初期ボーナスを得よ。",
      "「ドライマンゴー」や「レチョン」など、占領地区の特産品がステータスを永続的に強化する。",
      "信仰力（Faith）を高めることで、全てのバフ効果が乗算的に強化され、圧倒的な戦力を手にできる。"
    ],
    accent: "border-cyan-500",
    textAccent: "text-cyan-500",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.2)]"
  }
];

export const TutorialView: React.FC = memo(() => {
  const { setView, completeTutorial } = useGameStore();
  const [currentStep, setCurrentStep] = useState(0);

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial(); // 🚀 Zustandストアを更新し、フラグをlocalStorageに保存 [cite: 116]
      setView('setup');   // 🚀 ロビー（出撃地点選択）へ遷移
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <div className="absolute inset-0 z-[50000] bg-slate-950 font-body text-slate-200 select-none flex items-center justify-center p-4 overflow-hidden">
      
      {/* 🌌 背景グリッド: 脈動するスキャンラインエフェクト */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:50px_50px] animate-gridPulse pointer-events-none"></div>
      
      <div className={`w-full max-w-4xl min-h-[65vh] flex flex-col bg-zinc-950/90 border-t-2 border-b-2 ${step.accent} ${step.glow} relative backdrop-blur-2xl transition-all duration-700 ease-in-out`}>
        
        {/* 🛠️ 装飾コーナービット */}
        <div className={`absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 ${step.accent} opacity-50`}></div>
        <div className={`absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 ${step.accent} opacity-50`}></div>

        <div className="flex-1 p-16 flex flex-col justify-center relative overflow-hidden">
          {/* 背景の大きなステップ数 */}
          <div className="absolute -right-10 -bottom-20 text-[20rem] font-black italic opacity-5 text-white pointer-events-none font-fix">
            0{currentStep + 1}
          </div>

          <div className="mb-4 relative z-10">
             <span className={`text-[11px] font-black text-left uppercase tracking-[0.5em] ${step.textAccent} font-fix flex items-center gap-2`}>
                <span className="w-8 h-px bg-current"></span>
                Strategic Briefing: Phase 0{currentStep + 1}
             </span>
          </div>
          
          <h2 className="text-6xl font-black italic tracking-tighter text-white uppercase mb-2 font-fix leading-none text-left">
            {step.title}
          </h2>
          <h3 className={`text-2xl font-bold mb-10 ${step.textAccent} font-fix tracking-wide text-left`}>
            {step.subtitle}
          </h3>

          <div className="space-y-8 relative z-10">
            {step.content.map((text, i) => (
              <div key={`${currentStep}-${i}`} className="flex items-start gap-5 animate-slideIn" style={{ animationDelay: `${i * 150}ms` }}>
                <div className={`mt-2.5 w-2.5 h-2.5 shrink-0 ${step.textAccent} rotate-45 border-2 border-current shadow-[0_0_10px_currentColor]`}></div>
                <p className="text-xl leading-relaxed text-slate-300 font-fix text-left">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 🧭 下部ナビゲーション */}
        <div className="px-12 py-10 flex items-center justify-between border-t border-white/5 bg-white/5 backdrop-blur-md">
          <div className="flex gap-3">
            {TUTORIAL_STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStep ? `w-12 ${step.textAccent} bg-current shadow-[0_0_10px_currentColor]` : 'w-3 bg-zinc-800'}`}
              ></div>
            ))}
          </div>

          <button 
            onClick={handleNext}
            className={`group relative px-12 py-4 overflow-hidden transition-all active:scale-95 shadow-2xl ${
              isLastStep ? 'bg-orange-600 text-black font-black' : 'bg-transparent border border-white/20 text-white hover:border-white/50'
            }`}
          >
            <span className="relative z-10 text-[13px] font-black uppercase tracking-[0.25em] font-fix">
              {isLastStep ? "Acknowledge / Deployment" : "Next Intel Link"}
            </span>
            {isLastStep && (
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
            )}
          </button>
        </div>
      </div>

      {/* ⚡ スキップボタン: 熟練コマンダー用 */}
      <button 
        onClick={() => { completeTutorial(); setView('setup'); }}
        className="absolute bottom-10 text-[11px] font-black text-zinc-600 hover:text-orange-500 uppercase tracking-[0.3em] transition-all hover:scale-110 font-fix"
      >
        Skip Strategic Briefing [ESC]
      </button>

      <style>{`
        @keyframes gridPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        .animate-gridPulse { animation: gridPulse 8s ease-in-out infinite; }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-30px); filter: blur(10px); }
          to { opacity: 1; transform: translateX(0); filter: blur(0); }
        }
        .animate-slideIn { animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .font-fix { line-height: 1.1; }
      `}</style>
    </div>
  );
});