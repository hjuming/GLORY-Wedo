/**
 * 御之旅 (Royal Journey) 報價計算引擎 V2 (Logic v2)
 * 目的：精確對齊《高爾夫旅遊6團資料統整》報價公式
 */

import { getTransportRecommendationV2, VehicleType } from './transport-logic';

export interface QuotationParams {
  pax: number;
  golfPax: number;
  days: number;
  nights: number;
  hotelTier: 'A' | 'B' | 'C';
  isSingleRoom: boolean;
  markupRate?: number;
  exchangeRate?: number;
  referralFeeTwd?: number;
}

export interface DetailedCost {
  golfJpy: number;
  hotelJpy: number;
  diningJpy: number;
  transportJpy: number;
  staffJpy: number;
  subtotalJpy: number;
  finalQuoteTwd: number;
}

/**
 * 完整計算報價邏輯
 * @param params 報價參數
 */
export function calculateQuoteV2(params: QuotationParams): DetailedCost {
  const {
    pax,
    golfPax,
    days,
    nights,
    hotelTier,
    isSingleRoom,
    markupRate = 1.1,
    exchangeRate = 0.22,
    referralFeeTwd = 0
  } = params;

  // 1. 交通預判與費用 (Transport)
  const transport = getTransportRecommendationV2(pax, golfPax);
  const transportJpy = (transport.totalDailyCostJpy * days) / pax;

  // 2. 住宿費用 (Hotel) - 依照 Tier 與 房型
  // A: 25k/18k, B: 18k/14k, C: 12k/9k (參考 seed_v2)
  const hotelRates = {
    'A': { single: 25000, double: 18000 },
    'B': { single: 18000, double: 14000 },
    'C': { single: 12000, double: 9000 }
  };
  const rate = isSingleRoom ? hotelRates[hotelTier].single : hotelRates[hotelTier].double;
  const hotelJpy = rate * nights;

  // 3. 球場費用 (Golf) - 平均 $18k (A: 25k, B: 15k, C: 11k)
  const golfRates = { 'A': 25000, 'B': 15000, 'C': 11000 };
  const rounds = days - 2; // 假設頭尾兩天不打球
  const golfJpy = (golfRates[hotelTier] * (rounds > 0 ? rounds : 0) * (golfPax / pax));

  // 4. 餐飲費用 (Dining) - 依照統整表平均
  // 早餐 1.5k + 午餐 2.5k + 晚餐 10k + 水果 0.5k = $14.5k
  const diningJpy = 14500 * nights;

  // 5. 導遊司機 (Staff) - 導遊 30k+10k, 司機 25k+8k
  const staffJpy = ((40000 + 33000) * days) / pax;

  // 6. 匯總
  const subtotalJpy = Math.round(golfJpy + hotelJpy + diningJpy + transportJpy + staffJpy);
  const finalQuoteTwd = Math.round((subtotalJpy * markupRate * exchangeRate) + referralFeeTwd);

  return {
    golfJpy: Math.round(golfJpy),
    hotelJpy,
    diningJpy,
    transportJpy: Math.round(transportJpy),
    staffJpy: Math.round(staffJpy),
    subtotalJpy,
    finalQuoteTwd
  };
}
