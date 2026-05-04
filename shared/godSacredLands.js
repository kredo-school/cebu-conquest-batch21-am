// shared/godSacredLands.js

/**
 * Cebu Conquest - 神聖地マスタ（GDD v3.1 §3-1 準拠）
 *
 * 各神に対応する聖地（district）と初期スポーン地点（spot）を一元管理する。
 * Phaser / React / Node.js（Socket.IO）すべてが本ファイルを唯一の正として参照すること。
 *
 * district_id は 3桁、spot_id は 5桁（ID管理シート準拠）
 */
export const GOD_SACRED_LANDS = {
  1: { name: 'Neil',       sacredDistrictId: 141, spawnSpotId: 14101 },
  2: { name: 'Garry',      sacredDistrictId: 241, spawnSpotId: 24101 },
  3: { name: 'Shem',       sacredDistrictId: 123, spawnSpotId: 12301 },
  4: { name: 'Quisie',     sacredDistrictId: 161, spawnSpotId: 16101 },
  5: { name: 'Eduardo',    sacredDistrictId: 131, spawnSpotId: 13101 },
  6: { name: 'Kurt',       sacredDistrictId: 132, spawnSpotId: 13202 },
  7: { name: 'Stephen',    sacredDistrictId: 332, spawnSpotId: 33201 },
  8: { name: 'Bernardine', sacredDistrictId: 151, spawnSpotId: 15101 },
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
