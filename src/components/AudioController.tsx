import { useEffect, useRef } from 'react';
import { useGameStore } from '../store'; 

export const AudioController = (): null => {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const view = useGameStore((state) => state.view);
  const bgmVolume = useGameStore((state) => state.bgmVolume);

  // 1️⃣ BGMの初期化（初回のみ実行）
  useEffect(() => {
    // 🚀 publicフォルダの中にあるので、ドメイン直下の「/」から始めるのが大正解！
    const audioPath = '/assets/audio/bgm/login-joinroom.mp3';
    const bgm = new Audio(audioPath);
    bgm.loop = true;
    bgm.volume = useGameStore.getState().bgmVolume;
    bgmRef.current = bgm;

    const handleInteraction = (): void => {
      bgm.play()
        .then(() => console.log("🎵 [Audio] 再生成功！ついに鳴ったぞ！"))
        .catch(err => console.warn("⚠️ [Audio] 再生失敗:", err));
      window.removeEventListener('click', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    return () => {
      bgm.pause();
      window.removeEventListener('click', handleInteraction);
    };
  }, []); 

  // 2️⃣ 音量設定のリアルタイム同期
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  // 3️⃣ ゲーム本編遷移時のフェードアウト
  useEffect(() => {
    let fadeOutInterval: ReturnType<typeof setInterval>;

    if (view === 'game' && bgmRef.current) {
      const currentBgm = bgmRef.current;
      
      fadeOutInterval = setInterval(() => {
        if (currentBgm.volume > 0.05) {
          currentBgm.volume -= 0.05;
        } else {
          currentBgm.pause();
          currentBgm.currentTime = 0; 
          clearInterval(fadeOutInterval);
        }
      }, 100);
    }

    return () => {
      if (fadeOutInterval) clearInterval(fadeOutInterval);
    };
  }, [view]);

  return null; 
};