import { create } from 'zustand';
import socket from './socket';

// 🚀 【なお仕様】ID 11101系（27スポット）完全移行 ＆ バフカード定義
const SPECIALTY_DATA: Record<number, { name: string; effect: string }> = {
  11101: { name: "絶品特製チチャロン", effect: "ATK +15%" },
  11102: { name: "夜明けのエナジードリンク", effect: "AP回復速度UP" },
  11103: { name: "サン・ペドロの守護石", effect: "DEF +20" },
  11104: { name: "ITパークの光回線", effect: "命中率UP" },
  11105: { name: "セブ・ゴールド・マンゴー", effect: "全ステータス +5%" },
  11119: { name: "マリン・バースト", effect: "ATK +10" },
  11120: { name: "ヘリテージ・スパイス", effect: "DEF +10" },
};

const GODS_DATA = [
  { id: 1, name: "戦神 ラプラプ", bonus: "ATK +20", item: "古びた剣" },
  { id: 2, name: "豊穣の女神 セブナ", bonus: "MAX AP +30", item: "マンゴーの種" },
  { id: 3, name: "知恵の神 クレド", bonus: "毎ターンAP回復", item: "光るUSB" },
];

const API_BASE = "http://localhost/cebu-conquest/cebu-conquest-batch21-am/api"; 

interface GameState {
  token: string | null;
  isAuthenticated: boolean;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  blessing: number;
  atk: number; 
  def: number;
  turn: number; 
  maxTurn: number;
  logs: string[]; 
  roomId: string;         // 🚀 修正：App.tsxのエラー解消用に追加
  players: any[];         // 🚀 修正：RecordからArrayに変更（LobbyView用）
  districts: Record<string, string>;
  currentDistrictName: string;
  selectedDistrictId: number | null;
  playerName: string;
  myId: string; 
  myTeam: string; 
  isMyTurn: boolean; 
  turnOwner: string;
  isGameOver: boolean; 
  isSubmitted: boolean;
  selectedGodId: number | null;
  godsList: typeof GODS_DATA;
  resultData: any | null;
  predictionModalOpen: boolean;
  targetDistrictInfo: { id: number; name: string; enemyDef: number } | null;
  activeBuffs: { id: number; name: string; effect: string }[];

  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  nextTurn: () => void; 
  selectGod: (id: number) => void; 
  setPlayerName: (name: string) => void; 
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<any>;
  openPrediction: (id: number, name: string) => void;
  closePrediction: () => void;
  updateBuffs: () => void;
  setStatus: (status: Partial<GameState>) => void;
  syncServerState: (data: any, myId: string) => void;
  attack: (targetId: number) => void;
  defend: () => void; 
  stay: () => void;
  escape: () => void;
  endTurn: () => void; 
  addLog: (text: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('cebu_token') : null,
  isAuthenticated: !!(typeof window !== 'undefined' ? localStorage.getItem('cebu_token') : null),
  hp: 100, maxHp: 100,
  stamina: 100, maxStamina: 100,
  blessing: 1.0, atk: 50, def: 40,
  turn: 0, maxTurn: 10,
  logs: ["🌞 ミッション開始。出撃地点を選択してください。"],
  roomId: '',             // 🚀 初期値追加
  players: [],            // 🚀 初期値を空配列に
  districts: {},
  currentDistrictName: "地点未選択", selectedDistrictId: null,
  playerName: "", myId: "",
  myTeam: "Explorer", 
  isMyTurn: true, turnOwner: "YOU",
  isGameOver: false, isSubmitted: false,
  selectedGodId: null,
  godsList: GODS_DATA,
  resultData: null,
  predictionModalOpen: false,
  targetDistrictInfo: null,
  activeBuffs: [],

  login: async (username, password = "password123") => {
    try {
      const res = await fetch(`${API_BASE}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const json = await res.json();
      if (json.status === 'success') {
        const { token, user } = json.data;
        localStorage.setItem('cebu_token', token);
        set({
          token,
          isAuthenticated: true,
          playerName: user.username,
          myTeam: user.team || "Blue Team", 
          hp: user.current_hp || 100,
          maxHp: user.max_hp || 100,
          atk: user.atk || 100,
          def: user.def || 100,
          stamina: user.stamina || 100,
          maxStamina: user.max_hp || 100,
        });
        get().addLog(`🔐 認証完了。コマンダー ${user.username} ログイン。`);
        return true;
      }
      return false;
    } catch (e) {
      get().addLog("❌ サーバー接続失敗");
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('cebu_token');
    set({ token: null, isAuthenticated: false });
    window.location.reload();
  },

  nextTurn: () => {
    const nextT = get().turn + 1;
    set({ turn: nextT });
    get().addLog(`⏩ ターン進行: Turn ${nextT}`);
  },

  selectGod: (id: number) => {
    const god = GODS_DATA.find(g => g.id === id);
    if (!god) return;
    set((state) => ({
      selectedGodId: id,
      atk: id === 1 ? state.atk + 20 : state.atk,
      stamina: id === 2 ? state.stamina + 30 : state.stamina,
    }));
    get().addLog(`✨ ${god.name}の加護を得た！`);
  },

  setPlayerName: (name) => set({ playerName: name }),

  authenticatedFetch: async (url, options = {}) => {
    const { token } = get();
    const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...options.headers };
    const res = await fetch(`${API_BASE}/${url}`, { ...options, headers });
    return res.json();
  },

  openPrediction: (id, name) => {
    set({ 
      predictionModalOpen: true, 
      selectedDistrictId: Number(id), 
      targetDistrictInfo: { id: Number(id), name, enemyDef: 40 } 
    });
  },

  closePrediction: () => set({ predictionModalOpen: false, targetDistrictInfo: null }),

  syncServerState: (data, myId) => {
    if (!data) return;
    
    // 🚀 修正：サーバーからの players がオブジェクトなら配列に変換、配列ならそのままセット
    const rawPlayers = data.players ?? {};
    const playersArray = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
    
    // 自分のデータを特定（配列から検索、またはオブジェクトから取得）
    const myPlayerData = Array.isArray(rawPlayers) 
      ? rawPlayers.find(p => p.id === myId)
      : rawPlayers[myId];
    
    set((state) => {
      const isAlreadyOnMap = !!myPlayerData?.districtId;
      let safeTurn = data.turn;
      if (isAlreadyOnMap && data.turn === 0) {
        safeTurn = state.turn > 0 ? state.turn : 1; 
      }

      const isMe = data.turnOwnerId === myId;
      return {
        ...state,
        myId: myId,
        roomId: data.roomId ?? state.roomId, // 🚀 roomId 同期
        hp: myPlayerData?.hp ?? state.hp,
        maxHp: myPlayerData?.maxHp ?? state.maxHp,
        stamina: myPlayerData?.ap ?? myPlayerData?.stamina ?? state.stamina,
        atk: myPlayerData?.atk ?? state.atk,
        def: myPlayerData?.def ?? state.def,
        districts: data.districts ?? state.districts,
        players: playersArray, // 🚀 常に配列として保存
        turn: safeTurn,
        isMyTurn: isMe,
        turnOwner: isMe ? "YOU" : (data.turnOwnerName || "ENEMY"),
        isSubmitted: isMe ? false : state.isSubmitted 
      };
    });
    
    window.dispatchEvent(new CustomEvent('MAP_REPAINT', { detail: { districts: data.districts, players: data.players } }));
    get().updateBuffs();
  },

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

  attack: (targetId) => {
    const { stamina, isMyTurn } = get();
    if (!isMyTurn || stamina < 5) return;
    socket.emit("ACTION_SUBMIT", { type: 'attack', targetId: Number(targetId) });
    get().addLog(`⚔️ 地区 ${targetId} 攻撃指令！`);
    get().closePrediction();
  },

  defend: () => { 
    socket.emit("ACTION_SUBMIT", { type: 'defend' }); 
    get().addLog("🛡️ 防御。"); 
  },

  stay: () => { 
    const { isMyTurn } = get();
    if (!isMyTurn) return;
    socket.emit("ACTION_SUBMIT", { type: 'stay' }); 
    get().addLog("🧘 休息。"); 
    window.dispatchEvent(new CustomEvent('ACTION_STAY'));
  },

  escape: () => { socket.emit("ACTION_SUBMIT", { type: 'escape' }); get().addLog("🏃 撤退。"); },
  endTurn: () => { socket.emit("ACTION_SUBMIT", { type: 'turn_end' }); set({ isMyTurn: false, isSubmitted: true }); },
  setStatus: (newStatus) => set((state) => ({ ...state, ...newStatus })),
  addLog: (text) => set((state) => ({ logs: [text, ...state.logs].slice(0, 10) })),
  resetGame: () => window.location.reload(),
}));

// サーバーからの実況通知
socket.on('GAME_LOG', (msg: string) => {
  useGameStore.getState().addLog(`🛰️ SERVER: ${msg}`);
});

socket.on('ERROR', (msg: string) => {
  useGameStore.getState().addLog(`⚠️ SERVER: ${msg}`);
});

if (typeof window !== 'undefined') { (window as any).useGameStore = useGameStore; }