import React from 'react';

interface TitleScreenProps {
  onStart: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-blue-400 to-emerald-400">
      {/* タイトルロゴ */}
      <h1 className="text-6xl font-bold text-white drop-shadow-lg mb-4 text-center">
        CEBU CONQUEST
      </h1>
      <p className="text-2xl text-yellow-200 font-semibold mb-12 drop-shadow-md">
        〜 ########## 〜
      </p>

      {/* スタートボタン */}
      <button 
        onClick={onStart}
        className="px-12 py-4 bg-orange-500 hover:bg-orange-600 text-white text-3xl font-bold rounded-full border-4 border-white shadow-2xl transform hover:scale-110 transition-all"
      >
        START ADVENTURE
      </button>

      {/* 画面下の装飾 */}
      <div className="absolute bottom-10 text-white text-lg opacity-80">
        ##########
      </div>
    </div>
  );
};

export default TitleScreen;