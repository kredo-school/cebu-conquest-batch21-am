import { useGameStore, LookupData } from '../store'; 

/**
 * IDから地区・島情報を解析するユーティリティ
 * GDD v3.1 準拠: ID体系（5桁: Spot / 3桁: District）に対応
 */
export const parseDistrictId = (id: number) => {
  // ✅ store.ts で定義した LookupData 型として取得（anyを排除）
  const lookupData = useGameStore.getState().lookupData as LookupData | null;

  let islandId = 0;
  let islandName = "UNKNOWN SECTOR";
  let sequence = id; // フォールバック用

  if (lookupData && lookupData.districts && lookupData.areas && lookupData.islands) {
    // 取得したデータの型を保証するための変数
    let districtData: { name: string; id: number; parentAreaId: number } | undefined = undefined;

    if (id >= 10000 && lookupData.spots) {
      // --- 5桁の Spot ID の場合 ---
      const spot = lookupData.spots.get(id);
      if (spot) {
        sequence = id % 100; // Spot の連番は下2桁
        districtData = lookupData.districts.get(spot.parentDistrictId);
      }
    } else {
      // --- 3桁の District ID の場合 ---
      districtData = lookupData.districts.get(id);
      sequence = id % 10; // 地区の連番
    }

    // ✅ districtData の存在チェックを入れることで 'never' エラーを回避
    if (districtData) {
      const area = lookupData.areas.get(districtData.parentAreaId);
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