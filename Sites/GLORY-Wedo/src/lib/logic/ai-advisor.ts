/**
 * 御之旅 (Royal Journey) — AI 報價顧問 (AI Advisor)
 * 目的：根據歷史 6 團數據分析當前報價之利潤與佔比異常
 */

import { DetailedCost } from './itinerary-costs';

export interface AIAdvice {
  status: 'healthy' | 'warning' | 'alert';
  message: string;
  suggestions: string[];
}

/**
 * 分析報價佔比與利潤
 * 基準參考：Excel「成本結構分析」
 */
export function analyzeQuotationAI(cost: DetailedCost, markupRate: number): AIAdvice {
  const advice: AIAdvice = {
    status: 'healthy',
    message: '報價結構符合歷史規範。',
    suggestions: []
  };

  const { transportJpy, hotelJpy, diningJpy, golfJpy, staffJpy, subtotalJpy } = cost;
  
  // 1. 利潤率檢查 (Profit Margin)
  const margin = (markupRate - 1) / markupRate;
  if (margin < 0.08) {
    advice.status = 'alert';
    advice.message = '利潤率極低，低於 8% 的營運下限！';
    advice.suggestions.push('建議將加價倍率調至 1.1 以上。');
  } else if (margin < 0.12) {
    advice.status = 'warning';
    advice.message = '利潤率偏低 (12% 以下)，請確認有無額外隱形成本。';
  }

  // 2. 歷史佔比對比 (Historical Ratios)
  const ratios = {
    transport: transportJpy / subtotalJpy,
    hotel: hotelJpy / subtotalJpy,
    golf: golfJpy / subtotalJpy,
  };

  // 交通佔比過高警告 (通常因人數太少)
  if (ratios.transport > 0.20) {
    advice.status = 'warning';
    advice.suggestions.push('交通佔比超過 20%，建議增加成行人數或改用 ALPHARD 節省預算。');
  }

  // 住宿佔比低於預期 (可能 Tier 設太低)
  if (ratios.hotel < 0.30) {
    advice.suggestions.push('住宿佔比低於 30%，若為 A 級別團，請確認飯店報價是否正確。');
  }

  // 3. 導遊司機人均分攤
  if (staffJpy > 15000) {
    advice.suggestions.push('導遊司機人均分攤超過 ¥15k，主因是人數較少，建議提醒客戶導遊服務費佔比較高。');
  }

  return advice;
}
