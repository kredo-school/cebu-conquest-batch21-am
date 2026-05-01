/**
 * GDD v3.1 §6-3 準拠
 * GET /api/master-data のレスポンスを受け取って
 * O(1) 逆引き辞書（Map）を構築する
 *
 * @param {Object} masterData - api/master-data.php のレスポンス data フィールド
 * @returns {{ islands: Map, areas: Map, districts: Map, spots: Map }}
 */
export function buildLookup(masterData) {
  const islands   = new Map(); // island_id(4桁) → { id, name, parentId: null }
  const areas     = new Map(); // area_id(2桁)   → { id, name, parentIslandId }
  const districts = new Map(); // district_id(3桁) → { id, name, parentAreaId }
  const spots     = new Map(); // spot_id(5桁)    → { id, name, parentDistrictId, captureCost, dropItemId }

  if (!masterData) return { islands, areas, districts, spots };

  // ---- 島 ----
  (masterData.islands || []).forEach(island => {
    islands.set(island.island_id, {
      id:   island.island_id,
      name: island.island_name,
    });
  });

  // ---- エリア ----
  (masterData.areas || []).forEach(area => {
    areas.set(area.area_id, {
      id:            area.area_id,
      name:          area.area_name,
      parentIslandId: area.island_id,
    });
  });

  // ---- 地区（districtName レイヤーと 1:1 対応） ----
  (masterData.districts || []).forEach(district => {
    districts.set(district.district_id, {
      id:          district.district_id,
      name:        district.district_name,
      parentAreaId: district.area_id,
    });
  });

  // ---- Spot ----
  (masterData.spots || []).forEach(spot => {
    spots.set(spot.spot_id, {
      id:               spot.spot_id,
      name:             spot.spot_name,
      parentDistrictId: spot.district_id,
      captureCost:      spot.capture_cost ?? 5,
      dropItemId:       spot.drop_item_id ?? null,
    });
  });

  return { islands, areas, districts, spots };
}