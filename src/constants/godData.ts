// src/constants/godData.ts

export interface God {
  id: number;
  name: string;
  bonus: string;
  description: string;
  image: string; // public/assets/images/gods/ 配下のパス
}

// 🚀 修正ポイント: GDD v4.1に準拠したステータス・効果テキスト（英語）に完全同期
export const GODS_DATA: God[] = [
  {
    id: 1,
    name: "Neil",
    bonus: "MAX_HP +30, STAMINA -25, HP +10",
    description: "High durability status configuration tailored for frontline operators.",
    image: "/assets/images/gods/Neil.png"
  },
  {
    id: 2,
    name: "Garry",
    bonus: "ATK +20",
    description: "Pure offensive augmentation designed for high-caliber strikers.",
    image: "/assets/images/gods/Garry.png"
  },
  {
    id: 3,
    name: "Shem",
    bonus: "MAX_AP +15, HP +10, AP +10",
    description: "Optimized balance prioritizing action frequency and sustained engagement durability.",
    image: "/assets/images/gods/Shem.png"
  },
  {
    id: 4,
    name: "Quisie",
    bonus: "HP -20, FAITH 100",
    description: "Special auxiliary configuration initiating deployment with maximum FAITH matrix values.",
    image: "/assets/images/gods/Quisie.png"
  },
  {
    id: 5,
    name: "Eduardo",
    bonus: "DEF +15",
    description: "Reinforced defense parameters to effectively mitigate counter-offensive damage.",
    image: "/assets/images/gods/Eduardo.png"
  },
  {
    id: 6,
    name: "Kurt",
    bonus: "STAMINA +30, HP -10",
    description: "Extends maximum stamina capacity to ensure optimal maneuvering and mobility.",
    image: "/assets/images/gods/Kurt.png"
  },
  {
    id: 7,
    name: "Stephen",
    bonus: "FAITH_REGEN (5)",
    description: "Specialized endurance model engineered for prolonged attrition warfare, recovering 5 FAITH per phase.",
    image: "/assets/images/gods/Stephen.png"
  },
  {
    id: 8,
    name: "Bernardine",
    bonus: "MAX_AP +30, AP +30",
    description: "Enables dominant grid positioning utilizing an overwhelming baseline resource pool.",
    image: "/assets/images/gods/Bernardine.png"
  }
];