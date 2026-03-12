import { create } from 'zustand';

interface GameState {
  hp: number;
  stamina: number;
  blessing: number;
  day: number;
  logs: string[];
  damage: (amount: number) => void;
  nextDay: () => void;
  addLog: (text: string) => void;
  saveGame: () => void;
  loadGame: () => void;
  addStamina: (amount: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  hp: 100,
  stamina: 100,
  blessing: 0,
  day: 1,
  logs: ["Cebu conquest start"],
  
  damage: (amount) => set((state) => ({ hp: state.hp - amount })),
  
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
    alert("Save your data");
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
      alert("Loading your data");
    } else {
      alert("No found your save data");
    }
  },

  addStamina: (amount) => set((state) => ({ 
    stamina: state.stamina + amount 
  })),
}));