import { calculateQuoteV2 } from './itinerary-costs';

const testCases = [
  {
    name: '蘇國棟 15人 7天 (B級)',
    params: {
      pax: 15,
      golfPax: 15,
      days: 7,
      nights: 6,
      hotelTier: 'B' as const,
      isSingleRoom: false
    }
  },
  {
    name: '馬吉隊 9人 6天 (A級)',
    params: {
      pax: 9,
      golfPax: 8,
      days: 6,
      nights: 5,
      hotelTier: 'A' as const,
      isSingleRoom: true
    }
  }
];

testCases.forEach(tc => {
  const result = calculateQuoteV2(tc.params);
  console.log(`\n--- ${tc.name} ---`);
  console.log(`總日幣成本 (人均): ¥${result.subtotalJpy.toLocaleString()}`);
  console.log(`最終台幣報價 (人均): $${result.finalQuoteTwd.toLocaleString()}`);
  console.log(`詳細拆分:`, {
    交通: `¥${result.transportJpy}`,
    住宿: `¥${result.hotelJpy}`,
    球場: `¥${result.golfJpy}`,
    餐飲: `¥${result.diningJpy}`,
    導遊司機: `¥${result.staffJpy}`
  });
});
