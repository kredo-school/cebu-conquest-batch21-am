// 該当ファイルの適切なパス（例: src/shared/utils.ts 等）
import { useGameStore } from '../store'; // 🚀 store のパスに合わせて適宜変更してください

export const parseDistrictId = (id: number) => {
  // ✅ GDD v3.1: Zustand ストアから直接 lookupData を取得
  const lookupData = useGameStore.getState().lookupData;

  let islandId = 0;
  let islandName = "UNKNOWN SECTOR";
  let sequence = id; // フォールバック

  if (lookupData && lookupData.districts && lookupData.areas && lookupData.islands) {
    // 5桁（Spot）か 3桁（District）かを判定して逆引き
    let district = null;

    if (id >= 10000 && lookupData.spots) {
      // 5桁の Spot ID の場合
      const spot = lookupData.spots.get(id);
      if (spot) {
        sequence = id % 100; // Spot の連番は下2桁
        district = lookupData.districts.get(spot.parentDistrictId);
      }
    } else {
      // 3桁の District ID の場合
      district = lookupData.districts.get(id);
      sequence = id % 10; // 地区の連番としてフォールバック
    }

    // 親エリア → 親島へと遡って名前を取得
    if (district) {
      const area = lookupData.areas.get(district.parentAreaId);
      if (area) {
        const island = lookupData.islands.get(area.parentIslandId);
        if (island) {
          islandId = island.id;
          islandName = island.name.toUpperCase();
        }
      }
    }
  } else {
    // lookupData が読み込まれていない場合の旧ロジックフォールバック
    islandId = Math.floor(id / 1000);
    sequence = id % 1000;
  }

  return {
    islandId,
    islandName,
    sequence,
    // ✅ UNIT番号を2桁でゼロ埋めして表示（例: UNIT 01）
    fullName: `${islandName} - UNIT ${String(sequence).padStart(2, '0')}`
  };
};