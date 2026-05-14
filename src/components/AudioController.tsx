import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store';

// 🚀 BGMの設定マップ
const BGM_MAP: Record<string, string> = {
  login: '/assets/audio/bgm/login-joinroom.mp3',
  setup: '/assets/audio/bgm/login-joinroom.mp3',
  // 🚀 いっせいの指示：ロビーから waiting.mp3 を流してメイン開始まで繋ぐ
  lobby: '/assets/audio/bgm/waiting.mp3',
  waiting: '/assets/audio/bgm/waiting.mp3',
  selection: '/assets/audio/bgm/waiting.mp3',
  settings: '/assets/audio/bgm/setting.mp3', // 🚀 設定専用BGMを追加
};

interface AudioControllerProps {
  isSettingsOpen: boolean; // 🚀 App.tsx からの状態を受け取る
}

export const AudioController = ({ isSettingsOpen }: AudioControllerProps): null => {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const view = useGameStore((state) => state.view);
  const bgmVolume = useGameStore((state) => state.bgmVolume);

  // 🚀 1. フェードアウト関数
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
    // 🚀 指示反映：設定画面が開いているなら設定BGM、そうでなければViewに応じたBGM
    const targetPath = isSettingsOpen ? BGM_MAP['settings'] : BGM_MAP[view];

    // Phaserゲーム中（view === 'game'）で、かつ設定画面も開いていない場合は停止
    if (view === 'game' && !isSettingsOpen) {
      fadeOutAndStop();
      return;
    }

    if (!targetPath) return;

    // 初めての作成、または曲が変わる場合
    if (!bgmRef.current || bgmRef.current.dataset.currentSrc !== targetPath) {
      const isFirstTime = !bgmRef.current;
      
      if (bgmRef.current) {
        bgmRef.current.pause();
      }

      const audio = new Audio(targetPath);
      audio.loop = true;
      audio.volume = bgmVolume;
      audio.dataset.currentSrc = targetPath;
      bgmRef.current = audio;

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
  }, [view, isSettingsOpen, fadeOutAndStop, bgmVolume]); // 🚀 isSettingsOpen を監視対象に追加

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
      document.addEventListener('click', handleClick);
    };
  }, []);

  return null;
};