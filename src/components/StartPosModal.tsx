import React from 'react';

// ✅ 本番マップの spotId（5桁）に対応
// ※ このIDリストはTMJの spotName レイヤーに実在するIDのみ記載すること
const START_CANDIDATES = [
  // ── セブ市街地エリア（エリアID: 11）──
  { id: 11101, name: "Maya Port（マヤ港）" },
  { id: 11102, name: "Sugarcane Field（サトウキビ畑）" },
  { id: 11108, name: "Farmer House（農家）" },
  { id: 11112, name: "Bogo Transit Terminal（ボゴバスターミナル）" },
  { id: 11113, name: "Bogo Hilltop Shrine（ボゴ丘の神社）" },
  // ── セブ市街地（エリアID: 13）──
  { id: 13101, name: "IT Park（ITパーク）" },
  { id: 13102, name: "Waterfront Hotel（ウォーターフロントホテル）" },
  { id: 13103, name: "Ayala Malls Center（アヤラモール）" },
  { id: 13204, name: "Basilica del Santo Nino（サント・ニーニョ大聖堂）" },
  // ── 必要に応じて本番TMJのspotNameレイヤーを確認して追加する ──
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