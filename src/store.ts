/// <reference types="vite/client" />
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import socket from './socket';
import { CLIENT_EVENTS } from '../shared/socketEvents.js';
import { REACT_TO_PHASER } from './game/events/PhaserBridge';
import { buildLookup } from '../shared/idLookup'; 
import SoundManager from './game/SoundManager';

const MAP_REPAINT_EVENT = 'react:mapRepaint';

export const GOD_BUFF_MAP: Record<number, { hp?: number; atk?: number; def?: number; ap?: number }> = {
  1: { hp: 40 },      // Neil: MAX_HP +30, HP +10
  2: { atk: 20 },     // Garry: ATK +20
  3: { hp: 10, ap: 15 }, // Shem: HP +10, MAX_AP +15
  4: { hp: -20 },     // Quisie: HP -20
  5: { def: 15 },     // Eduardo: DEF +15
  6: { hp: -10 },     // Kurt: HP -10
  7: {},              // Stephen: FAITH_REGEN (Passive)
  8: { ap: 30 },      // Bernardine: MAX_AP +30
};

export interface ChatMessage {
  sender: string;
  message: string;
  color?: string;
  timestamp?: string | number;
}

export interface LogEntry {
  text: string;
  time: string;
}

export interface GodData {
  id: number;
  name: string;
  role: string;
  bonus: string;
  img: string;
  desc: string;
}

export interface Territory {
  district_id: number;
  name: string;
  parent_district_id?: number;
  parent_area_id?: number;
  owner_id?: string;
  [key: string]: unknown;
}

export interface Player {
  id: string;
  username: string;
  playerName?: string;
  name?: string;
  team?: string;
  color?: string;
  hp?: number;
  maxHp?: number;
  max_hp?: number;
  current_hp?: number;
  ap?: number;
  stamina?: number;
  maxAp?: number;
  max_ap?: number;
  atk?: number;
  def?: number;
  faith?: number;
  blessing?: number;
  districtId?: number | null;
  location?: number | null;
  selectedGodId?: number | null;
  godId?: number | null;
  godColor?: string | null;
  occupancy?: number;
  baseIsland?: string;
  isNpc?: boolean;
  isReady?: boolean;
}

export interface Item {
  id: number;
  name: string;
  effect: string;
  description: string;
  quantity: number;
  image_url?: string;
}

export interface LookupData {
  islands: Map<number, { name: string; id: number }>;
  areas: Map<number, { name: string; id: number; parentIslandId: number }>;
  districts: Map<number, { name: string; id: number; parentAreaId: number }>;
  spots: Map<number, { name: string; id: number; parentDistrictId: number }>;
}

export interface MasterData {
  territories: Territory[];
  gods: GodData[];
  [key: string]: unknown;
}

interface ApiResponse<T = unknown> {
  status: string;
  data: T;
  message?: string;
}

export interface LobbyPlayer {
  playerId: string;
  username?: string;
  playerName?: string;
  godKey?: string;
  godId?: number | null;
  isReady?: boolean;
}

type ViewType = 'login' | 'tutorial' | 'setup' | 'lobby' | 'selection' | 'waiting' | 'game' | 'ranking';

export interface GameState {
  view: ViewType;
  setView: (view: ViewType) => void;
  token: string | null;
  isAuthenticated: boolean;
  hasSeenTutorial: boolean; 
  errorMessage: string | null;
  isServerOnline: boolean; 
  zoomLevel: number; 
  hp: number; maxHp: number;
  ap: number; maxAp: number; 
  blessing: number; atk: number; def: number;
  turn: number; maxTurn: number;
  logs: LogEntry[]; chatLogs: ChatMessage[]; 
  roomId: string;
  players: Player[];
  maxPlayers: number;
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
  isGameStarted: boolean;
  setGameStarted: (started: boolean) => void;
  selectedGodId: number | null;
  godsList: GodData[];
  resultData: null;
  predictionModalOpen: boolean;
  targetDistrictInfo: { id: number; name: string; enemyDef: number; isMyTerritory?: boolean; isNeutral?: boolean } | null;
  activeBuffs: { id: number; name: string; effect: string }[];
  bgmVolume: number; seVolume: number;
  masterVolume: number;
  setMasterVolume: (vol: number) => void;
  graphicsQuality: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  setGraphicsQuality: (quality: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA') => void;
  fpsLimit: number;
  setFpsLimit: (fps: number) => void;
  notifyMatchRequest: boolean;
  setNotifyMatchRequest: (status: boolean) => void;
  notifyEventUpdate: boolean;
  setNotifyEventUpdate: (status: boolean) => void;
  cameraSensitivity: number;
  setCameraSensitivity: (val: number) => void;
  autoBattle: boolean;
  setAutoBattle: (status: boolean) => void;
  language: string;
  setLanguage: (lang: string) => void;
  playerAvatar: string | null;
  setPlayerAvatar: (avatar: string | null) => void;
  isUnderAttack: boolean;
  setUnderAttack: (status: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  lobbyPlayers: LobbyPlayer[];
  setLobbyPlayers: (players: LobbyPlayer[]) => void;
  rankingData: unknown[];
  setRanking: (data: unknown[]) => void;
  inventory: Item[];
  setInventory: (items: Item[]) => void;
  getApiUrl: (endpoint: string) => string;
  masterData: MasterData | null;
  lookupData: LookupData | null;
  setLookupData: (data: MasterData) => void;
  npcs: Record<string, Player>;
  setNpcs: (npcData: Record<string, Player>) => void;
  login: (u: string, p?: string) => Promise<boolean>;
  logout: () => void;
  syncMasterData: () => Promise<void>;
  setErrorMessage: (message: string | null) => void;
  hideError: () => void;
  setZoomLevel: (zoom: number) => void; 
  completeTutorial: () => void; 
  nextTurn: () => void; 
  selectGod: (id: number) => void;
  setPlayerName: (name: string) => void; 
  authenticatedFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<ApiResponse<T>>;
  openPrediction: (id: number, name: string, isMyTerritory?: boolean, isNeutral?: boolean) => void;
  closePrediction: () => void;
  updateBuffs: () => void;
  setStatus: (status: Partial<GameState>) => void;
  syncServerState: (data: Record<string, unknown>, myId: string) => void;
  attack: (targetId: number) => void;
  move: (targetId: number) => void;
  stay: () => void;
  defend: () => void;
  escape: () => void;
  useItem: (itemId: number) => void;
  endTurn: () => void; 
  addLog: (log: string | ChatMessage) => void;
  addChatLog: (msg: ChatMessage) => void; 
  saveResult: () => Promise<void>;
  resetGame: () => void;
  setBgmVolume: (vol: number) => void;
  setSeVolume: (vol: number) => void;
  
  // 🚀 修正ポイント: TypeScriptエラー解消のため null を許容
  updateSelectedDistrict: (data: { 
    districtId: number; 
    districtName: string; 
    isMyTerritory: boolean; 
    isNeutral: boolean;
    spotId?: number; 
  } | null) => void;
  
  updateStatsFromPhaser: (stats: Partial<GameState>) => void;
}

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      view: 'login',
      setView: (view) => set({ view }),
      token: null,
      isAuthenticated: false,
      hasSeenTutorial: false,
      errorMessage: null, isServerOnline: socket.connected, zoomLevel: 1.0, 
      hp: 100, maxHp: 100, ap: 100, maxAp: 100, blessing: 1.0, atk: 50, def: 40,
      turn: 0, maxTurn: 10, logs: [], chatLogs: [], roomId: '', players: [], maxPlayers: 2,
      districts: {}, currentDistrictName: "No Sector Selected", selectedDistrictId: null,
      playerName: "",
      myId: "", myTeam: "Explorer", isMyTurn: true, turnOwner: "YOU",
      isGameOver: false, winnerId: null, isSubmitted: false,
      isGameStarted: false,
      setGameStarted: (started) => set({ isGameStarted: started }),
      selectedGodId: null, godsList: [], resultData: null, predictionModalOpen: false,
      targetDistrictInfo: null, activeBuffs: [], 
      bgmVolume: 0.5, seVolume: 0.5,
      masterVolume: 0.8,
      setMasterVolume: (vol) => set({ masterVolume: vol }),
      graphicsQuality: 'HIGH',
      setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
      fpsLimit: 60,
      setFpsLimit: (fps) => set({ fpsLimit: fps }),
      notifyMatchRequest: true,
      setNotifyMatchRequest: (status) => set({ notifyMatchRequest: status }),
      notifyEventUpdate: true,
      setNotifyEventUpdate: (status) => set({ notifyEventUpdate: status }),
      cameraSensitivity: 75,
      setCameraSensitivity: (val) => set({ cameraSensitivity: val }),
      autoBattle: true,
      setAutoBattle: (status) => set({ autoBattle: status }),
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      playerAvatar: null,
      setPlayerAvatar: (avatar) => set({ playerAvatar: avatar }),
      isUnderAttack: false,
      setUnderAttack: (status) => set({ isUnderAttack: status }),
      sidebarOpen: false, setSidebarOpen: (open) => set({ sidebarOpen: open }),
      lobbyPlayers: [],
      setLobbyPlayers: (players) => set({ lobbyPlayers: players }),
      rankingData: [], setRanking: (data) => set({ rankingData: data }),
      inventory: [], setInventory: (items) => set({ inventory: items }),
      
      getApiUrl: (endpoint) => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://10.29.219.57/Cebu_Conquest/cebu-conquest-batch21-am/public/api';
        return `${baseUrl.replace(/\/$/, '')}/${endpoint}`;
      },

      masterData: null, lookupData: null,
      setLookupData: (data) => {
        if (!data) return;
        const lookup = buildLookup(data) as unknown as LookupData;
        set({ masterData: data, lookupData: lookup });
      },
      npcs: {}, setNpcs: (npcData) => set({ npcs: npcData }),
      login: async (username, password = "password123") => {
        try {
          const url = get().getApiUrl('login.php');
          const res = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const json = await res.json() as ApiResponse<{ token: string; user: Player }>;
          if (json.status === 'success' && json.data) {
            const { token, user } = json.data;
            const name = user.playerName || user.username;
            set({
              token, 
              isAuthenticated: true, 
              playerName: name, 
              myTeam: user.team || "Explorer", 
              hp: user.hp || user.current_hp || 100, maxHp: user.max_hp || 100,
              atk: user.atk || 50, def: user.def || 40,
              ap: user.ap || user.stamina || 100, maxAp: user.max_ap || 100,
            });
            await get().syncMasterData();
            return true;
          }
          return false;
        } catch { return false; }
      },
      syncMasterData: async () => {
        try {
          const json = await get().authenticatedFetch<MasterData>('master-data.php');
          if (json?.status === 'success' && json.data) {
            const districtsMap: Record<string, string> = {};
            json.data.territories.forEach((t) => { 
              districtsMap[String(t.district_id)] = t.owner_id || ''; 
            });
            const lookup = buildLookup(json.data) as unknown as LookupData;
            set({ districts: districtsMap, masterData: json.data, lookupData: lookup });
          }
        } catch (e) { console.error(e); }
      },
      logout: () => { 
        useGameStore.persist.clearStorage();
        window.location.reload(); 
      },
      setErrorMessage: (message) => set({ errorMessage: message }),
      hideError: () => set({ errorMessage: null }),
      setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
      completeTutorial: () => {
        set({ hasSeenTutorial: true, view: 'lobby' });
      },
      nextTurn: () => set({ turn: get().turn + 1 }),
      selectGod: (id: number) => {
        const { roomId, myId, players } = get();
        if (get().selectedGodId !== null) return;
        const updatedPlayers = players.map(p => 
          p.id === myId ? { ...p, selectedGodId: id, godId: id, isReady: false } : p
        );
        set({ 
          selectedGodId: id, 
          players: updatedPlayers,
          view: 'waiting' 
        });
        socket.emit(CLIENT_EVENTS.SELECT_GOD, { roomId, godId: id });
      },
      setPlayerName: (name) => set({ playerName: name }),
      authenticatedFetch: async <T = unknown>(url: string, options: RequestInit = {}) => {
        const { token } = get();
        const headers = { 
          'Content-Type': 'application/json', 
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}), 
          ...(options.headers || {}) 
        };
        const res = await fetch(get().getApiUrl(url), { ...options, headers });
        return await res.json() as ApiResponse<T>;
      },
      openPrediction: (id, name, isMyTerritory = false, isNeutral = false) => {
        set({ 
          predictionModalOpen: true, 
          selectedDistrictId: Number(id), 
          targetDistrictInfo: { id: Number(id), name, enemyDef: 40, isMyTerritory, isNeutral } 
        });
      },
      closePrediction: () => set({ predictionModalOpen: false, targetDistrictInfo: null }),
      updateBuffs: () => { /* Implement if needed */ },

      syncServerState: (data, myId) => {
        if (!data) return;
        const rawPlayers = (data.players as Record<string, Player>) ?? {};
        let playersArray = (Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers)) as Player[];
        playersArray = playersArray.map(p => ({
          ...p,
          playerName: p.playerName || p.username,
          name: p.name || p.username,
          godId: p.godId || p.selectedGodId, 
          selectedGodId: p.selectedGodId || p.godId,
          location: p.location || p.districtId,
          current_hp: p.current_hp || p.hp,
          isReady: !!p.isReady
        }));
        const myPlayerData = playersArray.find((p) => p.id === myId);
        
        set((state) => {
          let nextView = state.view;
          const isActuallyStarted = !!data.gameStarted;
          const hasInitialPosition = !!(myPlayerData?.districtId || myPlayerData?.location);
          if (data.isGameOver) {
            nextView = 'ranking';
            if (!state.isGameOver) get().saveResult();
          } else if (isActuallyStarted) {
            if (hasInitialPosition) {
              nextView = 'game';
            } else {
              nextView = 'waiting';
            }
          } else if (data.phase === 'selection' && nextView === 'lobby') {
            nextView = 'selection';
          }
          
          const safeRoomId = (data.roomId && data.roomId !== "") 
                             ? (data.roomId as string) 
                             : state.roomId;

          return {
            ...state,
            myId,
            roomId: safeRoomId,
            hp: myPlayerData?.hp ?? state.hp,
            maxHp: myPlayerData?.maxHp ?? state.maxHp,
            ap: myPlayerData?.ap ?? myPlayerData?.stamina ?? state.ap,
            selectedDistrictId: myPlayerData?.districtId ?? myPlayerData?.location ?? state.selectedDistrictId, 
            selectedGodId: myPlayerData?.selectedGodId ?? myPlayerData?.godId ?? state.selectedGodId,
            districts: (data.districts as Record<string, string>) ?? state.districts,
            players: playersArray,
            lobbyPlayers: (['lobby', 'selection', 'waiting'].includes(nextView))
              ? playersArray.map(p => ({
                  playerId: p.id,
                  username: p.username,
                  playerName: p.playerName || p.username,
                  godKey: undefined,
                  godId: p.selectedGodId || p.godId || null,
                  isReady: !!p.isReady,
                }))
              : state.lobbyPlayers,
            turn: (data.turn as number) ?? state.turn,
            isMyTurn: (data.turnOwnerId as string) === myId,
            turnOwner: (data.turnOwnerId as string) === myId ? "YOU" : ((data.turnOwnerName as string) || "ENEMY"),
            isGameOver: typeof data.isGameOver === 'boolean' ? data.isGameOver : state.isGameOver,
            winnerId: (data.winnerId as string) ?? state.winnerId,
            view: nextView,
          };
        });
        
        const playersAsObject = playersArray.reduce((acc: Record<string, Player>, p: Player) => { 
          acc[p.id] = p; return acc; 
        }, {});
        if (get().view === 'game') {
          window.dispatchEvent(new CustomEvent(MAP_REPAINT_EVENT, { detail: { districts: data.districts, players: playersAsObject } }));
        }
      },
      
      // 🚀 修正ポイント: null を受け取った際はターゲット情報を確実にクリアする
      updateSelectedDistrict: (data) => {
        if (!data) {
          set({
            predictionModalOpen: false,
            targetDistrictInfo: null,
            selectedDistrictId: null,
            currentDistrictName: "No Sector Selected"
          });
          return;
        }

        set({
          selectedDistrictId: data.spotId ?? data.districtId, 
          currentDistrictName: data.districtName,
          targetDistrictInfo: {
            id: data.spotId ?? data.districtId,
            name: data.districtName,
            enemyDef: 40,
            isMyTerritory: data.isMyTerritory,
            isNeutral: data.isNeutral
          },
          predictionModalOpen: true
        });
      },
      
      updateStatsFromPhaser: (stats) => {
        if (get().isGameOver) return;
        set((state) => ({ ...state, ...stats }));
      },
      saveResult: async () => {
        try {
          const { players, myId } = get();
          const myResult = players.find(p => p.id === myId);
          await get().authenticatedFetch('result.php', {
            method: 'POST',
            body: JSON.stringify({ 
              score: myResult?.occupancy || 0, 
              team: myResult?.team 
            })
          });
        } catch (e) { console.error(e); }
      },

      attack: (id) => {
        if (get().ap <= 0) {
          get().addLog("⚠️ Insufficient energy! Attack maneuver locked.");
          return;
        }
        socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'attack', targetId: id });
      },
      move: (id) => {
        if (get().ap <= 0) {
          get().addLog("⚠️ Critical energy depletion! Movement impossible.");
          return;
        }
        socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'move', targetId: id });
      },

      stay: () => {
        socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'stay' });
        window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_STAY));
      },

      defend: () => {
        socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'defend' });
      },

      escape: () => {
        socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: 'escape' });
      },

      useItem: (id) => socket.emit(CLIENT_EVENTS.ACTION_USE_ITEM, { itemId: id }),

      endTurn: () => {
        // 🚀 I-1 修正完了箇所: TURN_END_SUBMITを使用。isMyTurnはサーバー同期まで触らない。
        socket.emit(CLIENT_EVENTS.TURN_END_SUBMIT); 
        set({ isSubmitted: true }); 
      },

      setStatus: (status) => set((state) => ({ ...state, ...status })),
      addLog: (log) => set((state) => {
        if (typeof log === 'string') {
          return { logs: [{ text: log, time: nowTime() }, ...state.logs].slice(0, 10) };
        } else {
          const chatMsg = { ...log, timestamp: log.timestamp || nowTime() };
          return { 
            chatLogs: [...state.chatLogs, chatMsg].slice(-50),
            logs: [{ text: `${log.sender}: ${log.message}`, time: nowTime() }, ...state.logs].slice(0, 10)
          };
        }
      }),
      addChatLog: (msg) => {
        set((state) => ({ chatLogs: [...state.chatLogs, msg].slice(-50) }));
      },
      resetGame: () => window.location.reload(),
      setBgmVolume: (vol) => {
        set({ bgmVolume: vol });
        SoundManager.setBgmVolume(vol);
      },
      setSeVolume: (vol) => set({ seVolume: vol }),
    }),
    {
      name: 'cebu-conquest-storage',
      partialize: (state) => ({
        hasSeenTutorial: state.hasSeenTutorial,
        masterVolume: state.masterVolume,
        bgmVolume: state.bgmVolume,
        seVolume: state.seVolume,
        graphicsQuality: state.graphicsQuality,
        fpsLimit: state.fpsLimit,
        notifyMatchRequest: state.notifyMatchRequest,
        notifyEventUpdate: state.notifyEventUpdate,
        cameraSensitivity: state.cameraSensitivity,
        autoBattle: state.autoBattle,
        language: state.language,
        playerAvatar: state.playerAvatar,
      }),
    }
  )
);

declare global {
  interface Window {
    useGameStore: typeof useGameStore;
  }
}

if (typeof window !== 'undefined') {
  window.useGameStore = useGameStore;
}