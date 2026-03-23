import { create } from 'zustand';

// --- 1. 型定義：プレイヤーの「今の姿」 ---
interface PlayerData {
  id: string;         // Socket ID
  userId: string;     // ユーザーID
  username: string;   // 名前
  x: number;          // 座標X
  y: number;          // 座標Y
  team: string;       // 所属チーム
  districtId: number | null; // ★追加：今どこの地区にいるか
  hp: number;                // ★追加：そのプレイヤーの体力
}

interface GameState {
  // --- A: ローカルステート（自分のステータス） ---
  hp: number;
  stamina: number;
  blessing: number;
  day: number;
  logs: string[];

  // --- B: マルチプレイ同期ステート（サーバーの真実） ---
  serverStatus: string; 
  serverTurn: number;                  // ★追加：現在のターン
  players: Record<string, PlayerData>; // 全員のデータ
  districts: Record<string, any>;      // 陣地の占領状況
  
  // --- C: アクション（状態を動かす魔法） ---
  damage: (amount: number) => void;
  consumeStamina: (amount: number) => void; // ★追加：動くと減る
  addStamina: (amount: number) => void;
  nextDay: () => void;
  addLog: (text: string) => void;
  saveGame: () => void;
  loadGame: () => void;
  syncServerState: (serverData: any) => void; 
}

// --- 2. ストアの実装 ---
export const useGameStore = create<GameState>((set, get) => ({
  // 初期値
  hp: 100,
  stamina: 100,
  blessing: 0,
  day: 1,
  logs: ["Cebu conquest start"],
  
  serverStatus: 'waiting',
  serverTurn: 0, // ★追加
  players: {},
  districts: {},
  
  // ダメージ
  damage: (amount) => set((state) => ({ hp: state.hp - amount })),

  // ★追加：スタミナ消費（Phaserで一歩動くごとに呼び出す用）
  consumeStamina: (amount) => set((state) => ({ 
    stamina: Math.max(0, state.stamina - amount) // 0以下にはならないようにガード
  })),

  // スタミナ回復
  addStamina: (amount) => set((state) => ({ 
    stamina: Math.min(100, state.stamina + amount) 
  })),
  
  nextDay: () => set((state) => ({ 
    day: state.day + 1, 
    stamina: 100
  })),

  addLog: (text) => set((state) => ({ logs: [text, ...state.logs].slice(0, 5) })),

  saveGame: () => {
    const data = {
      hp: get().hp,
      stamina: get().stamina,
      blessing: get().blessing,
      day: get().day,
      logs: get().logs,
    };
    localStorage.setItem('cebu_conquest_save', JSON.stringify(data));
    alert("Data saved to local storage!");
  },

  loadGame: () => {
    const savedData = localStorage.getItem('cebu_conquest_save');
    if (savedData) {
      const data = JSON.parse(savedData);
      set({ 
        hp: data.hp, 
        stamina: data.stamina, 
        blessing: data.blessing, 
        day: data.day, 
        logs: data.logs 
      });
      alert("Loading complete!");
    } else {
      alert("No save data found.");
    }
  },

  // ★ サーバーデータの同期（司令塔）
  // 【役割】毎秒届く serverData を Zustand の各部屋に仕分けます
  syncServerState: (serverData) => set(() => ({
    serverStatus: serverData.status || 'playing',
    serverTurn: serverData.turn || 0,    // ★追加
    players: serverData.players || {},  // 各プレイヤーの districtId や hp もここに入る
    districts: serverData.districts || {}, 
  })),
}));