import { create } from 'zustand';
import socket from './socket';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../shared/socketEvents.js';

interface ChatMessage {
  sender: string;
  message: string;
  color?: string;
  timestamp: string;
}

// 🚀 神々のデータ
const GODS_DATA = [
  { id: 1, name: "LAPU-LAPU", role: "WAR GOD", bonus: "ATK +20", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=400", desc: "島嶼戦における近接攻撃ダメージを25%上昇させ、物理防御力を強化する。" },
  { id: 2, name: "SEBUNA", role: "HARVEST", bonus: "MAX AP +30", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400", desc: "全分隊員のタクティカルアビリティのクールダウンを15%短縮する。" },
  { id: 3, name: "KREDO", role: "WISDOM", bonus: "AP REGEN", img: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=400", desc: "毎ターンのAP回復スピードを大幅に向上させ、継戦能力を高める。" },
  { id: 4, name: "MAYARI", role: "STEALTH", bonus: "SILENT", img: "https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=400", desc: "隠密探知範囲を拡大し、足音の静音性を40%向上させる。" },
  { id: 5, name: "LUMAWIG", role: "HEAVY", bonus: "ARMOR +40", img: "https://images.unsplash.com/photo-1584281722573-0f723675017e?q=80&w=400", desc: "アーマー耐久値を増加させ、燃焼ステータス効果を無効化する。" },
  { id: 6, name: "HANUMAN", role: "SUPPORT", bonus: "SPEED +15", img: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=400", desc: "移動速度と回避率を上昇させる。" },
  { id: 7, name: "BAKUNAWA", role: "SHADOW", bonus: "INVIS", img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=400", desc: "夜間サイクル中、一時的な不可視化を可能にする。" },
  { id: 8, name: "IDANALE", role: "RECON", bonus: "SCAN", img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=400", desc: "障害物越しの敵やリソースをハイライト表示する。" },
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

// 🚀 View名の定義
type ViewType = 'login' | 'setup' | 'lobby' | 'selection' | 'waiting' | 'game' | 'ranking';

interface GameState {
  view: ViewType;
  setView: (view: ViewType) => void; // 🚀 App.tsx で必要なメソッドを追加 
  token: string | null;
  isAuthenticated: boolean;
  isServerOnline: boolean; 
  hp: number; // [cite: 35]
  maxHp: number;
  ap: number; // 
  maxAp: number; 
  blessing: number; // 
  atk: number; 
  def: number;
  turn: number; 
  maxTurn: number;
  logs: string[]; 
  chatLogs: ChatMessage[]; 
  roomId: string;
  players: any[];
  maxPlayers: number; // 
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
  targetDistrictInfo: { id: number; name: string; enemyDef: number; isMyTerritory?: boolean; isNeutral?: boolean } | null;
  activeBuffs: { id: number; name: string; effect: string }[];
  bgmVolume: number;
  seVolume: number;
  isUnderAttack: boolean;
  setUnderAttack: (status: boolean) => void;

  login: (username: string, password?: string) => Promise<boolean>; // [cite: 11, 12]
  logout: () => void;
  nextTurn: () => void; 
  selectGod: (id: number) => void; // 
  setPlayerName: (name: string) => void; 
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<any>;
  openPrediction: (id: number, name: string, isMyTerritory?: boolean, isNeutral?: boolean) => void;
  closePrediction: () => void;
  updateBuffs: () => void; // [cite: 19, 53]
  setStatus: (status: Partial<GameState>) => void;
  syncServerState: (data: any, myId: string) => void; // [cite: 22, 53]
  attack: (targetId: number) => void; // [cite: 21, 53]
  move: (targetId: number) => void;
  stay: () => void; // [cite: 21, 53]
  defend: () => void; // [cite: 33]
  escape: () => void;
  endTurn: () => void; 
  addLog: (text: string) => void;
  addChatLog: (msg: ChatMessage) => void; 
  resetGame: () => void;
  setBgmVolume: (vol: number) => void;
  setSeVolume: (vol: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  view: 'login',
  setView: (view) => set({ view }), // 🚀 実装を追加 
  token: typeof window !== 'undefined' ? localStorage.getItem('cebu_token') : null,
  isAuthenticated: !!(typeof window !== 'undefined' ? localStorage.getItem('cebu_token') : null),
  isServerOnline: socket.connected, 
  hp: 100, maxHp: 100,
  ap: 100, maxAp: 100, // [cite: 36]
  blessing: 1.0, atk: 50, def: 40,
  turn: 0, maxTurn: 10,
  logs: ["🌞 ミッション開始。出撃地点を選択してください。"],
  chatLogs: [], 
  roomId: '',
  players: [],
  maxPlayers: 2, // 
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
  bgmVolume: 0.5,
  seVolume: 0.5,
  isUnderAttack: false,
  setUnderAttack: (status) => set({ isUnderAttack: status }),

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
          myTeam: user.team || "Explorer", 
          hp: user.current_hp || 100,
          maxHp: user.max_hp || 100,
          atk: user.atk || 50,
          def: user.def || 40,
          ap: user.ap || user.stamina || 100, // APへ統一 [cite: 36]
          maxAp: user.max_ap || 100,
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
    const { isSubmitted, roomId } = get();
    if (isSubmitted) return; 

    const god = GODS_DATA.find(g => g.id === id);
    if (!god) return;

    socket.emit(CLIENT_EVENTS.SELECT_GOD, { roomId, godId: id });
    set((state) => ({
      selectedGodId: id,
      atk: id === 1 ? 50 + 20 : state.atk,
      maxAp: id === 2 ? 100 + 30 : state.maxAp,
    }));
    get().addLog(`⚡ ${god.name} との神経リンクを確立中...`);
  },

  setPlayerName: (name) => set({ playerName: name }),

  authenticatedFetch: async (url, options = {}) => {
    const { token } = get();
    const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...options.headers };
    const res = await fetch(`${API_BASE}/${url}`, { ...options, headers });
    return res.json();
  },

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
    const currentState = get();

    const rawPlayers = data.players ?? {};
    const playersArray = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
    const myPlayerData = Array.isArray(rawPlayers) ? rawPlayers.find((p: any) => p.id === myId) : rawPlayers[myId];
    
    const nextHp = myPlayerData?.hp ?? currentState.hp;
    const nextAp = myPlayerData?.ap ?? myPlayerData?.stamina ?? currentState.ap; // [cite: 36]
    const nextAtk = myPlayerData?.atk ?? currentState.atk;
    const nextDef = myPlayerData?.def ?? currentState.def;
    const nextBlessing = myPlayerData?.faith ?? myPlayerData?.blessing ?? currentState.blessing; //
    const nextTurn = data.turn ?? currentState.turn;
    const isMe = data.turnOwnerId === myId;
    const isGameOver = data.isGameOver ?? currentState.isGameOver;

    if (
      currentState.hp !== nextHp ||
      currentState.ap !== nextAp ||
      currentState.atk !== nextAtk ||
      currentState.def !== nextDef ||
      currentState.blessing !== nextBlessing ||
      currentState.turn !== nextTurn ||
      currentState.isMyTurn !== isMe ||
      currentState.isGameOver !== isGameOver ||
      JSON.stringify(currentState.districts) !== JSON.stringify(data.districts) ||
      JSON.stringify(currentState.players) !== JSON.stringify(playersArray)
    ) {
      set((state) => ({
        ...state,
        myId: myId,
        roomId: data.roomId ?? state.roomId,
        maxPlayers: data.maxPlayers ?? state.maxPlayers, // 人数同期 
        hp: nextHp,
        maxHp: myPlayerData?.maxHp ?? state.maxHp,
        ap: nextAp,
        atk: nextAtk,
        def: nextDef,
        blessing: nextBlessing,
        districts: data.districts ?? state.districts,
        players: playersArray, 
        turn: nextTurn,
        isMyTurn: isMe,
        turnOwner: isMe ? "YOU" : (data.turnOwnerName || "ENEMY"),
        isSubmitted: isMe ? false : state.isSubmitted,
        isGameOver: isGameOver,
        winnerId: data.winnerId ?? state.winnerId
      }));

      const playersAsObject = Array.isArray(data.players)
        ? data.players.reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {})
        : (data.players ?? {});

      window.dispatchEvent(new CustomEvent('MAP_REPAINT', { detail: { districts: data.districts, players: playersAsObject } }));
      get().updateBuffs();
    }
  },

  updateBuffs: () => {
    const { districts, myId } = get();
    const myDistrictIds = Object.entries(districts).filter(([_, ownerId]) => ownerId === myId).map(([id, _]) => Number(id)); 
    const buffs = myDistrictIds.filter(id => SPECIALTY_DATA[id]).map(id => ({ id, ...SPECIALTY_DATA[id] }));
    set({ activeBuffs: buffs });
  },

  attack: (targetId) => {
    const { ap, isMyTurn } = get();
    if (!isMyTurn || ap < 5) return;
    socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'attack', targetId: Number(targetId) });
    get().addLog(`⚔️ 地区 ${targetId} 攻撃指令！`);
    get().closePrediction();
  },

  move: (targetId) => {
    const { isMyTurn } = get();
    if (!isMyTurn) return;
    socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'move', targetId: Number(targetId) });
    get().addLog(`🚚 地区 ${targetId} へ陣形を移動！`);
    get().closePrediction();
  },

  stay: () => { 
    const { isMyTurn } = get();
    if (!isMyTurn) return;
    socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'stay' }); // [cite: 21]
    get().addLog("🧘 休息中。"); 
    window.dispatchEvent(new CustomEvent('ACTION_STAY'));
  },

  defend: () => {
    const { isMyTurn } = get();
    if (!isMyTurn) return;
    socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'defend' }); // [cite: 33]
    get().addLog("🛡️ 防御体勢を構築。");
  },

  escape: () => { 
    socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'escape' }); 
    get().addLog("🏃 撤退。"); 
  },

  endTurn: () => { 
    socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'turn_end' }); 
    set({ isMyTurn: false, isSubmitted: true }); 
  },

  setStatus: (status) => set((state) => ({ ...state, ...status })),
  addLog: (text) => set((state) => ({ logs: [text, ...state.logs].slice(0, 10) })),
  addChatLog: (msg) => set((state) => ({ chatLogs: [...state.chatLogs, msg].slice(-50) })),
  resetGame: () => window.location.reload(),
  setBgmVolume: (vol) => set({ bgmVolume: vol }),
  setSeVolume: (vol) => set({ seVolume: vol }),
}));

// --- 📡 Socket Listeners ---
socket.on('connect', () => {
  useGameStore.getState().setStatus({ isServerOnline: true });
});

socket.on('disconnect', () => {
  useGameStore.getState().setStatus({ isServerOnline: false });
});

socket.on(SERVER_EVENTS.RECEIVE_CHAT, (data: any) => {
  useGameStore.getState().addChatLog({
    sender: data.sender,
    message: data.message,
    color: data.color || '#cbd5e1',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
});

socket.on(SERVER_EVENTS.GAME_LOG, (msg: string) => {
  useGameStore.getState().addLog(`🛰️ SERVER: ${msg}`);
});

socket.on(SERVER_EVENTS.ERROR_MESSAGE, (msg: string) => {
  useGameStore.getState().addLog(`⚠️ SERVER: ${msg}`);
});

if (typeof window !== 'undefined') { (window as any).useGameStore = useGameStore; }