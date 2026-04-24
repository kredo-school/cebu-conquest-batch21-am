import { create } from 'zustand';
import socket from './socket';

// 🚀 8つの神様（加護）スロット定義をここに統合（UIと合わせるため）
const GODS_DATA = [
  { id: 1, name: "LAPU-LAPU", role: "WAR GOD", bonus: "ATK +20", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=400", desc: "近接攻撃ダメージを25%上昇させる。" },
  { id: 2, name: "SEBUNA", role: "HARVEST", bonus: "MAX AP +30", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400", desc: "タクティカル・スタミナの最大値を増加。" },
  { id: 3, name: "KREDO", role: "WISDOM", bonus: "AP REGEN", img: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=400", desc: "毎ターンのAP回復スピードを向上させる。" },
  { id: 4, name: "MAYARI", role: "STEALTH", bonus: "SILENT", img: "https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=400", desc: "足音を消し、敵の探知範囲を縮小させる。" },
  { id: 5, name: "LUMAWIG", role: "HEAVY", bonus: "ARMOR +40", img: "https://images.unsplash.com/photo-1584281722573-0f723675017e?q=80&w=400", desc: "アーマー耐久値を大幅に強化する。" },
  { id: 6, name: "HANUMAN", role: "SUPPORT", bonus: "SPEED +15", img: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=400", desc: "移動速度と回避率を上昇させる。" },
  { id: 7, name: "BAKUNAWA", role: "SHADOW", bonus: "INVIS", img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=400", desc: "夜間フェーズ中に一時的に姿を消す。" },
  { id: 8, name: "IDANALE", role: "RECON", bonus: "SCAN", img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=400", desc: "障害物越しの敵をハイライト表示する。" },
];

const SPECIALTY_DATA: Record<number, { name: string; effect: string }> = {
  11101: { name: "絶品特製チチャロン", effect: "ATK +15%" },
  11102: { name: "夜明けのエナジードリンク", effect: "AP回復速度UP" },
  11103: { name: "サン・ペドロの守護石", effect: "DEF +20" },
  11104: { name: "ITパークの光回線", effect: "命中率UP" },
  11105: { name: "セブ・ゴールド・マンゴー", effect: "全ステータス +5%" },
  11119: { name: "マリン・バースト", effect: "ATK +10" },
  11120: { name: "ヘリテージ・スパイス", effect: "DEF +10" },
};

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
  roomId: string;
  players: any[];
  districts: Record<string, string>;
  currentDistrictName: string;
  selectedDistrictId: number | null;
  playerName: string;
  myId: string; 
  myTeam: string; 
  isMyTurn: boolean; 
  turnOwner: string;
  isGameOver: boolean; 
  winnerId: string | null; 
  isSubmitted: boolean;
  selectedGodId: number | null;
  godsList: typeof GODS_DATA;
  resultData: any | null;
  predictionModalOpen: boolean;
  // 🚀 修正：isMyTerritory と isNeutral を追加
  targetDistrictInfo: { id: number; name: string; enemyDef: number; isMyTerritory?: boolean; isNeutral?: boolean } | null;
  activeBuffs: { id: number; name: string; effect: string }[];

  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  nextTurn: () => void; 
  selectGod: (id: number) => void; 
  setPlayerName: (name: string) => void; 
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<any>;
  // 🚀 修正：引数に isMyTerritory, isNeutral を追加
  openPrediction: (id: number, name: string, isMyTerritory?: boolean, isNeutral?: boolean) => void;
  closePrediction: () => void;
  updateBuffs: () => void;
  setStatus: (status: Partial<GameState>) => void;
  syncServerState: (data: any, myId: string) => void;
  attack: (targetId: number) => void;
  move: (targetId: number) => void; // 🚀 追加：移動コマンド
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
  roomId: '',
  players: [],
  districts: {},
  currentDistrictName: "地点未選択", selectedDistrictId: null,
  playerName: "", myId: "",
  myTeam: "Explorer", 
  isMyTurn: true, turnOwner: "YOU",
  isGameOver: false, 
  winnerId: null, 
  isSubmitted: false,
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
      maxStamina: id === 2 ? state.maxStamina + 30 : state.maxStamina,
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

  // 🚀 修正：フラグを受け取り targetDistrictInfo に保存する
  openPrediction: (id, name, isMyTerritory = false, isNeutral = false) => {
    set({ 
      predictionModalOpen: true, 
      selectedDistrictId: Number(id), 
      targetDistrictInfo: { id: Number(id), name, enemyDef: 40, isMyTerritory, isNeutral } 
    });
  },

  closePrediction: () => set({ predictionModalOpen: false, targetDistrictInfo: null }),

  syncServerState: (data, myId) => {
    if (!data) return;
    
    const rawPlayers = data.players ?? {};
    const playersArray = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
    
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
        roomId: data.roomId ?? state.roomId,
        hp: myPlayerData?.hp ?? state.hp,
        maxHp: myPlayerData?.maxHp ?? state.maxHp,
        stamina: myPlayerData?.ap ?? myPlayerData?.stamina ?? state.stamina,
        atk: myPlayerData?.atk ?? state.atk,
        def: myPlayerData?.def ?? state.def,
        districts: data.districts ?? state.districts,
        players: playersArray,
        turn: safeTurn,
        isMyTurn: isMe,
        turnOwner: isMe ? "YOU" : (data.turnOwnerName || "ENEMY"),
        isSubmitted: isMe ? false : state.isSubmitted,
        isGameOver: data.isGameOver ?? state.isGameOver,
        winnerId: data.winnerId ?? state.winnerId
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

  // 🚀 追加：自陣内の移動コマンド
  move: (targetId) => {
    const { isMyTurn } = get();
    if (!isMyTurn) return;
    socket.emit("ACTION_SUBMIT", { type: 'move', targetId: Number(targetId) });
    get().addLog(`🚚 地区 ${targetId} へ陣形を移動！`);
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

// ソケット通知の受け口
socket.on('GAME_LOG', (msg: string) => {
  useGameStore.getState().addLog(`🛰️ SERVER: ${msg}`);
});

socket.on('ERROR', (msg: string) => {
  useGameStore.getState().addLog(`⚠️ SERVER: ${msg}`);
});

if (typeof window !== 'undefined') { (window as any).useGameStore = useGameStore; }