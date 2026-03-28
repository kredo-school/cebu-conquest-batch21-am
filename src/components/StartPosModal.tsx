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
    <div className="start-modal-overlay">
      <div className="start-modal-content">
        <div className="modal-header">
          <span className="icon">🚩</span>
          <h2>TERRITORY SELECTION</h2>
        </div>
        
        <p className="description">
          Please choose the district that will become your first territory.<br />
          <span>司令官、最初の拠点をリストから選定してください。</span>
        </p>

        <div className="button-list">
          {START_CANDIDATES.map(district => (
            <button 
              key={district.id} 
              onClick={() => onSelect(district.id)}
              className="start-button"
            >
              <span className="district-id">ID:{district.id}</span>
              <span className="district-name">{district.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      <style>{`
        .start-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.85);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .start-modal-content {
          background: #1a1a2e;
          padding: 40px;
          border-radius: 20px;
          border: 2px solid #f1c40f;
          text-align: center;
          color: white;
          width: 90%;
          max-width: 450px;
          box-shadow: 0 0 30px rgba(241, 196, 15, 0.3);
        }
        .modal-header {
          display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;
        }
        .modal-header h2 { color: #f1c40f; margin: 0; font-size: 24px; letter-spacing: 2px; }
        .description { font-size: 14px; color: #94a3b8; margin-bottom: 25px; line-height: 1.6; }
        .description span { font-size: 12px; color: #64748b; }

        .button-list {
          display: flex; flex-direction: column; gap: 8px;
          max-height: 400px; /* リストが長いのでスクロール可能に */
          overflow-y: auto;
          padding-right: 10px;
        }
        
        /* スクロールバーのカスタマイズ */
        .button-list::-webkit-scrollbar { width: 6px; }
        .button-list::-webkit-scrollbar-thumb { background: #34495e; border-radius: 3px; }

        .start-button {
          display: flex; align-items: center; justify-content: space-between;
          padding: 15px 20px;
          background: #16213e;
          border: 1px solid #0f3460;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .start-button:hover {
          background: #f1c40f;
          color: #1a1a2e;
          transform: translateX(5px);
          border-color: #f1c40f;
        }
        .district-id { font-family: monospace; opacity: 0.6; font-size: 12px; }
        .district-name { font-weight: bold; font-size: 15px; }
      `}</style>
    </div>
  );
};