// shared/adjacency.js
/**
 * 地区隣接グラフ（GDD v3.1 §7-6 準拠 / クライアント・サーバー共有）
 *
 * このファイルが「地区間の移動可能関係」の唯一の正です。
 * MainScene.js / socket-server/server.js の両方からこのファイルを import すること。
 * キーは Number で統一。server.js 側は getNeighbors() を使うこと。
 */
export const ADJACENCY = {
  // ── セブ市街地エリア（エリアID: 11）──
  11101: [11102, 11104, 11105, 11120],
  11102: [11101, 11104, 11106, 11108],
  11103: [11101, 11105, 11201, 11301],
  11104: [11101, 11102, 11105, 11401],
  11105: [11101, 11103, 11104, 11301],
  11106: [11102, 11108],
  11108: [11102, 11106, 11109, 11112],
  11109: [11108, 11112, 11113],
  11112: [11108, 11109, 11113, 11116, 11119],
  11113: [11109, 11112, 11117, 11118, 11119],
  11115: [11118, 11119],
  11116: [11112, 11119, 11120],
  11117: [11113, 11118],
  11118: [11113, 11115, 11117, 11119],
  11119: [11112, 11113, 11115, 11118, 11120, 11121],
  11120: [11101, 11116, 11119, 11121],
  11121: [11119, 11120],
  // ── 北部エリア（エリアID: 13）──
  13101: [13102, 13103, 13401],
  13102: [13101, 13103, 13201],
  13103: [13101, 13102, 13201, 13204],
  13201: [13102, 13103, 13204],
  13204: [13103, 13201],
  // ── 134エリア ──
  13401: [13101],
  // TODO: 13402 の隣接はID管理シート確認後に追記
};

/**
 * 文字列・数値どちらのIDでも引けるユーティリティ
 * server.js (文字列ID) と MainScene.js (数値ID) の両方に対応
 * @param {string|number} districtId
 * @returns {number[]}
 */
export function getNeighbors(districtId) {
  return ADJACENCY[Number(districtId)] || [];
}

// ════════════════════════════════════════════════════════════════════════
// SPOT_ADJACENCY — spot単位の隣接グラフ（5桁ID）
// ════════════════════════════════════════════════════════════════════════
/**
 * spot単位の移動可能グラフ（5桁spot_id → 隣接spot_idの配列）
 *
 * ⚠️ 現在の値はTMJ未確認の推定値（仮）です。
 *    必ずTiledで cebu_map_本番用.tmj の spotName レイヤーを確認し、
 *    実際のspot_idと一致させてください。
 *
 * 編集ガイド:
 *   - キー = 移動元spot_id（Number）
 *   - 値   = 移動できるspot_idの配列（Number[]）
 *   - 必ず双方向で定義すること（A→B なら B→A も必要）
 *   - 同一地区内のspot同士、地理的に隣接するspot間を繋ぐ
 *   - 島をまたぐ移動はWARP/SAILバフで別途処理するため、ここには含めない
 *
 * ID命名規則:
 *   11101 = 島(1) + エリア(11) + 地区連番(1) + spot連番(01)
 *   同地区内: 1110X / 隣地区へ: 次の地区の代表spot
 */
export const SPOT_ADJACENCY = {

  // ══════════════════════════════════
  // エリア11: North Azure Coast
  // ══════════════════════════════════
  // ── 地区111: Northern Reach The Apex (Daanbantayan) ──
  11101: [11102, 11201],          // Apex North → Apex South, Cane Fields入口
  11102: [11101, 11103, 11201],   // Apex South → Apex North, Apex East, 隣地区
  11103: [11102, 11201],          // Apex East  → Apex South, Cane Fields

  // ── 地区112: Cane Fields Lagoon (Medellin) ──
  11201: [11101, 11202, 11301],   // Cane入口   → Apex, Cane中央, Transit
  11202: [11201, 11203],          // Cane中央   → Cane入口, Cane港
  11203: [11202, 11301],          // Cane港     → Cane中央, Transit入口

  // ── 地区113: The Transit Crossroad (Bogo City) ──
  11301: [11201, 11203, 11302],   // Transit入口 → Cane Fields, Transit中心
  11302: [11301, 11303, 12101],   // Transit中心 → Transit入口, Transit南, Industrial
  11303: [11302, 12101],          // Transit南   → Transit中心, Industrial Ridge

  // ══════════════════════════════════
  // エリア12: Central-North Industrial Ridge
  // ══════════════════════════════════
  // ── 地区121: The Verdant Escarpment (Carmen/Catmon) ──
  12101: [11302, 12102, 12201],   // Escarpment北 → Transit, Escarpment南, Ironforge
  12102: [12101, 12103],          // Escarpment中
  12103: [12102, 12201, 12301],   // Escarpment南 → Ironforge, Sentinel

  // ── 地区122: Ironforge Bay (Danao City) ──
  12201: [12101, 12202, 12301],   // Ironforge北  → Escarpment, Ironforge港, Sentinel
  12202: [12201, 12203],          // Ironforge港
  12203: [12202, 12301, 13101],   // Ironforge南  → Sentinel, Neon Citadel

  // ── 地区123: Sentinel's Gate (Compostela) ──
  12301: [12103, 12201, 12302, 13101], // Sentinel門 → Escarpment, Ironforge, Sentinel中, Neon
  12302: [12301, 12303],               // Sentinel中
  12303: [12302, 13101],               // Sentinel南 → Neon Citadel

  // ══════════════════════════════════
  // エリア13: Core Metro Cebu Dominance
  // ══════════════════════════════════
  // ── 地区131: Neon Citadel (Cebu City North) ──
  13101: [12203, 12303, 13102, 13201], // Neon北 → Sentinel, Neon中, Heritage
  13102: [13101, 13103, 13301],        // Neon中 → Neon北, Neon南, Cargo
  13103: [13102, 13301, 13401],        // Neon南 → Neon中, Cargo, Lechon

  // ── 地区132: Grand Heritage Ruins (Cebu City South) ──
  13201: [13101, 13202, 13301],        // Heritage北 → Neon, Heritage中, Cargo
  13202: [13201, 13203],               // Heritage中
  13203: [13202, 13301, 14101],        // Heritage南 → Cargo, Luminous Spire

  // ── 地区133: The Cargo Canal (Mandaue City) ──
  13301: [13102, 13201, 13302, 16101], // Cargo北 → Neon, Heritage, Cargo南, Mactan
  13302: [13301, 13303],               // Cargo中
  13303: [13302, 13401, 14101],        // Cargo南 → Lechon, Luminous Spire

  // ── 地区134: Lechon Bastion (Talisay City) ──
  13401: [13103, 13303, 13402, 14101], // Lechon北 → Neon南, Cargo南, Lechon中, Luminous
  13402: [13401, 14101],               // Lechon南 → Luminous Spire

  // ══════════════════════════════════
  // エリア14: Central-South Heritage Corridor
  // ══════════════════════════════════
  // ── 地区141: Luminous Power Spire (Naga/San Fernando) ──
  14101: [13203, 13303, 13401, 13402, 14102, 14201], // Spire北 → Heritage, Cargo, Lechon, Ancient Fortress
  14102: [14101, 14103],                              // Spire中
  14103: [14102, 14201, 15101],                       // Spire南 → Ancient, Sardine Storm

  // ── 地区142: Ancient Meat Fortress (Carcar City) ──
  14201: [14101, 14202, 14301],        // Fortress北 → Spire, Fortress中, Torta
  14202: [14201, 14203],               // Fortress中
  14203: [14202, 14301, 15101],        // Fortress南 → Torta, Sardine Storm

  // ── 地区143: The Torta Sanctuary (Argao) ──
  14301: [14201, 14302, 15101],        // Torta北 → Fortress, Torta中, Sardine
  14302: [14301, 14303],               // Torta中
  14303: [14302, 15101],               // Torta南 → Sardine Storm

  // ══════════════════════════════════
  // エリア15: South Adventure Peak
  // ══════════════════════════════════
  // ── 地区151: Sardine Storm Reefs (Moalboal/Badian) ──
  15101: [14103, 14203, 14301, 14303, 15102, 15201], // Reefs北 → Heritage, Torta, Peak
  15102: [15101, 15103],               // Reefs中
  15103: [15102, 15201],               // Reefs南 → Peak of Ancients

  // ── 地区152: Peak of the Ancients (Dalaguete) ──
  15201: [15101, 15202, 15301],        // Peak北 → Sardine, Peak中, Whale Shark
  15202: [15201, 15203],               // Peak中
  15203: [15202, 15301],               // Peak南 → Whale Shark Abyss

  // ── 地区153: Whale Shark Abyss (Oslob) ──
  15301: [15201, 15302],               // Abyss北 → Peak
  15302: [15301, 15303],               // Abyss中
  15303: [15302],                      // Abyss最南端

  // ══════════════════════════════════
  // エリア16: Mactan Gateway & Resort
  // ══════════════════════════════════
  // ── 地区161: The Chief's Victory Landing (Lapu-Lapu) ──
  16101: [13301, 16102, 16201],        // Landing → Cargo Canal(橋), Landing中, Mangrove
  16102: [16101, 16103],               // Landing中
  16103: [16102, 16201],               // Landing南 → Mangrove

  // ── 地区162: Roseate Mangrove Gardens (Cordova) ──
  16201: [16101, 16202],               // Mangrove北 → Landing
  16202: [16201, 16203],               // Mangrove中
  16203: [16202],                      // Mangrove南端

  // ══════════════════════════════════
  // エリア21: Negros North Sugar Coast
  // ══════════════════════════════════
  // ── 地区211: Sweetleaf Plains (Victorias/Sagay) ──
  21101: [21102, 21201],               // Plains北 → Plains南, Cadiz
  21102: [21101, 21103, 21201],        // Plains中
  21103: [21102, 22101],               // Plains南 → Heritage Manor

  // ── 地区212: Cadiz Copper Port (Cadiz) ──
  21201: [21101, 21202, 22101],        // Port北 → Plains, Port南, Heritage
  21202: [21201, 21203],               // Port中
  21203: [21202, 22101],               // Port南 → Heritage Manor

  // ══════════════════════════════════
  // エリア22: Metro Bacolod Hub
  // ══════════════════════════════════
  // ── 地区221: Heritage Manor (Silay) ──
  22101: [21103, 21203, 22102, 22201], // Manor北 → Sugar Coast, Masked Citadel
  22102: [22101, 22103],               // Manor中
  22103: [22102, 22201],               // Manor南 → Masked Citadel

  // ── 地区222: Masked Citadel (Bacolod City) ──
  22201: [22101, 22202, 23101, 24101], // Citadel北 → Manor, Citadel中, Canlaon, Dumaguete
  22202: [22201, 22203],               // Citadel中
  22203: [22202, 23101],               // Citadel南 → Titan's Rest

  // ══════════════════════════════════
  // エリア23: Canlaon Frontier
  // ══════════════════════════════════
  // ── 地区231: Titan's Rest (Canlaon City) ──
  23101: [22201, 22203, 23102, 23201], // Titan北 → Bacolod, Titan中, Mist-Walker
  23102: [23101, 23103],               // Titan中
  23103: [23102, 23201],               // Titan南 → Mist-Walker Cliffs

  // ── 地区232: Mist-Walker Cliffs (San Carlos) ──
  23201: [23101, 23202, 24101],        // Cliffs北 → Titan, Cliffs中, Silliman
  23202: [23201, 23203],               // Cliffs中
  23203: [23202, 24101],               // Cliffs南 → Silliman

  // ══════════════════════════════════
  // エリア24: Mystic Dumaguete
  // ══════════════════════════════════
  // ── 地区241: Silliman University (Silliman) ──
  24101: [22201, 23201, 23203, 24102, 24201], // Silliman → Bacolod, Cliffs, Dumaguete
  24102: [24101, 24103],               // Silliman中
  24103: [24102, 24201],               // Silliman南 → Dumaguete
  24104: [24101, 24201],               // Silliman東（Garryの初期spot）

  // ── 地区242: The Gentle Core (Dumaguete) ──
  24201: [24101, 24103, 24104, 24202, 24301], // Core北 → Silliman, Witch's Isle
  24202: [24201, 24203],               // Core中
  24203: [24202, 24301],               // Core南 → Witch's Isle

  // ── 地区243: Witch's Shadow Isle (Siquijor) ──
  24301: [24201, 24302],               // Isle北 → Dumaguete（海峡渡り）
  24302: [24301, 24303],               // Isle中
  24303: [24302],                      // Isle最南端

  // ══════════════════════════════════
  // エリア31: Bohol North Marine Frontier
  // ══════════════════════════════════
  // ── 地区311: The Coral Guard (Talibon) ──
  31101: [31102, 31201],               // Coral北 → Coral中, Gale Winds
  31102: [31101, 31103],               // Coral中
  31103: [31102, 31201, 32101],        // Coral南 → Gale, Cone Hill

  // ── 地区312: Gale Winds Pier (Tubigon) ──
  31201: [31101, 31202, 32101],        // Pier北 → Coral, Pier中, Cone Hill
  31202: [31201, 31203],               // Pier中
  31203: [31202, 32101],               // Pier南 → Cone Hill

  // ══════════════════════════════════
  // エリア32: Chocolate Hills Sanctuary
  // ══════════════════════════════════
  // ── 地区321: Cone Hill Monoliths (Carmen) ──
  32101: [31103, 31203, 32102, 32201], // Cone北 → Marine, Cone中, Tarsier
  32102: [32101, 32103],               // Cone中
  32103: [32102, 32201, 33101],        // Cone南 → Tarsier, Ivory Sands

  // ── 地区322: Tarsier Forest (Corella) ──
  32201: [32101, 32202, 33101],        // Forest北 → Cone, Forest中, Ivory Sands
  32202: [32201, 32203],               // Forest中
  32203: [32202, 33101],               // Forest南 → Ivory Sands

  // ══════════════════════════════════
  // エリア33: South Panglao Gateway
  // ══════════════════════════════════
  // ── 地区331: Ivory Sands Resort (Panglao) ──
  33101: [32103, 32201, 32203, 33102, 33201], // Sands北 → Hills, Sands中, Merchant
  33102: [33101, 33103],               // Sands中
  33103: [33102, 33201],               // Sands南 → Merchant's Hub

  // ── 地区332: Merchant's Hub (Tagbilaran) ──
  33201: [33101, 33102, 33103, 33202], // Hub北 → Ivory Sands（Stephenの初期spot）
  33202: [33201, 33203],               // Hub中
  33203: [33202],                      // Hub最南端
};

/**
 * spot単位の隣接spotを返すユーティリティ
 * @param {string|number} spotId
 * @returns {number[]}
 */
export function getSpotNeighbors(spotId) {
  return SPOT_ADJACENCY[Number(spotId)] || [];
}
