import { create } from 'zustand';
import socket from './socket';

const SPECIALTY_DATA: Record<number, { name: string; effect: string }> = {
  101: { name: "セブ・マンゴー", effect: "ATK +10%" },
  102: { name: "サン・ペドロの祈り", effect: "DEF +10%" },
  103: { name: "レチョン・パワー", effect: "HP回復 +5" },
  104: { name: "ITパークの知恵", effect: "AP消費 -2" },
  105: { name: "マゼラン_クロス", effect: "信仰力 +0.2" },
};

const GODS_DATA = [
  { id: 1, name: "戦神 ラプパプ", bonus: "初期攻撃力 ATK +20", item: "古びた剣" },
  { id: 2, name: "豊穣の女神 セブナ", bonus: "初期スタミナ AP +30", item: "マンゴーの種" },
  { id: 3, name: "知恵の神 クレド", bonus: "毎ターンAP回復 +5", item: "光るUSB" },
];

interface GameState {
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
  selectedGodId: number | null;
  godsList: typeof GODS_DATA;
  selectGod: (id: number) => void;
  resultData: { winnerName: string; scores: Record<string, number>; occupiedTerritories: number; mvp: string; } | null;
  predictionModalOpen: boolean;
  targetDistrictInfo: { id: number; name: string; enemyDef: number } | null;
  openPrediction: (id: number, name: string) => void;
  closePrediction: () => void;
  // 🚀 型を明示的に指定
  setModal: (open: boolean, district?: { id: number; name: string } | null) => void;
  activeBuffs: { id: number; name: string; effect: string }[];
  updateBuffs: () => void;
  setStatus: (status: Partial<GameState>) => void;
  syncServerState: (data: any, myId: string) => void;
  setPlayerName: (name: string) => void;
  login: (username: string) => Promise<boolean>;
  damage: (amount: number) => void;
  addLog: (text: string) => void;
  resetGame: () => void;
  setIsSubmitted: (val: boolean) => void;
  nextTurn: () => void; 
  attack: (targetId: number) => void;
  defense: () => void;
  stay: () => void;
  escape: () => void;
  endTurn: () => void; 
}

export const useGameStore = create<GameState>((set, get) => ({
  hp: 100, stamina: 100, blessing: 1.0, atk: 50, def: 40,
  turn: 0, maxTurn: 10,
  logs: ["🌞 戦場へようこそ。出撃地点を選択してください。"],
  players: {}, districts: {},
  currentDistrictName: "地点未選択", selectedDistrictId: null,
  playerName: "", myId: "", myTeam: "red",
  isMyTurn: true, turnOwner: "YOU",
  isGameOver: false, isSubmitted: false, isAuthenticated: false,
  activeBuffs: [],
  selectedGodId: null,
  godsList: GODS_DATA,
  resultData: null,
  predictionModalOpen: false,
  targetDistrictInfo: null,

  openPrediction: (id: number, name: string) => {
    set({ predictionModalOpen: true, targetDistrictInfo: { id: Number(id), name, enemyDef: 40 } });
  },

  closePrediction: () => set({ predictionModalOpen: false, targetDistrictInfo: null }),

  // 🚀 引数に型を追加してエラーを解消
  setModal: (open: boolean, district: { id: number; name: string } | null = null) => {
    if (open && district) {
      get().openPrediction(district.id, district.name);
    } else {
      get().closePrediction();
    }
  },

  login: async (username: string) => {
    set({ isAuthenticated: true, playerName: username, turn: 0, isMyTurn: true });
    return true; 
  },

  selectGod: (id: number) => {
    const god = GODS_DATA.find(g => g.id === id);
    if (god) {
      set((state) => ({ 
        selectedGodId: id,
        atk: id === 1 ? state.atk + 20 : state.atk,
        stamina: id === 2 ? state.stamina + 30 : state.stamina
      }));
      get().addLog(`🙏 守護神：[${god.name}] の加護を受けました。(${god.bonus})`);
    }
  },

  setPlayerName: (name) => set({ playerName: name }),

  nextTurn: () => {
    set((state) => ({ turn: state.turn + 1, isMyTurn: false, isSubmitted: false, selectedDistrictId: null }));
  },

  updateBuffs: () => {
    const { districts, myId } = get();
    const myDistrictIds = Object.entries(districts)
      .filter(([_, ownerId]) => ownerId === myId)
      .map(([id, _]) => Number(id));
    const buffs = myDistrictIds.filter(id => SPECIALTY_DATA[id]).map(id => ({ id, ...SPECIALTY_DATA[id] }));
    set({ activeBuffs: buffs });
  },

  setStatus: (newStatus) => set((state) => ({ ...state, ...newStatus })),

  syncServerState: (data, myId) => {
    if (!data) return;
    if (data.status === 'finished' || data.isGameOver) {
      set({ isGameOver: true, resultData: { winnerName: data.winnerName || "UNKNOWN", scores: data.scores || {}, occupiedTerritories: Object.values(data.districts || {}).filter(id => id === myId).length, mvp: data.mvp || "No Data" } });
      return;
    }
    const isMe = data.turnOwnerId === myId;
    const myPlayerData = data.players?.[myId];
    set((state) => ({
      ...state,
      myId: myId,
      hp: myPlayerData?.hp ?? state.hp,
      stamina: myPlayerData?.ap ?? myPlayerData?.stamina ?? state.stamina,
      atk: myPlayerData?.atk ?? state.atk,
      def: myPlayerData?.def ?? state.def,
      blessing: myPlayerData?.faith ?? state.blessing,
      turn: data.turn ?? state.turn,
      districts: data.districts ?? state.districts,
      isMyTurn: data.turn === 0 ? true : isMe,
      turnOwner: isMe ? "YOU" : (data.turnOwnerName || "ENEMY"),
      isSubmitted: isMe ? false : state.isSubmitted 
    }));
    window.dispatchEvent(new CustomEvent('MAP_REPAINT', { detail: { districts: data.districts, players: data.players } }));
    get().updateBuffs();
  },

  attack: (targetId: number) => {
    const { isGameOver, isMyTurn, stamina } = get();
    if (isGameOver || !isMyTurn || stamina < 30) return;
    socket.emit("ACTION_SUBMIT", { type: 'attack', targetId: Number(targetId) });
    get().addLog(`⚔️ 地区 ${targetId} 攻撃指令！ (AP-30)`);
    get().closePrediction();
  },

  stay: () => { if (!get().isMyTurn) return; socket.emit("ACTION_SUBMIT", { type: 'stay' }); get().addLog("🧘 休息 (AP回復)"); },
  defense: () => { if (!get().isMyTurn || get().stamina < 10) return; socket.emit("ACTION_SUBMIT", { type: 'defend' }); get().addLog("🛡️ 防御！ (AP-10)"); },
  escape: () => { if (!get().isMyTurn) return; socket.emit("ACTION_SUBMIT", { type: 'escape' }); get().addLog("🏃 撤退中..."); },
  endTurn: () => { if (!get().isMyTurn) return; socket.emit("TURN_END_SUBMIT"); set({ isMyTurn: false, isSubmitted: true }); get().addLog("⌛ ターンを終了しました。"); },
  damage: (amount) => set({ hp: Math.max(0, get().hp - amount) }),
  resetGame: () => window.location.reload(),
  setIsSubmitted: (val) => set({ isSubmitted: val }),
  addLog: (text) => set((state) => ({ logs: [text, ...state.logs].slice(0, 10) })),
}));

if (typeof window !== 'undefined') { (window as any).useGameStore = useGameStore; }