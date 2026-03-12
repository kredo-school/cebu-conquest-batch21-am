// src/components/GameContainer.tsx
import React, { useEffect, useRef } from 'react';

export const GameContainer: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ここでメンバー1のPhaserを起動するイメージ
    console.log("Phaser 準備完了...");
  }, []);

  return (
    <div id="phaser-game" ref={gameRef} style={{ width: '100%', height: '100%', background: '#000' }}>
      {/* ここにセブ島の地図が映ります */}
    </div>
  );
};