// shared/godSacredLands.js

/**
 * Cebu Conquest - 神聖地マスタ（GDD v3.1 §3-1 準拠）
 *
 * 各神に対応する聖地（district）と初期スポーン地点（spot）を一元管理する。
 * Phaser / React / Node.js（Socket.IO）すべてが本ファイルを唯一の正として参照すること。
 *
 * district_id は 3桁、spot_id は 5桁（ID管理シート準拠）
 */
// ★ color: Phaser用 0x形式, colorHex: CSS/React用 # 形式
export const GOD_SACRED_LANDS = {
  1: { name: 'Neil',       sacredDistrictId: 141, spawnSpotId: 14101, color: 0x00bfff, colorHex: '#00bfff' },
  2: { name: 'Garry',      sacredDistrictId: 241, spawnSpotId: 24104, color: 0xff6600, colorHex: '#ff6600' }, // GDD v4.0 §3-1 準拠
  3: { name: 'Shem',       sacredDistrictId: 123, spawnSpotId: 12301, color: 0xff69b4, colorHex: '#ff69b4' },
  4: { name: 'Quisie',     sacredDistrictId: 161, spawnSpotId: 16101, color: 0x9b59b6, colorHex: '#9b59b6' },
  5: { name: 'Eduardo',    sacredDistrictId: 131, spawnSpotId: 13101, color: 0x2ecc71, colorHex: '#2ecc71' },
  6: { name: 'Kurt',       sacredDistrictId: 132, spawnSpotId: 13202, color: 0x2c2c2c, colorHex: '#2c2c2c' },
  7: { name: 'Stephen',    sacredDistrictId: 332, spawnSpotId: 33201, color: 0xf1c40f, colorHex: '#f1c40f' },
  8: { name: 'Bernardine', sacredDistrictId: 151, spawnSpotId: 15101, color: 0xe74c3c, colorHex: '#e74c3c' },
};

// spawnSpotId → godId の逆引き
export const SPAWN_TO_GOD = Object.entries(GOD_SACRED_LANDS).reduce((acc, [godId, v]) => {
  acc[v.spawnSpotId] = Number(godId);
  return acc;
}, {});

// sacredDistrictId → godId の逆引き
export const DISTRICT_TO_GOD = Object.entries(GOD_SACRED_LANDS).reduce((acc, [godId, v]) => {
  acc[v.sacredDistrictId] = Number(godId);
  return acc;
}, {});

// ユーティリティ関数
export const getSacredDistrict = (godId) => GOD_SACRED_LANDS[godId]?.sacredDistrictId ?? null;
export const getSpawnSpot      = (godId) => GOD_SACRED_LANDS[godId]?.spawnSpotId ?? null;
export const getGodName        = (godId) => GOD_SACRED_LANDS[godId]?.name ?? 'Unknown';
// ★ 追加: Phaser用カラー取得（0x形式）
export const getGodColor    = (godId) => GOD_SACRED_LANDS[godId]?.color    ?? 0x95a5a6;
// ★ 追加: CSS用カラー取得（#形式）
export const getGodColorHex = (godId) => GOD_SACRED_LANDS[godId]?.colorHex ?? '#95a5a6';
