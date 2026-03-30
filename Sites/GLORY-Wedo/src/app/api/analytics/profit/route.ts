/**
 * 御之旅 Phase 6.2 — 利潤分析 API
 * GET /api/analytics/profit
 * 聚合 quotations + tours 數據，回傳利潤摘要
 * 權限：admin only（middleware 已攔截）
 */
export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // 未設定 Supabase 時回傳 mock 數據（開發模式）
    return Response.json(getMockData());
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 取得所有已報價的團（含 quotations）
  const { data: quotations, error } = await supabase
    .from('quotations')
    .select('*, tours(tour_name, pax, days, nights, status, start_date)')
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 聚合
  const tours = (quotations || []).map((q: any) => {
    const cost = q.subtotal_cost_jpy || 0;
    const markup = q.markup_rate || 1.1;
    const revenue = Math.round(cost * markup);
    const profit = revenue - cost;
    const margin = cost > 0 ? profit / revenue : 0;

    return {
      id: q.id,
      tourName: q.tours?.tour_name || '未命名',
      pax: q.tours?.pax || 0,
      status: q.tours?.status || 'draft',
      costJpy: cost,
      revenueJpy: revenue,
      profitJpy: profit,
      margin,
      markupRate: markup,
      exchangeRate: q.exchange_rate || 0.22,
    };
  });

  const totalCost = tours.reduce((s: number, t: any) => s + t.costJpy, 0);
  const totalRevenue = tours.reduce((s: number, t: any) => s + t.revenueJpy, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const alertTours = tours.filter((t: any) => t.margin < 0.08);

  return Response.json({
    summary: { totalCost, totalRevenue, totalProfit, avgMargin, tourCount: tours.length },
    alertTours,
    tours,
  });
}

function getMockData() {
  // 基於 seed_v2.sql 的 6 個歷史團模擬
  const mockTours = [
    { id: '1', tourName: '北海道頂級高爾夫 6 天', pax: 16, status: 'completed', costJpy: 1280000, markup: 1.15 },
    { id: '2', tourName: '經典北海道 5 天', pax: 12, status: 'completed', costJpy: 840000, markup: 1.12 },
    { id: '3', tourName: '秋季紅葉高爾夫 7 天', pax: 20, status: 'completed', costJpy: 1960000, markup: 1.10 },
    { id: '4', tourName: '冬季溫泉美食 5 天', pax: 8, status: 'completed', costJpy: 560000, markup: 1.08 },
    { id: '5', tourName: '春季櫻花 6 天', pax: 14, status: 'confirmed', costJpy: 1120000, markup: 1.13 },
    { id: '6', tourName: 'VIP 私人球場 4 天', pax: 6, status: 'draft', costJpy: 720000, markup: 1.20 },
  ];

  const tours = mockTours.map((t) => {
    const revenue = Math.round(t.costJpy * t.markup);
    const profit = revenue - t.costJpy;
    return {
      id: t.id,
      tourName: t.tourName,
      pax: t.pax,
      status: t.status,
      costJpy: t.costJpy,
      revenueJpy: revenue,
      profitJpy: profit,
      margin: profit / revenue,
      markupRate: t.markup,
      exchangeRate: 0.22,
    };
  });

  const totalCost = tours.reduce((s, t) => s + t.costJpy, 0);
  const totalRevenue = tours.reduce((s, t) => s + t.revenueJpy, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalProfit / totalRevenue;
  const alertTours = tours.filter((t) => t.margin < 0.08);

  return {
    summary: { totalCost, totalRevenue, totalProfit, avgMargin, tourCount: tours.length },
    alertTours,
    tours,
  };
}
