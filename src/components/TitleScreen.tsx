import React from 'react';

interface TitleScreenProps {
  onStart: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle, #1e3a8a 0%, #0f172a 100%)', // 深みのある青グラデーション
      color: 'white', fontFamily: 'sans-serif'
    }}>
      {/* 浮かぶヤシの木アイコン（仮） */}
      <div style={{ fontSize: '120px', marginBottom: '-40px', opacity: 0.3 }}>#####</div>

      <h1 style={{
        fontSize: '80px', fontWeight: 'bold', margin: 0,
        textShadow: '0 0 20px rgba(255,255,255,0.5), 5px 5px 0px #1d4ed8',
        letterSpacing: '4px'
      }}>
        CEBU CONQUEST
      </h1>

      <p style={{
        fontSize: '24px', color: '#fde047', fontWeight: 'bold',
        marginTop: '10px', textTransform: 'uppercase', letterSpacing: '2px'
      }}>
        Let's play game
      </p>

      <button 
        onClick={onStart}
        style={{
          marginTop: '50px', padding: '20px 60px',
          fontSize: '32px', fontWeight: 'bold', cursor: 'pointer',
          backgroundColor: '#f97316', color: 'white',
          border: 'none', borderRadius: '50px',
          boxShadow: '0 10px 0 #9a3412, 0 20px 40px rgba(0,0,0,0.4)',
          transition: '0.1s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fb923c'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(5px)';
          e.currentTarget.style.boxShadow = '0 5px 0 #9a3412';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 0 #9a3412';
        }}
      >
        START GAME
      </button>

      <div style={{ position: 'absolute', bottom: '20px', opacity: 0.5, fontSize: '12px' }}>
        v1.0.0 | Built for Cebu Conquest
      </div>
    </div>
  );
};

export default TitleScreen;