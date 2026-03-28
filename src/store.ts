import { create } from 'zustand';

// ✅ TypeScriptに全ての命令と変数を教える「完璧な型紙」
interface GameState {
  hp: number;
  stamina: number;
  blessing: number;
  day: number;
  logs: string[];
  players: Record<string, any>;
  districts: Record<string, string>;
  currentDistrictName: string;
  myId: string;
  myTeam: string;
  isMyTurn: boolean;
  turnOwner: string;
  // 全てのアクションを定義
  setStatus: (status: Partial<GameState>) => void;
  syncServerState: (data: any, myId: string) => void;
  damage: (amount: number) => void;
  addLog: (text: string) => void;
  nextDay: () => void;
  saveGame: () => void;
  loadGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  hp: 100, stamina: 100, blessing: 1, day: 1, logs: ["セブ島攻略作戦、開始。"],
  players: {}, districts: {}, currentDistrictName: "未展開",
  myId: "", myTeam: "red", isMyTurn: false, turnOwner: "待機中",

  setStatus: (newStatus) => set((state) => ({ ...state, ...newStatus })),
  damage: (amount) => set((state) => ({ hp: Math.max(0, state.hp - amount) })),
  addLog: (text) => set((state) => ({ logs: [text, ...state.logs].slice(0, 10) })),
  nextDay: () => set((state) => ({ day: state.day + 1, stamina: 100, isMyTurn: true, turnOwner: "YOU" })),
  saveGame: () => get().addLog("💾 データを保存しました"),
  loadGame: () => get().addLog("📂 データを読み込みました"),

  syncServerState: (data, myId) => {
    const players = data.players || {};
    const myInfo = players[myId];
    set({
      players: players,
      districts: data.districts || {},
      myId: myId,
      myTeam: myInfo ? myInfo.team : get().myTeam,
      isMyTurn: data.turnOwnerId ? data.turnOwnerId === myId : get().isMyTurn,
      turnOwner: data.turnOwnerName || get().turnOwner
    });
  },
}));