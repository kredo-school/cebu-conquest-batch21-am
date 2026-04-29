import React, { useState } from 'react';
import { useGameStore } from '../store';

// 🚀 チュートリアルの各スライド内容
const TUTORIAL_STEPS = [
  {
    title: "MISSION OBJECTIVE",
    subtitle: "作戦目的と勝利条件",
    content: [
      "全5島（セブ・マクタン・ネグロス・ボホール・シキホル）の完全制覇、または10ターン終了時に最多地区を支配せよ [cite: 26, 27]。",
      "敵対勢力に全ての地区を奪われるか、HPが0になった時点でミッション失敗（即時敗北）となる [cite: 28, 37]。"
    ],
    accent: "border-orange-500",
    textAccent: "text-orange-500"
  },
  {
    title: "RESOURCE MANAGEMENT",
    subtitle: "生命線：HPとAP",
    content: [
      "HP (体力): 0になると即ゲームオーバー。リスポーンは存在しない [cite: 37, 40]。",
      "AP (スタミナ): 移動や攻撃で5消費。0になると行動不能に陥るため、管理が不可欠だ [cite: 33, 35]。",
      "Stay（待機）を選択することで、HP+20 / AP+30 の急速回復が可能 [cite: 35]。"
    ],
    accent: "border-cyan-500",
    textAccent: "text-cyan-500"
  },
  {
    title: "TACTICAL ACTIONS",
    subtitle: "戦術コマンド",
    content: [
      "攻撃: 隣接する空き地を占領、または敵陣を攻撃して奪い取る [cite: 35]。",
      "防御: 敵からの攻撃を半減させる。逃げる場合は自陣への撤退を試みる [cite: 35]。",
      "バトルは攻撃側の ATK と防御側の DEF による確率計算で決着する [cite: 62]。"
    ],
    accent: "border-orange-500",
    textAccent: "text-orange-500"
  },
  {
    title: "FAITH & SPECIALTY",
    subtitle: "神の加護と特産品",
    content: [
      "8柱の神々から一柱を選択し、ATK増加やAP拡張などの初期ボーナスを得よ [cite: 42, 44]。",
      "「ドライマンゴー」や「レチョン」など、占領地区の特産品がステータスを永続バフする [cite: 51, 53]。",
      "信仰力（Faith）を高めることで、全てのバフ効果が乗算的に強化される [cite: 33, 55]。"
    ],
    accent: "border-cyan-500",
    textAccent: "text-cyan-500"
  }
];

export const TutorialView: React.FC = () => {
  const { setView, completeTutorial } = useGameStore();
  const [currentStep, setCurrentStep] = useState(0);

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial(); // 🚀 Zustand & localStorage を更新
      setView('setup');   // 🚀 ロビー画面へ
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <div className="absolute inset-0 z-[50000] bg-slate-950 font-body text-slate-200 select-none flex items-center justify-center p-4">
      {/* 背景グリッド演出 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      <div className={`w-full max-w-4xl min-h-[60vh] flex flex-col bg-zinc-950/80 border-t-2 border-b-2 ${step.accent} relative shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-500`}>
        
        {/* 装飾コーナービット */}
        <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 ${step.accent}`}></div>
        <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 ${step.accent}`}></div>

        <div className="flex-1 p-12 flex flex-col justify-center">
          <div className="mb-2">
             <span className={`text-[10px] font-black tracking-[0.5em] uppercase ${step.textAccent} font-fix`}>
               System Briefing: Step 0{currentStep + 1}
             </span>
          </div>
          
          <h2 className="text-5xl font-black italic tracking-tighter text-white uppercase mb-2 font-fix">
            {step.title}
          </h2>
          <h3 className={`text-xl font-bold mb-8 ${step.textAccent} font-fix`}>
            {step.subtitle}
          </h3>

          <div className="space-y-6">
            {step.content.map((text, i) => (
              <div key={i} className="flex items-start gap-4 animate-fadeIn" style={{ animationDelay: `${i * 150}ms` }}>
                <div className={`mt-1.5 w-2 h-2 shrink-0 ${step.textAccent} rotate-45 border border-current`}></div>
                <p className="text-lg leading-relaxed text-slate-300 font-fix">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 下部ナビゲーション */}
        <div className="px-12 py-8 flex items-center justify-between border-t border-white/5 bg-white/5">
          <div className="flex gap-2">
            {TUTORIAL_STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 transition-all duration-300 ${i === currentStep ? `w-8 ${step.textAccent} bg-current` : 'w-2 bg-zinc-800'}`}
              ></div>
            ))}
          </div>

          <button 
            onClick={handleNext}
            className={`group relative px-10 py-3 overflow-hidden transition-all active:scale-95 ${
              isLastStep ? 'bg-orange-600 text-black' : 'bg-transparent border border-white/20 text-white hover:border-white/50'
            }`}
          >
            <span className="relative z-10 text-xs font-black uppercase tracking-[0.2em] font-fix">
              {isLastStep ? "Understood / Start Mission" : "Next Data Link"}
            </span>
            {isLastStep && (
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
            )}
          </button>
        </div>
      </div>

      {/* スキップボタン（デバッグ・リピーター用） */}
      <button 
        onClick={() => { completeTutorial(); setView('setup'); }}
        className="absolute bottom-8 text-[10px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors font-fix"
      >
        Skip Briefing [ESC]
      </button>
    </div>
  );
};