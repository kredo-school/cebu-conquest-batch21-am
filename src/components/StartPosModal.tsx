// src/components/StartPosModal.tsx
import React from 'react';

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
        <h2>🚩 降下地点を選択せよ</h2>
        <p>最初の領土となる地区を選んでください。</p>
        <div className="button-list">
          {START_CANDIDATES.map(district => (
            <button 
              key={district.id} 
              onClick={() => onSelect(district.id)}
              className="start-button"
            >
              {district.name} (ID: {district.id})
            </button>
          ))}
        </div>
      </div>
      
      <style>{`
        .start-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 999;
        }
        .start-modal-content {
          background: #2c3e50; padding: 30px; border-radius: 15px; border: 2px solid #f1c40f; text-align: center; color: white;
        }
        .button-list { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
        .start-button {
          padding: 15px; background: #34495e; border: 1px solid #7f8c8d; color: white; cursor: pointer; transition: 0.2s;
        }
        .start-button:hover { background: #f1c40f; color: #2c3e50; transform: scale(1.05); }
      `}</style>
    </div>
  );
};