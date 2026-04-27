import React from 'react';

// ✅ 地区リスト：MainScene.js の ID と完全に一致させています
const START_CANDIDATES = [
  { id: 101, name: "West Hills (西の丘)" },
  { id: 102, name: "Downtown & Port (中心地)" },
  { id: 103, name: "Commercial District (商業区)" },
  { id: 104, name: "Residential Area (住宅街)" },
  { id: 105, name: "Central Park (中央公園)" },
  { id: 201, name: "Adventure Zone (北拠点)" },
  { id: 202, name: "Northern Forest (北の森)" },
  { id: 301, name: "East Coast (東海岸)" },
  { id: 302, name: "Marine Base (海上基地)" },
  { id: 401, name: "South Gate (南拠点)" },
  { id: 402, name: "Southern Jungle (南のジャングル)" },
];

interface Props {
  onSelect: (id: number) => void;
}

export const StartPosModal: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-[450px] bg-slate-900 border-2 border-orange-500 p-8 rounded-[20px] text-center shadow-[0_0_30px_rgba(249,115,22,0.3)] flex flex-col max-h-[85vh]">
        
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-2xl">🚩</span>
          {/* 🚀 修正: font-fixを追加 */}
          <h2 className="text-2xl font-black text-orange-500 italic tracking-[2px] uppercase font-fix m-0">TERRITORY SELECTION</h2>
        </div>
        
        {/* 🚀 修正: font-fixを追加 */}
        <p className="text-slate-400 text-sm leading-relaxed mb-6 font-fix">
          Please choose the district that will become your first territory.<br />
          <span className="text-xs text-slate-500 block mt-1 font-fix">司令官、最初の拠点をリストから選定してください。</span>
        </p>

        {/* 🚀 修正: index.css の custom-scrollbar を適用 */}
        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 text-left">
          {START_CANDIDATES.map(district => (
            <button 
              key={district.id} 
              onClick={() => onSelect(district.id)}
              className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 hover:bg-orange-500 hover:border-orange-500 hover:text-slate-900 rounded-lg transition-all group pointer-events-auto"
            >
              {/* 🚀 修正: font-fixを追加 */}
              <span className="font-mono text-xs opacity-60 font-fix group-hover:opacity-100">ID:{district.id}</span>
              <span className="font-black text-[15px] font-fix">{district.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* 🚀 コンポーネント固有のアニメーションのみ残し、他は index.css に集約 */}
      <style>{`
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};