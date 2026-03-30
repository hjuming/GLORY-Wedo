/**
 * 御之旅 Phase 7.2 — LINE OA 主動推送通知
 * POST /api/notify/line-push
 * Body: { tourId, type: 'confirmed' | 'changed', message?, targetUserIds? }
 *
 * 當行程狀態變為 confirmed 或有重大異動時，主動推送 Flex Message 給客戶
 */
export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

interface PushRequest {
  tourId: string;
  type: 'confirmed' | 'changed';
  message?: string;
  targetUserIds?: string[]; // LINE User IDs, 若空則推送給所有團員
}

export async function POST(req: Request) {
  try {
    const body: PushRequest = await req.json();
    const { tourId, type, message } = body;

    if (!tourId || !type) {
      return Response.json({ error: 'Missing tourId or type' }, { status: 400 });
    }

    if (!CHANNEL_ACCESS_TOKEN) {
      return Response.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    // 取得團資訊
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let tourName = '御之旅行程';
    let shareToken = '';

    if (url && key) {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data: tour } = await supabase.from('tours').select('tour_name').eq('id', tourId).single();
      if (tour) tourName = tour.tour_name;

      const { data: trip } = await supabase.from('trips').select('share_token').eq('title', tourName).single();
      if (trip) shareToken = trip.share_token;
    }

    // 構建 Flex Message
    const flexMessage = buildStatusFlexMessage(type, tourName, message || '', shareToken);

    // 若有指定 targetUserIds 則逐一推送，否則使用 broadcast
    const targetIds = body.targetUserIds;
    if (targetIds && targetIds.length > 0) {
      // Multicast
      await fetch('https://api.line.me/v2/bot/message/multicast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: targetIds,
          messages: [flexMessage],
        }),
      });
    } else {
      // Broadcast to all followers
      await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messages: [flexMessage],
        }),
      });
    }

    return Response.json({ success: true, tourName, type });
  } catch (err) {
    console.error('LINE push error:', err);
    return Response.json({ error: 'Push failed' }, { status: 500 });
  }
}

function buildStatusFlexMessage(type: 'confirmed' | 'changed', tourName: string, detail: string, shareToken: string) {
  const isConfirmed = type === 'confirmed';
  const mainColor = isConfirmed ? '#16a34a' : '#f59e0b';
  const statusText = isConfirmed ? '✅ 行程已確認' : '⚠️ 行程異動通知';
  const statusTextJa = isConfirmed ? '旅程が確定しました' : '旅程変更のお知らせ';

  const portalUrl = shareToken
    ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://plan.nobleglory.jp'}/share/${shareToken}`
    : '';

  const bodyContents: any[] = [
    {
      type: 'text',
      text: tourName,
      weight: 'bold',
      size: 'lg',
      color: '#0f172a',
    },
    {
      type: 'text',
      text: statusTextJa,
      size: 'xs',
      color: '#64748b',
      margin: 'sm',
    },
  ];

  if (detail) {
    bodyContents.push({
      type: 'text',
      text: detail,
      size: 'sm',
      color: '#475569',
      margin: 'md',
      wrap: true,
    });
  }

  const actions: any[] = [];
  if (portalUrl) {
    actions.push({
      type: 'action',
      action: {
        type: 'uri',
        label: '📱 查看互動行程 / 旅程を見る',
        uri: portalUrl,
      },
    });
  }

  return {
    type: 'flex',
    altText: `${statusText} — ${tourName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '御之旅 NOBLE HOUSE GLORY', size: 'xxs', color: '#ffffff', weight: 'bold' },
          { type: 'text', text: statusText, size: 'md', color: '#ffffff', weight: 'bold', margin: 'sm' },
        ],
        backgroundColor: mainColor,
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
        paddingAll: '20px',
      },
      ...(actions.length > 0 ? {
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: actions,
          paddingAll: '12px',
        },
      } : {}),
    },
  };
}
