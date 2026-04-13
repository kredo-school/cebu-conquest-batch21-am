import { create } from 'zustand';
import { REACT_TO_PHASER } from './game/events/PhaserBridge';

// --- Task No.30：特産品マスタデータ ---
const SPECIALTY_DATA: Record<number, { name: string; effect: string }> = {
  101: { name: "セブ・マンゴー", effect: "ATK +10%" },
  102: { name: "サン・ペドロの祈り", effect: "DEF +10%" },
  103: { name: "レチョン・パワー", effect: "HP回復 +5" },
  104: { name: "ITパークの知恵", effect: "AP消費 -2" },
  105: { name: "マゼラン・クロス", effect: "信仰力 +0.2" },
};

interface GameState {
  // 基本ステータス
  hp: number; stamina: number; blessing: number;
  atk: number; def: number;
  turn: number; maxTurn: number;
  logs: string[]; players: Record<string, any>;
  districts: Record<string, string>;
  currentDistrictName: string;
  selectedDistrictId: number | null;
  playerName: string;
  myId: string; myTeam: string;
  isMyTurn: boolean; turnOwner: string;
  isGameOver: boolean; isSubmitted: boolean;
  isAuthenticated: boolean;

  // 🚀 Week 3追加：初期ボーナス選択 (資料 No.83-85)
  initialBonus: string | null;
  selectInitialBonus: (bonusName: string) => void;

  // 🚀 Week 3追加：リザルトデータ (資料 No.68-71, 74)
  resultData: {
    winnerName: string;
    scores: Record<string, number>;
    occupiedTerritories: number;
    mvp: string;
  } | null;

  // Week 2：占領モーダル・バフ管理
  isModalOpen: boolean;
  targetDistrict: { id: number; name: string } | null;
  setModal: (open: boolean, district?: { id: number; name: string } | null) => void;
  activeBuffs: { id: number; name: string; effect: string }[];
  updateBuffs: () => void;

  // アクション
  setStatus: (status: Partial<GameState>) => void;
  syncServerState: (data: any, myId: string) => void;
  setPlayerName: (name: string) => void; // 🚀 ここが漏れていました
  login: (username: string) => Promise<boolean>;
  damage: (amount: number) => void;
  addLog: (text: string) => void;
  nextTurn: () => void;
  resetGame: () => void;
  saveGame: () => void;
  loadGame: () => void;
  setIsSubmitted: (val: boolean) => void;
  
  // 🚀 Week 3：戦略コマンド (資料 No.83-85 準拠)
  defense: () => void;
  stay: () => void;
  escape: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // --- 🔴 初期状態 ---
  hp: 100, stamina: 100, blessing: 1.0, atk: 50, def: 40,
  turn: 0, maxTurn: 10,
  logs: ["🌞 システム起動：スタンバイ。出撃地点を選択してください。"],
  players: {}, districts: {},
  currentDistrictName: "地点未選択", selectedDistrictId: null,
  playerName: "", myId: "player-1", myTeam: "red",
  isMyTurn: true, turnOwner: "YOU",
  isGameOver: false, isSubmitted: false, isAuthenticated: false,

  isModalOpen: false, targetDistrict: null, activeBuffs: [],
  initialBonus: null, 
  resultData: null,   

  // --- 📡 ログイン & 初期選択 ---
  login: async (username: string) => {
    set({ isAuthenticated: true, playerName: username, turn: 0, isMyTurn: true });
    return true; 
  },

  setPlayerName: (name) => set({ playerName: name }), // 🚀 修正：実装を追加

  selectInitialBonus: (bonusName) => {
    set({ initialBonus: bonusName });
    get().addLog(`🛡️ 初期ボーナス：[${bonusName}] を選択しました。`);
  },

  // --- ⚙️ モーダル & バフ管理 ---
  setModal: (open, district = null) => set({ isModalOpen: open, targetDistrict: district }),

  updateBuffs: () => {
    const { districts, myId } = get();
    const myDistrictIds = Object.entries(districts)
      .filter(([_, ownerId]) => ownerId === myId)
      .map(([id, _]) => Number(id));

    const buffs = myDistrictIds
      .filter(id => SPECIALTY_DATA[id])
      .map(id => ({ id, ...SPECIALTY_DATA[id] }));

    set({ activeBuffs: buffs });
  },

  // --- 📡 同期 & ステータス更新 ---
  setStatus: (newStatus) => set((state) => {
    if (state.isGameOver) return state;
    const { isMyTurn, turnOwner, turn, isSubmitted, ...safeStatus } = newStatus as any;
    if (safeStatus.districts) setTimeout(() => get().updateBuffs(), 0);
    return { ...state, ...safeStatus };
  }),

  syncServerState: (data, myId) => {
    if (!data) return;
    
    // 決着フラグの受信チェック (資料 No.29) [cite: 29, 30]
    if (data.status === 'finished' || data.isGameOver) {
      set({ 
        isGameOver: true, 
        resultData: {
          winnerName: data.winnerName || "UNKNOWN",
          scores: data.scores || {},
          occupiedTerritories: Object.values(data.districts || {}).filter(id => id === myId).length,
          mvp: data.mvp || "No Data"
        }
      });
      return;
    }

    const isMe = data.turnOwnerId === myId;
    set((state) => ({
      ...state,
      hp: data.hp ?? state.hp,
      stamina: data.stamina ?? state.stamina,
      turn: data.turn ?? state.turn,
      districts: data.districts ?? state.districts,
      isMyTurn: isMe,
      turnOwner: isMe ? "YOU" : (data.turnOwnerName || "ENEMY"),
      isSubmitted: false
    }));
    get().updateBuffs();
  },

  // --- ⚔️ 戦略コマンド (CustomEvent経由でPhaserに送信 / 資料 No.83-85) ---
  stay: () => {
    if (get().isGameOver || !get().isMyTurn) return;
    set({ isSubmitted: true, isMyTurn: false });
    get().addLog("🧘 休息：APを回復し、待機します。");
    window.dispatchEvent(new CustomEvent('ACTION_STAY'));
  },

  defense: () => {
    if (get().isGameOver || !get().isMyTurn) return;
    set({ isSubmitted: true, isMyTurn: false });
    get().addLog("🛡️ 防御：防御姿勢をとり、敵の攻撃に備えます。");
    window.dispatchEvent(new CustomEvent('ACTION_DEFEND'));
  },

  escape: () => {
    if (get().isGameOver || !get().isMyTurn) return;
    set({ isSubmitted: true, isMyTurn: false });
    get().addLog("🏃 撤退：現在のセクターから緊急離脱を試みます。");
    window.dispatchEvent(new CustomEvent('ACTION_ESCAPE'));
  },

  // --- 🛠️ ユーティリティ ---
  damage: (amount) => {
    const nextHp = Math.max(0, get().hp - amount);
    set({ hp: nextHp, isGameOver: nextHp <= 0 });
    get().addLog(`💥 警告：${amount} ダメージを受領。`);
  },

  resetGame: () => {
    set({
      turn: 0, hp: 100, stamina: 100, isGameOver: false, isSubmitted: false, isMyTurn: true,
      logs: ["🌞 システム再起動：スタンバイ。"],
      resultData: null, initialBonus: null, activeBuffs: []
    });
    window.location.reload(); 
  },

  setIsSubmitted: (val) => set({ isSubmitted: val }),
  addLog: (text) => set((state) => ({ logs: [text, ...state.logs].slice(0, 10) })),
  nextTurn: () => set((state) => ({ turn: state.turn + 1, isMyTurn: true, isSubmitted: false })),
  saveGame: () => get().addLog("💾 作戦データを保存しました。"),
  loadGame: () => get().addLog("📂 作戦データを読み込みました。"),
}));

if (typeof window !== 'undefined') {
  (window as any).useGameStore = useGameStore;
}