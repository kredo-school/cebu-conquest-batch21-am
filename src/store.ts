import { create } from 'zustand';

interface GameState {
  hp: number; stamina: number; blessing: number;
  turn: number; maxTurn: number;
  logs: string[]; players: Record<string, any>;
  districts: Record<string, string>;
  currentDistrictName: string;
  myId: string; myTeam: string;
  isMyTurn: boolean; turnOwner: string;
  isGameOver: boolean; isSubmitted: boolean;

  setStatus: (status: Partial<GameState>) => void;
  syncServerState: (data: any, myId: string) => void;
  damage: (amount: number) => void;
  addLog: (text: string) => void;
  nextTurn: () => void;
  resetGame: () => void;
  saveGame: () => void;
  loadGame: () => void;
  setIsSubmitted: (val: boolean) => void;
  defense: () => void;
  stay: () => void;
  escape: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // --- 🔴 初期状態：Turn 0 (Standby) ---
  hp: 100,
  stamina: 100,
  blessing: 1.0,
  turn: 0, 
  maxTurn: 10,
  logs: ["🌞 システム起動：スタンバイ。出撃地点を選択してください。"],
  players: {},
  districts: {},
  currentDistrictName: "地点未選択",
  myId: "",
  myTeam: "red",
  isMyTurn: true, 
  turnOwner: "YOU",
  isGameOver: false,
  isSubmitted: false,

  // --- 📡 通信・同期アクション（鉄壁ガード） ---

  setStatus: (newStatus) => set((state) => {
    if (state.isGameOver) return state; // ゲームオーバー時は何もしない

    const { isMyTurn, turnOwner, turn, isSubmitted, isGameOver: newIsGameOver, ...safeStatus } = newStatus as any;
    const nextHp = safeStatus.hp !== undefined ? safeStatus.hp : state.hp;
    const isDead = nextHp <= 0;

    return { 
      ...state, 
      ...safeStatus,
      hp: nextHp,
      isGameOver: isDead,
      // 地点選択中(turn 0)なら常に自ターンを維持
      isMyTurn: isDead ? false : (state.turn === 0 ? true : state.isMyTurn) 
    };
  }),

  syncServerState: (data, myId) => {
    if (!data || get().isGameOver) return;

    const isMe = data.turnOwnerId === myId;
    set((state) => ({
      ...state,
      hp: data.hp ?? state.hp,
      stamina: data.stamina ?? state.stamina,
      // 🔴 修正：地点選択確定(nextTurn実行)までは、サーバー同期が来ても turn 0 を守る
      turn: state.turn === 0 ? 0 : (data.turn ?? state.turn),
      districts: data.districts ?? state.districts,
      isMyTurn: state.turn === 0 ? true : isMe,
      turnOwner: isMe ? "YOU" : (data.turnOwnerName || "ENEMY"),
      isSubmitted: false,
      isGameOver: (data.hp !== undefined && data.hp <= 0) || (data.turn > state.maxTurn)
    }));
  },

  // --- ⚔️ Day 1 以降のゲーム進行 ---

  nextTurn: () => {
    if (get().isGameOver) return;
    
    const nextT = get().turn + 1;
    set({ 
      turn: nextT, 
      isMyTurn: true, 
      turnOwner: "YOU", 
      isSubmitted: false 
    });

    if (nextT === 1) {
      get().addLog("🚀 作戦開始！第一日目。セブ島制圧ミッションをスタートします。");
    } else {
      get().addLog(`🌞 第${nextT}日目。新たな指令を待機中...`);
    }
  },

  // --- 🧘 戦略アクション（Day 1 以降のプレイ要素） ---

  stay: () => {
    if (get().isGameOver || !get().isMyTurn) return;
    
    // 🔴 Day 1 要素：休息でスタミナを 20 回復するロジック
    const currentStamina = get().stamina;
    const nextStamina = Math.min(100, currentStamina + 20);
    
    set({ 
      stamina: nextStamina,
      isSubmitted: true, 
      isMyTurn: false 
    });
    
    get().addLog(`🧘 休息：スタミナが ${nextStamina} に回復しました。`);
    window.dispatchEvent(new CustomEvent("ACTION_STAY"));
  },

  defense: () => {
    if (get().isGameOver || !get().isMyTurn) return;
    set({ isSubmitted: true, isMyTurn: false });
    get().addLog("🛡️ 防御：防御姿勢をとり、敵の攻撃に備えます。");
    window.dispatchEvent(new CustomEvent("ACTION_DEFEND"));
  },

  escape: () => {
    if (get().isGameOver || !get().isMyTurn) return;
    set({ isSubmitted: true, isMyTurn: false });
    get().addLog("🏃 撤退：現在のセクターから緊急離脱を試みます。");
    window.dispatchEvent(new CustomEvent("ACTION_ESCAPE"));
  },

  // --- 🛠️ ユーティリティ ---

  damage: (amount) => {
    if (get().isGameOver) return;
    const nextHp = Math.max(0, get().hp - amount);
    set({ hp: nextHp, isGameOver: nextHp <= 0 });
    get().addLog(`💥 警告：${amount} ダメージを受領。`);
  },

  resetGame: () => set({
    turn: 0, hp: 100, stamina: 100, isGameOver: false, isSubmitted: false, isMyTurn: true,
    logs: ["🌞 システム再起動：スタンバイ。"],
    currentDistrictName: "地点未選択"
  }),

  setIsSubmitted: (val) => set({ isSubmitted: val }),
  addLog: (text) => set((state) => ({ logs: [text, ...state.logs].slice(0, 10) })),
  saveGame: () => get().addLog("💾 作戦データを保存しました。"),
  loadGame: () => get().addLog("📂 作戦データを読み込みました。"),
}));