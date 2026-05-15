/// <reference types="vite/client" />
// src/hook/useBGM.ts
// React側 BGM管理モジュール（waiting / setting / winner / Loser）

const TARGET_VOLUME = 0.4;
const FADE_DURATION = 1000; // 1秒かけてフェード
const FADE_INTERVAL = 50;   // 50msごとに音量更新

const bgmMap: Record<string, HTMLAudioElement> = {
  waiting: new Audio('/assets/audio/bgm/waiting.ogg'),
  setting: new Audio('/assets/audio/bgm/setting.ogg'),
  winner:  new Audio('/assets/audio/bgm/winner.ogg'),
  Loser:   new Audio('/assets/audio/bgm/Loser.ogg'),
};

const bgmFallback: Record<string, string> = {
  waiting: '/assets/audio/bgm/waiting.mp3',
  setting: '/assets/audio/bgm/setting.mp3',
  winner:  '/assets/audio/bgm/winner.mp3',
  Loser:   '/assets/audio/bgm/Loser.mp3',
};

Object.entries(bgmMap).forEach(([key, audio]) => {
  audio.loop = true;
  audio.volume = 0; // 開始時は0（フェードインさせるため）
  audio.onerror = () => {
    audio.src = bgmFallback[key];
    audio.load();
  };
});

let currentBGMKey: string | null = null;

// 🚀 修正：'let' を 'const' に変更し、'any' を具体的な Interval 型に変更
const fadeIntervals: Record<string, ReturnType<typeof setInterval>> = {};

/**
 * 🚀 ボリュームを滑らかに変化させる関数
 */
const adjustVolume = (audio: HTMLAudioElement, target: number, callback?: () => void) => {
  const step = (target - audio.volume) / (FADE_DURATION / FADE_INTERVAL);
  
  // 以前のインターバルがあればクリア
  if (fadeIntervals[audio.src]) {
    clearInterval(fadeIntervals[audio.src]);
  }

  fadeIntervals[audio.src] = setInterval(() => {
    const nextVolume = audio.volume + step;
    
    if ((step > 0 && nextVolume >= target) || (step < 0 && nextVolume <= target)) {
      audio.volume = target;
      clearInterval(fadeIntervals[audio.src]);
      if (callback) callback();
    } else {
      audio.volume = Math.max(0, Math.min(1, nextVolume));
    }
  }, FADE_INTERVAL);
};

export const playBGM = (key: string): void => {
  if (currentBGMKey === key) return;

  // 1. 現在流れているBGMをフェードアウト
  if (currentBGMKey && bgmMap[currentBGMKey]) {
    const prevBGM = bgmMap[currentBGMKey];
    adjustVolume(prevBGM, 0, () => {
      prevBGM.pause();
      prevBGM.currentTime = 0;
    });
  }

  // 2. 新しいBGMをフェードイン
  currentBGMKey = key;
  const nextBGM = bgmMap[key];
  if (nextBGM) {
    nextBGM.volume = 0;
    nextBGM.play().catch((e) => {
      if (import.meta.env.DEV) console.warn(`[BGM] ${key} 再生失敗:`, e);
    });
    adjustVolume(nextBGM, TARGET_VOLUME);
  }
};

export const stopBGM = (): void => {
  if (currentBGMKey && bgmMap[currentBGMKey]) {
    const audio = bgmMap[currentBGMKey];
    adjustVolume(audio, 0, () => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
  currentBGMKey = null;
};

export const useBGM = () => ({ playBGM, stopBGM });