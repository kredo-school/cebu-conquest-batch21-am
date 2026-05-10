// src/hook/useBGM.ts
// React側 BGM管理モジュール（waiting / setting / winner / Loser）

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
  audio.volume = 0.4;
  audio.onerror = () => {
    audio.src = bgmFallback[key];
    audio.load();
  };
});

let currentBGMKey: string | null = null;

export const playBGM = (key: string): void => {
  if (currentBGMKey === key) return;
  if (currentBGMKey && bgmMap[currentBGMKey]) {
    bgmMap[currentBGMKey].pause();
    bgmMap[currentBGMKey].currentTime = 0;
  }
  currentBGMKey = key;
  bgmMap[key]?.play().catch((e) => {
    if (import.meta.env.DEV) console.warn(`[BGM] ${key} 再生失敗:`, e);
  });
};

export const stopBGM = (): void => {
  if (currentBGMKey && bgmMap[currentBGMKey]) {
    bgmMap[currentBGMKey].pause();
    bgmMap[currentBGMKey].currentTime = 0;
  }
  currentBGMKey = null;
};

export const useBGM = () => ({ playBGM, stopBGM });
