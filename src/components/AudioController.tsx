import { useEffect, useRef } from 'react';
import { useGameStore } from '../store'; 

/**
 * ログイン・ロビー画面のBGMを管理するコンポーネント
 * ゲーム本編遷移時にフェードアウトして停止し、設定画面の音量とリアルタイム同期する
 */
export const AudioController = (): null => {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  
  // ✅ ストアから画面状態とBGM音量を取得
  const view = useGameStore((state) => state.view);
  const bgmVolume = useGameStore((state) => state.bgmVolume);

  useEffect(() => {
    // BGMインスタンス作成
    const bgm = new Audio('/assets/audio/bgm/login-joinroom.ogg');
    bgm.loop = true;
    bgm.volume = bgmVolume; // ✅ 初期音量を設定値に合わせる
    bgmRef.current = bgm;

    // ブラウザの自動再生ポリシー対策
    const handleInteraction = (): void => {
      // ✅ ESLint準拠：未使用のキャッチ変数は _err にリネーム
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

  // ✅ 修正：設定画面で音量が変更されたら即座に反映させる
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = bgmVolume;
    }
  }, [bgmVolume]);

  // ✅ view が 'game' になったらフェードアウトして停止
  useEffect(() => {
    let fadeOutInterval: ReturnType<typeof setInterval>;

    if (view === 'game' && bgmRef.current) {
      const currentBgm = bgmRef.current;
      
      fadeOutInterval = setInterval(() => {
        if (currentBgm.volume > 0.05) {
          currentBgm.volume -= 0.05;
        } else {
          currentBgm.pause();
          currentBgm.currentTime = 0; // 次回再生用にリセット
          clearInterval(fadeOutInterval);
        }
      }, 100);
    }

    // ✅ メモリリーク防止：クリーンアップ関数でインターバルを確実に解除
    return () => {
      if (fadeOutInterval) clearInterval(fadeOutInterval);
    };
  }, [view]);

  return null; 
};