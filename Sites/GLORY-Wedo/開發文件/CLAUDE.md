# 御之旅 NOBLE HOUSE GLORY — 開發指引
# CLAUDE.md — 供 Claude Code 讀取專案脈絡

> **路徑說明**：可部署的 Next.js 專案在**倉庫根目錄**（`package.json`、`src/`）。請在根目錄執行 `npm install` / `npm run dev` / `npm run build`。本 `開發文件/` 資料夾**僅內部參考**，不含上線用程式碼。

## 專案概覽

這是「御之旅」旅遊行程規劃及報價系統，基於 Next.js 14 + React 18。
前身為純前端 React 原型（v0.3），v0.4 新增 AI 行程規劃模組，
下一步（v0.5+）目標是串接真實 **Google Gemini** API、**Cloudflare Pages** 部署，並接入 **Supabase**（詳見 **`御之旅_MVP開發規劃建議書_v2.docx`** 與 **`docs/INTEGRATION_GUIDE.md`**）。

**公司**：NOBLE HOUSE GLORY（御居所 HOUSE HOTEL，札幌）  
**主要功能**：
1. ✨ AI 對話式行程規劃（Gemini 1.5 Flash API）
2. ✅ 任務管理（雲端同步）
3. 📅 月曆總覽
4. 🗺 行程管理
5. 👥 團員分房分組
6. 💰 成本報價試算
7. 🧹 御居所清潔排程
8. 📄 文件輸出（PDF/Excel）
9. ⚙️ 系統設定

---

## 目錄結構（倉庫根目錄＝可部署專案）

```
GLORY-Wedo/                         ← 在此執行 npm 指令
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── embed/ai-planner/page.tsx
│   │   └── api/generate-itinerary/route.ts  ← Claude API
│   ├── components/PrototypeV4.jsx
│   └── lib/useItineraryGenerator.ts
├── CLAUDE.md                       ← 根目錄：指向本資料夾
├── .env.example
├── next.config.js
├── package.json
└── 開發文件/
    ├── CLAUDE.md                   ← 本文件（內部規格）
    └── docs/INTEGRATION_GUIDE.md
```

---

## AI 行程生成（根目錄已串接）

倉庫根目錄已將 **`handleGenerate`** 改為 **`fetch("/api/generate-itinerary")`**，後端為 **Gemini 1.5 Flash**（`src/app/api/generate-itinerary/route.ts`，`runtime = "edge"`）。本機請設定 **`GEMINI_API_KEY`**。

**下一步（建議書 Day 3–5）**：Supabase 建表、`/api/trips`、分享頁、登入與 middleware——見 **`docs/INTEGRATION_GUIDE.md`** 與 **`御之旅_MVP開發規劃建議書_v2.docx`**。

---

## 資料庫（Phase 2）

採用 **Supabase**（PostgreSQL）。Schema 設計如下：

```sql
-- 行程主表
create table itinerary (
  id           uuid primary key default gen_random_uuid(),
  share_token  text unique not null,
  title        text not null,
  status       text default 'draft',  -- draft | published | archived
  total_days   int,
  season       text,
  pax          int,
  transport_mode text,
  ai_prompt_summary text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 每日行程
create table itinerary_day (
  id           uuid primary key default gen_random_uuid(),
  itinerary_id uuid references itinerary(id) on delete cascade,
  day_number   int not null,
  title        text,
  note         text
);

-- 景點停留點
create table stop (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid references itinerary_day(id) on delete cascade,
  sort_order   int not null,
  name         text not null,
  address      text,
  lat          float,
  lng          float,
  duration_min int,
  cost_jpy     int,
  category     text,
  guide_note   text,
  attraction_id uuid references attraction(id)
);

-- 景點知識庫
create table attraction (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  region      text,
  address     text,
  lat         float,
  lng         float,
  season_best text,
  category    text,
  place_id    text  -- Google Place ID
);
```

**安裝 Supabase client：**
```bash
npm install @supabase/supabase-js
```

**環境變數（根目錄 `.env.local`；完整範本見根目錄 `.env.example`）：**
```
GEMINI_API_KEY=...                    # Google AI Studio
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # 僅後端
```

**MVP 資料表（建議書 v2）**：執行 **`docs/supabase-mvp-schema.sql`**。下方 SQL 為早期原型 `itinerary` / `itinerary_day` / `stop` 參考，與 MVP `trips`/`quotes` 並存時請擇一為主或另行 migration。

---

## 官網嵌入方式

在 NOBLE HOUSE GLORY 現有官網頁面加入以下 iframe（網域請改為 Cloudflare Pages 或自訂網域）：

```html
<!-- 嵌入 AI 行程規劃器 -->
<iframe
  src="https://你的專案.pages.dev/embed/ai-planner"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius: 12px;"
></iframe>
```

`/embed/ai-planner` 路由只渲染 `AIItineraryModule`，不含側邊導航。

---

## 部署建議（對齊建議書 v2）

1. **Cloudflare Pages** + **`@cloudflare/next-on-pages`**：`npm run pages:build`，產出 `.vercel/output/static`
2. **GitHub Actions**：`.github/workflows/deploy.yml` → `cloudflare/pages-action@v1`
3. **`wrangler.toml`**：專案名預設 `miidokoro-mvp`；Secrets 以 **GitHub Actions** 與 **Cloudflare Dashboard** 設定，勿 commit
4. **每支** `src/app/api/**/route.ts` 於 Edge 執行時須 **`export const runtime = 'edge'`**
5. 自訂網域：`plan.nobleglory.jp` 或 `itinerary.miidokoro.com`（DNS 建議同樣託管於 Cloudflare）

---

## 版本歷程

| 版本 | 說明 |
|------|------|
| v0.1 | 初始原型，基本行程 + 成本計算 |
| v0.2 | 新增團員管理、分房、高爾夫分組 |
| v0.3 | 新增任務管理（雲端同步）、清潔排程甘特圖 |
| v0.4 | 新增 AI 行程規劃模組（對話 + 結果 + 草稿庫）|
| v0.5 | **進行中**：Gemini API + Cloudflare Pages 部署 + Supabase（`trips` 等，見 `docs/supabase-mvp-schema.sql`） |
| v0.6 | **目標**：分享頁 + PDF 匯出 + 報價單生成 |

---

## 注意事項

- `PrototypeV4.jsx` 使用 inline style 物件（`S.*`），非 Tailwind，保持一致
- 雲端同步使用 `window.storage`（Claude artifact 環境的 API），
  轉為 Next.js 後改為 Supabase Realtime 或 localStorage
- 所有金額單位為日圓（JPY），顯示時用 `¥{n.toLocaleString()}`
- 繁體中文介面，字體 `'Noto Sans TC', 'Hiragino Sans', sans-serif`
