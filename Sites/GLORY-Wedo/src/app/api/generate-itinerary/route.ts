// POST /api/generate-itinerary — Gemini 1.5 Flash（Cloudflare Edge）
// 對齊《御之旅 MVP 開發規劃建議書 v2》第三節

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SYSTEM_PROMPT = `你是御之旅（NOBLE HOUSE GLORY）的專業北海道旅遊行程規劃師。
根據使用者的旅遊偏好，規劃一份完整、實用的自駕行程。

請務必以 JSON 格式回覆，不要包含任何 markdown 或多餘文字。
JSON 結構如下：

{
  "id": "唯一識別碼（英數字+連字號）",
  "title": "行程標題（繁體中文，10字以內）",
  "subtitle": "副標題（天數、人數、季節、交通方式）",
  "destination": "目的地",
  "totalDays": 天數數字,
  "pax": 人數數字,
  "season": "季節描述",
  "transport": "交通方式",
  "hotel": "主要住宿名稱",
  "tags": ["標籤1", "標籤2", "標籤3"],
  "shareToken": "隨機短碼（8位英數字）",
  "createdAt": "今日日期 YYYY-MM-DD",
  "days": [
    {
      "day": 1,
      "title": "當日主題",
      "route": "路線描述（A→B→C）",
      "stops": [
        {
          "type": "transport|dining|hotel|sightseeing|nature|onsen|golf",
          "name": "景點/活動名稱",
          "desc": "說明（50字以內）",
          "duration": 預計停留分鐘數,
          "cost": 費用日圓（整數，無費用填0）
        }
      ]
    }
  ]
}

規劃原則：
- 夏季（6-8月）：主打薰衣草（富良野7月最盛）、清涼湖泊、戶外活動
- 行程節奏輕鬆：每天3-5個停點，不趕路
- 以札幌為基地（御居所 HOUSE HOTEL 作為住宿）
- 必含海鮮美食（二條市場、小樽、薄野）
- 費用單位：日圓/人（活動費，不含住宿）`;

function buildUserPrompt(answers: Record<string, string>): string {
  return `請根據以下旅遊偏好，規劃一份完整行程：

目的地：${answers.destination || "北海道"}
天數：${answers.duration || "6天5夜"}
人數：${answers.pax || "6人"}
主題偏好：${answers.vibe || "海鮮美食、自然景觀、溫泉"}
出發季節：${answers.season || "夏季（6-8月）"}
行程節奏：${answers.pace || "輕鬆悠哉"}

請生成完整的 JSON 行程資料。`;
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { success: false, error: "伺服器未設定 GEMINI_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { answers } = body as { answers?: Record<string, string> };
    const userPrompt = buildUserPrompt(answers || {});

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    const itinerary = JSON.parse(text.trim());

    return NextResponse.json({ success: true, itinerary });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { success: false, error: "行程生成失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
