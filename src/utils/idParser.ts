export const parseDistrictId = (id: number) => {
  const islandId = Math.floor(id / 1000); // 例: 11101 -> 11
  const sequence = id % 1000;             // 例: 11101 -> 101
  
  const islandNames: Record<number, string> = {
    11: "CEBU MAINLAND",
    12: "MACTAN ISLAND",
    13: "BOHOL",
    14: "NEGROS",
    15: "SIQUIJOR"
  };

  return {
    islandId,
    islandName: islandNames[islandId] || "UNKNOWN SECTOR",
    sequence,
    fullName: `${islandNames[islandId]} - UNIT ${sequence}`
  };
};