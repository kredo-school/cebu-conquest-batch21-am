/// <reference types="vite/client" />
import React, { useState, memo } from 'react';
import { useGameStore } from '../store';

/**
 * 🛰️ TutorialView: Tactical briefing terminal for new operators.
 * Specification: v3.0 5-Island Conquest / 8-God Pantheon / 5-Digit System Compliant
 * v4.1: Fully synchronized with GDD victory conditions, AP parameters, combat resolution, and buff multipliers.
 */

interface TutorialViewProps {
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: "MISSION OBJECTIVE",
    subtitle: "Operation parameters & victory conditions",
    content: [
      "Achieve total conquest of all islands, or secure the highest district occupancy rate by the end of Turn 10 to claim ultimate victory.",
      "Immediate elimination (Game Over) occurs the moment your HP drops to 0. Neural link respawns are strictly unavailable."
    ],
    accent: "border-orange-500",
    textAccent: "text-orange-500",
    glow: "shadow-[0_0_40px_rgba(249,115,22,0.2)]"
  },
  {
    title: "RESOURCE MANAGEMENT",
    subtitle: "The combat lifelines: HP and AP",
    content: [
      "HP (Vitality): Depleted upon combat failure or critical penalties. Reaching 0 results in instant death—tactical caution is mandatory.",
      "AP (Action Points): Consumed by executing all operational commands. Occupying a vacant spot drains 5 AP; attacking enemy sectors costs between 5 to 20 AP.",
      "Stay (Standby): Skip your action phase to synchronize networks, recovering +20 HP and +30 AP (capped at 100)."
    ],
    accent: "border-cyan-500",
    textAccent: "text-cyan-500",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.2)]"
  },
  {
    title: "TACTICAL ACTIONS",
    subtitle: "Combat protocols & engagement resolution",
    content: [
      "Attack: Instantly annex adjacent vacant spots or launch an offensive into hostile territory. Failing an infiltration assault inflicts a severe -20 HP damage penalty.",
      "Defend / Retreat: Defense efficiency is calculated via status differentials upon being breached. Retreating pulls you back to safety, but failing to secure an escape vectors triggers a catastrophic -50 HP penalty.",
      "Combat Resolution: Engagements are resolved via proportional probability matrix derived from the attacker's ATK (A) and defender's DEF (D): $P = A / (A + D)$."
    ],
    accent: "border-orange-500",
    textAccent: "text-orange-500",
    glow: "shadow-[0_0_40px_rgba(249,115,22,0.2)]"
  },
  {
    title: "FAITH & SPECIALTY",
    subtitle: "Divine alignment & regional modifier matrices",
    content: [
      "Divine Covenant: Form a link with one of the 8 guardian deities at deployment to unlock critical baseline perks. This neural sync cannot be modified mid-game.",
      "Specialty Buffs: Annexing specific hotspots triggers local specialty modifiers, permanently reinforcing your operational status parameters.",
      "Faith Multiplier: Final combat threshold outputs are determined by multiplying the aggregate of your base stats and specialty modifiers by your Faith coefficient."
    ],
    accent: "border-cyan-500",
    textAccent: "text-cyan-500",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.2)]"
  }
];

export const TutorialView: React.FC<TutorialViewProps> = memo(({ onComplete }) => {
  const { completeTutorial } = useGameStore();
  const [currentStep, setCurrentStep] = useState(0);

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial(); 
      onComplete(); 
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <div className="absolute inset-0 z-[50000] bg-slate-950 font-body text-slate-200 select-none flex items-center justify-center p-4 overflow-hidden">
      
      {/* 🌌 Background grid with pulsating scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:50px_50px] animate-gridPulse pointer-events-none"></div>
      
      <div className={`w-full max-w-4xl min-h-[65vh] flex flex-col bg-zinc-950/90 border-t-2 border-b-2 ${step.accent} ${step.glow} relative backdrop-blur-2xl transition-all duration-700 ease-in-out`}>
        
        {/* Corner Decals */}
        <div className={`absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 ${step.accent} opacity-50`}></div>
        <div className={`absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 ${step.accent} opacity-50`}></div>

        <div className="flex-1 p-16 flex flex-col justify-center relative overflow-hidden">
          {/* Large background step indicator */}
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

        {/* 下部ナビゲーション */}
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

      {/* スキップボタン */}
      <button 
        onClick={() => { completeTutorial(); onComplete(); }}
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

export default TutorialView;