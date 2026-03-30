import { calculateQuoteV2 } from './itinerary-costs';
import { analyzeQuotationAI } from './ai-advisor';
import { generateQuoteFlex } from './line-flex';

// 測試模擬數據
const params = {
  pax: 16,
  golfPax: 16,
  days: 6,
  nights: 5,
  hotelTier: 'B' as const,
  isSingleRoom: false,
  markupRate: 1.1,
  exchangeRate: 0.22
};

const cost = calculateQuoteV2(params);
const advice = analyzeQuotationAI(cost, params.markupRate);
const flex = generateQuoteFlex(cost, advice, '札幌/千歲高爾夫 6日');

console.log('--- FLEX MESSAGE PAYLOAD ---');
console.log(JSON.stringify(flex, null, 2));

// --- 驗證 1: Header backgroundColor ---
// markupRate 1.1 → margin 9.09% → warning (orange)
console.log('\n--- 驗證 Header Banner ---');
if (flex.contents.header.backgroundColor === '#ea580c') {
  console.log('✅ Warning Banner: backgroundColor = #ea580c (Orange) — markup 1.1 margin ~9%');
} else {
  console.log(`❌ Banner Color Failed: expected #ea580c, got ${flex.contents.header.backgroundColor}`);
}

// 驗證 Healthy 狀態 (高利潤)
const healthyParams = { ...params, markupRate: 1.25 };
const healthyCost = calculateQuoteV2(healthyParams);
const healthyAdvice = analyzeQuotationAI(healthyCost, healthyParams.markupRate);
const healthyFlex = generateQuoteFlex(healthyCost, healthyAdvice, '健康測試');
if (healthyFlex.contents.header.backgroundColor === '#16a34a') {
  console.log('✅ Healthy Banner: backgroundColor = #16a34a (Green) — markup 1.25');
} else {
  console.log(`❌ Healthy Banner Failed: got ${healthyFlex.contents.header.backgroundColor}`);
}

// --- 驗證 2: Header 文字全白 ---
const headerTexts = flex.contents.header.contents as any[];
const allWhite = headerTexts.every((c: any) => c.color === '#ffffff');
if (allWhite) {
  console.log('✅ Header Text: 全部為 #ffffff (白色)');
} else {
  console.log('❌ Header Text Color Failed — 非全白');
  headerTexts.forEach((c: any) => console.log(`   - "${c.text}" → ${c.color}`));
}

// --- 驗證 3: Footer AI 佔比提示 ---
const footerTexts = (flex.contents.footer.contents as any[]).filter((c: any) => c.type === 'text');
const ratioHint = footerTexts.find((c: any) => c.text?.includes('球場佔比'));
if (ratioHint) {
  console.log(`✅ AI Ratio Hint: ${ratioHint.text}`);
} else {
  console.log('❌ AI Ratio Hint Missing in footer');
}

// --- 驗證 4: Alert 狀態 (利潤太低) ---
console.log('\n--- 驗證 Alert 狀態 ---');
const alertParams = { ...params, markupRate: 1.05 };
const alertCost = calculateQuoteV2(alertParams);
const alertAdvice = analyzeQuotationAI(alertCost, alertParams.markupRate);
const alertFlex = generateQuoteFlex(alertCost, alertAdvice, '警示測試');

if (alertFlex.contents.header.backgroundColor === '#ef4444') {
  console.log('✅ Alert Banner: backgroundColor = #ef4444 (Red)');
} else {
  console.log(`❌ Alert Banner Failed: got ${alertFlex.contents.header.backgroundColor}`);
}
