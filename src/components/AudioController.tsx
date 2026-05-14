import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store';

// BGMの設定マップ（画面名：ファイル名）
const BGM_MAP: Record<string, string> = {
  login: '/assets/audio/bgm/login-joinroom.mp3',
  setup: '/assets/audio/bgm/login-joinroom.mp3',
  lobby: '/assets/audio/bgm/login-joinroom.mp3',
  waiting: '/assets/audio/bgm/waiting.mp3',
  selection: '/assets/audio/bgm/waiting.mp3',
  // game: Phaser側で流すのでここには含めない
};

export const AudioController = (): null => {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const view = useGameStore((state) => state.view);
  const bgmVolume = useGameStore((state) => state.bgmVolume);

  // 🚀 1. フェードアウト関数を先に定義（エラー回避のため）
  // useCallbackを使うことで、他のuseEffectの中でも安全に使えるようになるよ
  const fadeOutAndStop = useCallback(() => {
    if (!bgmRef.current) return;
    const currentBgm = bgmRef.current;
    
    const fadeOutInterval = setInterval(() => {
      if (currentBgm.volume > 0.05) {
        currentBgm.volume -= 0.05;
      } else {
        currentBgm.pause();
        currentBgm.currentTime = 0;
        clearInterval(fadeOutInterval);
      }
    }, 50);
  }, []);

  // 2️⃣ BGMの初期化 & 自動切り替え
  useEffect(() => {
    // 現在のviewに対応する曲のパスを取得
    const targetPath = BGM_MAP[view];

    // Phaserゲーム中（view === 'game'）はHTML BGMを停止（フェードアウト）
    if (view === 'game') {
      fadeOutAndStop();
      return;
    }

    if (!targetPath) return;

    // 初めての作成、または曲が変わる場合
    if (!bgmRef.current || bgmRef.current.dataset.currentSrc !== targetPath) {
      const isFirstTime = !bgmRef.current;
      
      // 既存の曲があれば止める
      if (bgmRef.current) {
        bgmRef.current.pause();
      }

      const audio = new Audio(targetPath);
      audio.loop = true;
      audio.volume = bgmVolume; // storeの音量を反映
      audio.dataset.currentSrc = targetPath; // 今何の曲か記憶
      bgmRef.current = audio;

      // 初回はユーザー操作を待つ、2回目以降（画面遷移）は即再生
      if (isFirstTime) {
        const handleInteraction = (): void => {
          audio.play().catch(() => {});
          window.removeEventListener('click', handleInteraction);
        };
        window.addEventListener('click', handleInteraction);
      } else {
        audio.play().catch(err => console.warn("Audio play blocked:", err));
      }
    }
  }, [view, fadeOutAndStop, bgmVolume]); // bgmVolumeも追加して音量変更を即座に反映

  // 3️⃣ 音量のリアルタイム同期
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  // 4️⃣ グローバルSE（カーソル＆クリック）
  useEffect(() => {
    const cursor = new Audio('/assets/audio/se/click_non_button.mp3');
    cursor.volume = 0.5;
    const clickBtn = new Audio('/assets/audio/se/click_non_button.mp3');
    clickBtn.volume = 0.6;

    let lastButtonHovered: Element | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const btn = (e.target as Element).closest?.('button, [role="button"]') ?? null;
      if (btn && btn !== lastButtonHovered) {
        cursor.currentTime = 0;
        cursor.play().catch(() => {});
      }
      lastButtonHovered = btn;
    };

    const handleClick = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('button, [role="button"], input[type="submit"]')) {
        clickBtn.currentTime = 0;
        clickBtn.play().catch(() => {});
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
};