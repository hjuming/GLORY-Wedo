import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { calculateQuoteV2, QuotationParams } from '@/lib/logic/itinerary-costs';
import { analyzeQuotationAI } from '@/lib/logic/ai-advisor';
import { generateQuoteFlex } from '@/lib/logic/line-flex';

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  : null;

/**
 * LINE Webhook Handler (Next.js App Router)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-line-signature') || '';

    // 1. 驗證簽章
    if (!verifySignature(body, signature)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const events = JSON.parse(body).events;

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim();
        
        // 處理關鍵字: "報價 [GroupID]"
        if (text.startsWith('報價')) {
          const groupId = text.replace('報價', '').trim();
          await handleQuoteRequest(event.replyToken, groupId);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}

/**
 * 驗證 LINE 簽章
 */
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

/**
 * 處理報價查詢邏輯
 */
async function handleQuoteRequest(replyToken: string, groupId: string) {
  try {
    // 1. 從 Supabase 查詢團資訊 (支援 ID 或 團名模糊查詢)
    if (!supabase) throw new Error('Supabase not configured');
    const { data: tour, error } = await supabase
      .from('tours')
      .select('*')
      .or(`id.eq.${groupId},tour_name.ilike.%${groupId}%`)
      .single();

    if (error || !tour) {
      return replyText(replyToken, `找不到編號或團名為 "${groupId}" 的行程資料，請檢查後再試。`);
    }

    // 2. 準備計算參數
    const params: QuotationParams = {
      pax: tour.pax,
      golfPax: tour.golf_pax || tour.pax,
      days: tour.days,
      nights: tour.nights,
      hotelTier: 'B', // 預設 B 級
      isSingleRoom: false, // 預設雙人房
      markupRate: 1.1,
      exchangeRate: 0.22
    };

    // 3. 執行報價與分析
    const cost = calculateQuoteV2(params);
    const advice = analyzeQuotationAI(cost, params.markupRate || 1.1);

    // 4. 產生 Flex Message
    const flexMessage = generateQuoteFlex(cost, advice, tour.tour_name);

    // 5. 回覆 LINE
    await pushToLine(replyToken, flexMessage);

  } catch (err) {
    console.error('Handle quote error:', err);
    await replyText(replyToken, '抱歉，處理報價時發生錯誤。');
  }
}

/**
 * 回覆文字訊息
 */
async function replyText(replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }]
    })
  });
}

/**
 * 回覆 Flex Message
 */
async function pushToLine(replyToken: string, flexMessage: any) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [flexMessage]
    })
  });
}
