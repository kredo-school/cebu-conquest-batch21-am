// src/constants/godData.ts

export interface God {
  id: number;
  name: string;
  bonus: string;
  description: string;
  image: string; // public/assets/images/gods/ 配下のパスを想定
}

export const GODS_DATA: God[] = [
  {
    id: 1,
    name: "Neil",
    bonus: "ATK +20",
    description: "近接攻撃ダメージ+25%、物理防御力強化",
    image: "/assets/images/gods/neil.webp"
  },
  {
    id: 2,
    name: "Garry",
    bonus: "MAX AP +30",
    description: "タクティカルアビリティのクールダウン-15%",
    image: "/assets/images/gods/garry.webp"
  },
  {
    id: 3,
    name: "Shem",
    bonus: "SOLAR",
    description: "昼間戦闘フェーズ中、全弾薬にソーラーバーン効果付与",
    image: "/assets/images/gods/shem.webp"
  },
  {
    id: 4,
    name: "Quisie",
    bonus: "SILENT",
    description: "隠密探知範囲を拡大、足音の静音性+40%",
    image: "/assets/images/gods/quisie.webp"
  },
  {
    id: 5,
    name: "Eduardo",
    bonus: "ARMOR +40",
    description: "アーマー耐久値増加、燃焼ステータス無効化",
    image: "/assets/images/gods/eduardo.webp"
  },
  {
    id: 6,
    name: "Kurt",
    bonus: "SPEED +15",
    description: "山岳地帯ダッシュ速度・ジャンプ高度+20%",
    image: "/assets/images/gods/kurt.webp"
  },
  {
    id: 7,
    name: "Stephen",
    bonus: "INVIS",
    description: "夜間サイクル中の一時的な不可視化",
    image: "/assets/images/gods/stephen.webp"
  },
  {
    id: 8,
    name: "Bernardine",
    bonus: "SCAN",
    description: "障害物越しのリソース・敵足跡をハイライト",
    image: "/assets/images/gods/bernardine.webp"
  }
];