// src/hook/useSE.ts
// React側 SE管理フック（cursor / click_button）

const seMap: Record<string, HTMLAudioElement> = {
  cursor:       new Audio('/assets/audio/se/cursor.mp3'),
  click_button: new Audio('/assets/audio/se/click_button.mp3'),
};

Object.values(seMap).forEach((audio) => { audio.volume = 0.7; });

const playSE = (key: keyof typeof seMap): void => {
  const audio = seMap[key];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

export const useSE = () => ({
  playCursor:      () => playSE('cursor'),
  playClickButton: () => playSE('click_button'),
});
