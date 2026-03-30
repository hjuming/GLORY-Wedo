/**
 * 御之旅 (Royal Journey) 交通分擔邏輯 V2
 * 依據：《高爾夫旅遊6團資料統整》交通方式工作表
 */

export type VehicleType = 'ALPHARD' | 'HIACE' | 'Commuter' | 'Coaster' | 'MediumBus' | 'LargeBus';

export interface VehicleSpec {
  type: VehicleType;
  maxPax: number;
  maxGolfBags: number;
  dailyRateJpy: number;
}

export const VEHICLE_FLEET: Record<VehicleType, VehicleSpec> = {
  'ALPHARD': { type: 'ALPHARD', maxPax: 4, maxGolfBags: 0, dailyRateJpy: 60000 },
  'HIACE': { type: 'HIACE', maxPax: 9, maxGolfBags: 8, dailyRateJpy: 70000 },
  'Commuter': { type: 'Commuter', maxPax: 12, maxGolfBags: 10, dailyRateJpy: 80000 },
  'Coaster': { type: 'Coaster', maxPax: 18, maxGolfBags: 15, dailyRateJpy: 90000 },
  'MediumBus': { type: 'MediumBus', maxPax: 27, maxGolfBags: 20, dailyRateJpy: 110000 },
  'LargeBus': { type: 'LargeBus', maxPax: 40, maxGolfBags: 40, dailyRateJpy: 130000 },
};

export interface TransportRecommendation {
  vehicleType: VehicleType;
  vehicleCount: number;
  dailyRateJpy: number;
  totalDailyCostJpy: number;
  note: string;
}

/**
 * 根據人數與球具數量建議最優車型
 * @param pax 人數
 * @param golfPax 打球人數 (對應球包數量)
 */
export function getTransportRecommendationV2(pax: number, golfPax: number = 0): TransportRecommendation {
  // 按照容量從小到大排序
  const options = Object.values(VEHICLE_FLEET).sort((a, b) => a.maxPax - b.maxPax);
  
  for (const vehicle of options) {
    if (pax <= vehicle.maxPax && golfPax <= vehicle.maxGolfBags) {
      return {
        vehicleType: vehicle.type,
        vehicleCount: 1,
        dailyRateJpy: vehicle.dailyRateJpy,
        totalDailyCostJpy: vehicle.dailyRateJpy,
        note: `符合需求：${pax}人 / ${golfPax}球包。使用 1 台 ${vehicle.type}。`
      };
    }
  }

  // 若單台裝不下，預設使用大巴或多台 HiAce (此處簡化為大巴)
  const largeBus = VEHICLE_FLEET['LargeBus'];
  const count = Math.ceil(pax / largeBus.maxPax);
  return {
    vehicleType: 'LargeBus',
    vehicleCount: count,
    dailyRateJpy: largeBus.dailyRateJpy,
    totalDailyCostJpy: largeBus.dailyRateJpy * count,
    note: `人數過多，建議使用 ${count} 台大型巴士。`
  };
}
