import { useEffect, useRef } from 'react';
import { useGameStore } from '../store'; 

/**
 * ログイン・ロビー画面のBGMを管理するコンポーネント
 * 音量同期を維持しつつ、すべてのESLint警告・エラーを解消
 */
export const AudioController = (): null => {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  
  // ストアから画面状態と音量を取得
  const view = useGameStore((state) => state.view);
  const bgmVolume = useGameStore((state) => state.bgmVolume);

  // 1️⃣ BGMの初期化（初回のみ実行）
  useEffect(() => {
    const bgm = new Audio('/assets/audio/bgm/login-joinroom.ogg');
    bgm.loop = true;
    
    // ✅ 解決策：getState() で取得することで、この useEffect は bgmVolume の変更を監視しなくなる。
    // これにより、音量を変えるたびに BGM が最初から再生されるのを防ぎつつ、deps警告も出なくなる。
    bgm.volume = useGameStore.getState().bgmVolume;
    bgmRef.current = bgm;

    const handleInteraction = (): void => {
      bgm.play().catch((_err: unknown) => {
        console.warn("Autoplay prevented by browser policy.");
      });
      window.removeEventListener('click', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);

    return () => {
      bgm.pause();
      window.removeEventListener('click', handleInteraction);
    };
  }, []); 

  // 2️⃣ 音量設定のリアルタイム同期
  // 設定画面で bgmVolume が変わったときだけ、この Effect が動いて音量を上書きする
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = bgmVolume;
    }
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