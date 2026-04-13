import React from 'react';

// 🚀 Task No.34：API未完成時のモックデータ
const MOCK_RANKING = [
  { rank: 1, name: "issei", score: 8 },
  { rank: 2, name: "akira", score: 5 },
  { rank: 3, name: "kei", score: 4 },
  { rank: 4, name: "nao", score: 2 },
];

export const RankingView: React.FC = () => {
  return (
    <div style={rankingBoxStyle}>
      <h3 style={{ borderBottom: '2px solid #333', paddingBottom: '5px' }}>🏆 TOP RANKING</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ fontSize: '12px', color: '#666', textAlign: 'left' }}>
            <th>RANK</th>
            <th>NAME</th>
            <th>DISTRICTS</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_RANKING.map((item) => (
            <tr key={item.rank} style={rowStyle(item.rank === 1)}>
              <td>{item.rank === 1 ? '🥇' : item.rank}</td>
              <td>{item.name}</td>
              <td style={{ textAlign: 'right' }}>{item.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const rankingBoxStyle: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '15px', border: '3px solid #000', marginTop: '20px' };
const rowStyle = (isFirst: boolean): React.CSSProperties => ({ borderBottom: '1px solid #eee', fontWeight: isFirst ? 'bold' : 'normal', height: '35px' });