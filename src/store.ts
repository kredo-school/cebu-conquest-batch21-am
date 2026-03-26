import { create } from 'zustand';

interface PlayerData {
  id: string; username: string; team: string;
  districtId: number | null; hp: number;
}

interface GameState {
  hp: number;
  stamina: number;
  blessing: number;
  day: number;
  logs: string[];
  serverStatus: string;
  players: Record<string, PlayerData>;
  districts: Record<string, any>;
  
  // ✅ アクションの追加（Sidebarのエラーを消す）
  setStatus: (status: Partial<GameState>) => void;
  damage: (amount: number) => void;
  consumeStamina: (amount: number) => void;
  addStamina: (amount: number) => void;
  nextDay: () => void;
  addLog: (text: string) => void;
  saveGame: () => void;
  loadGame: () => void;
  syncServerState: (serverData: any) => void; 
}

export const useGameStore = create<GameState>((set, get) => ({
  hp: 100, stamina: 100, blessing: 1.0, day: 1, logs: ["Cebu conquest start"],
  serverStatus: 'waiting', players: {}, districts: {},

  setStatus: (newStatus) => set((state) => ({ ...state, ...newStatus })),
  damage: (amount) => set((state) => ({ hp: Math.max(0, state.hp - amount) })),
  consumeStamina: (amount) => set((state) => ({ stamina: Math.max(0, state.stamina - amount) })),
  addStamina: (amount) => set((state) => ({ stamina: Math.min(100, state.stamina + amount) })),
  
  // ✅ 日付を進める
  nextDay: () => set((state) => ({ day: state.day + 1, stamina: 100 })),

  addLog: (text) => set((state) => ({ logs: [text, ...state.logs].slice(0, 5) })),

  // ✅ セーブ機能
  saveGame: () => {
    const data = { hp: get().hp, stamina: get().stamina, day: get().day };
    localStorage.setItem('cebu_save', JSON.stringify(data));
    get().addLog("💾 データ保存完了");
  },

  // ✅ ロード機能
  loadGame: () => {
    const saved = localStorage.getItem('cebu_save');
    if (saved) {
      set(JSON.parse(saved));
      get().addLog("📂 データ読み込み完了");
    }
  },

  syncServerState: (data) => set({ 
    serverStatus: data.status || 'playing',
    players: data.players || {},
    districts: data.districts || {} 
  }),
}));