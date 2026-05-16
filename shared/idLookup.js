/**
 * GDD v3.1 §6-3 準拠
 * GET /api/master-data のレスポンスを受け取って
 * O(1) 逆引き辞書（Map）を構築する
 *
 * @param {Object} masterData - api/master-data.php のレスポンス data フィールド
 * @returns {{ islands: Map, areas: Map, districts: Map, spots: Map }}
 *
 * FIX (2026-05-15):
 *   - DBカラム名 (id/name) と旧期待値 (island_id/island_name 等) の両方に対応
 *   - districts テーブル非存在時は spots から district_id → area_id を数学的に導出
 *   - DB未登録の island/area (Negros 2xxx, Bohol 3xxx) を ID先頭桁から自動補完
 */

// island先頭桁 → { id, name } の静的補完テーブル
// DB に island_id=1000 が存在する場合はそちらが優先される
const ISLAND_FALLBACK = {
  1: { id: 1000, name: 'Cebu・Mactan' },
  2: { id: 2000, name: 'Negros' },
  3: { id: 3000, name: 'Bohol' },
};

export function buildLookup(masterData) {
  const islands   = new Map(); // island_id(4桁) → { id, name }
  const areas     = new Map(); // area_id(2桁)   → { id, name, parentIslandId }
  const districts = new Map(); // district_id(3桁) → { id, name, parentAreaId }
  const spots     = new Map(); // spot_id(5桁)    → { id, name, parentDistrictId, captureCost, dropItemId }

  if (!masterData) return { islands, areas, districts, spots };

  // ---- 島 ----
  // DB: { id, name } / 旧: { island_id, island_name }
  (masterData.islands || []).forEach(island => {
    const id   = island.island_id ?? island.id;
    const name = island.island_name ?? island.name;
    if (id == null) return;
    islands.set(id, { id, name });
  });

  // ---- エリア ----
  // DB: { id, island_id, name } / 旧: { area_id, island_id, area_name }
  (masterData.areas || []).forEach(area => {
    const id            = area.area_id ?? area.id;
    const name          = area.area_name ?? area.name;
    const parentIslandId = area.island_id;
    if (id == null) return;
    areas.set(id, { id, name, parentIslandId });
  });

  // ---- 地区（districtName レイヤーと 1:1 対応） ----
  // DB: テーブル非存在のため masterData.districts は常に []
  // 旧: { district_id, district_name, area_id }
  (masterData.districts || []).forEach(district => {
    const id         = district.district_id ?? district.id;
    const name       = district.district_name ?? district.name;
    const parentAreaId = district.area_id ?? district.parent_area_id;
    if (id == null) return;
    districts.set(id, { id, name, parentAreaId });
  });

  // ---- Spot ----
  // DB: { id, name, district_id, ... } / 旧: { spot_id, spot_name, district_id }
  (masterData.spots || []).forEach(spot => {
    const id               = spot.spot_id ?? spot.id;
    const name             = spot.spot_name ?? spot.name;
    const parentDistrictId = spot.district_id;
    if (id == null) return;
    spots.set(id, {
      id,
      name,
      parentDistrictId,
      captureCost: spot.capture_cost ?? 5,
      dropItemId:  spot.drop_item_id ?? null,
    });
  });

  // ---- districts が空なら spots から導出 ----
  // district_id = Math.floor(spot_id / 100)
  // area_id     = Math.floor(district_id / 10)
  if (districts.size === 0 && spots.size > 0) {
    spots.forEach((spot) => {
      const distId = spot.parentDistrictId;
      if (distId == null || districts.has(distId)) return;
      const areaId = Math.floor(distId / 10);
      districts.set(distId, {
        id:          distId,
        name:        `District ${distId}`,
        parentAreaId: areaId,
      });
    });
  }

  // ---- DB未登録エリア・島を ID先頭桁から自動補完 ----
  // 例: area 24 (Negros) は DB に存在しないが spot 241xx から導出できる
  districts.forEach((district) => {
    const areaId = district.parentAreaId;
    if (areaId == null || areas.has(areaId)) return;

    // island先頭桁: area 24 → Math.floor(24/10) = 2 → ISLAND_FALLBACK[2]
    const islandPrefix  = Math.floor(areaId / 10);
    const fallbackIsland = ISLAND_FALLBACK[islandPrefix];
    const parentIslandId = fallbackIsland?.id ?? islandPrefix * 1000;

    areas.set(areaId, {
      id:            areaId,
      name:          `Area ${areaId}`,
      parentIslandId,
    });

    // その島も islands に追加されていなければ追加
    if (fallbackIsland && !islands.has(fallbackIsland.id)) {
      islands.set(fallbackIsland.id, fallbackIsland);
    }
  });

  return { islands, areas, districts, spots };
}
