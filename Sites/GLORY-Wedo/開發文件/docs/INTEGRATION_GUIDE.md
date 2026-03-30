# 御之旅 v0.5 整合指南

本指南與 **`開發文件/御之旅_MVP開發規劃建議書_v2.docx`**（以下稱**建議書 v2**）對齊：技術棧為 **GitHub · Cloudflare Pages · Supabase · Google Gemini**。

**執行目錄**：倉庫根目錄 `GLORY-Wedo/`（與根目錄 `package.json` 同層）。`開發文件/` 僅內部規格與 SQL，**不單獨部署**。

---

## 快速開始（本機）

```bash
cd /path/to/GLORY-Wedo

npm install
cp .env.example .env.local
# 填入 GEMINI_API_KEY（必須，行程生成）
# 選填：NEXT_PUBLIC_SUPABASE_*（接上資料庫後）

npm run dev
# http://localhost:3000
```

---

## Phase 1：AI 行程生成（Gemini + Edge）

### 已實作（根目錄）

- `src/app/api/generate-itinerary/route.ts`：`export const runtime = "edge"`，使用 **Gemini 1.5 Flash**、`responseMimeType: application/json`。
- `src/components/PrototypeV4.jsx`：`handleGenerate` 已改為 `fetch("/api/generate-itinerary")`（非 mock）。
- 環境變數：**`GEMINI_API_KEY`**（取代建議書撰寫時的 Claude / `ANTHROPIC_API_KEY`）。

### 驗證 API

```bash
curl -X POST http://localhost:3000/api/generate-itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "destination": "北海道",
      "duration": "6天5夜",
      "pax": "6人",
      "vibe": "海鮮美食、自然景觀",
      "season": "夏季（6-8月）",
      "pace": "輕鬆悠哉"
    }
  }'
```

預期：`{ "success": true, "itinerary": { ... } }`

---

## Phase 2：Supabase

### Client（已建立）

- `src/lib/supabase.ts`：瀏覽器用 `supabase`、伺服器用 **`await createServerSupabase()`**，並設 **`auth: { persistSession: false }`**（Cloudflare Edge 必要；建議書第四節）。
- 建議書中的 `@supabase/auth-helpers-nextjs` 已由官方推薦的 **`@supabase/ssr`** 取代（行為等同；Next 15 的 `cookies()` 為 **async**，故 `createServerSupabase` 為 async）。

### 建表 SQL

請在 Supabase → SQL Editor 執行：

**`開發文件/docs/supabase-mvp-schema.sql`**

（內容對應建議書 v2：`profiles`、`trips`、`quotes`、`bookings`、RLS。）

> **與舊版 `CLAUDE.md` 的 `itinerary` / `itinerary_day` / `stop` 表**：為早期原型 schema；MVP 建議以 **`trips.days_json`** 為主軸存完整行程 JSON。新功能請對齊 `trips`；若需遷移可另開 migration。

### 草稿儲存（待實作）

建議書 Day 4：`POST /api/trips` 寫入 `public.trips`。目前 repo 尚未含該 route；完成後再在 `handleSaveDraft` 或 `handleGenerate` 成功後呼叫。

---

## Phase 3：分享頁 `/share/[token]`

以 `trips.share_token` 查詢（見建議書）。實作時請在對應 `page.tsx` / route 使用 **`await createServerSupabase()`** 或具備 RLS 的查詢方式，並為該 API/route 加上 **`export const runtime = "edge"`**（與建議書第六節一致）。

---

## Phase 4：PDF 報價單

同建議書第七～八週路線；需時再安裝 `@react-pdf/renderer` 等（見建議書原文）。

---

## 嵌入官網

根目錄已內建 **`src/app/embed/ai-planner/page.tsx`**。

```html
<iframe
  src="https://你的專案.pages.dev/embed/ai-planner"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.1)"
></iframe>
```

---

## 部署：Cloudflare Pages（對齊建議書第五、六節）

### 本機建置（產出與 CI 相同）

```bash
npm run pages:build
# 輸出：.vercel/output/static（wrangler / Pages 上傳此目錄）
```

本機預覽 Functions：

```bash
npm run pages:dev
```

### 設定檔（倉庫根目錄）

| 檔案 | 說明 |
|------|------|
| `wrangler.toml` | `name = "miidokoro-mvp"`、`nodejs_compat`、輸出目錄（與建議書 6.2 一致；**機密只放 Cloudflare Dashboard**） |
| `.github/workflows/deploy.yml` | `main` / `develop` push 時建置並部署 Pages |
| `next.config.js` | 開發模式載入 `@cloudflare/next-on-pages/next-dev`（建議書 6.3） |

### GitHub Actions Secrets（與建議書 5.3 對照）

| Secret | 說明 |
|--------|------|
| `CF_API_TOKEN` | Cloudflare API Token（需含 **Edit Cloudflare Pages**） |
| `CF_ACCOUNT_ID` | Cloudflare 帳號 ID |
| `SUPABASE_URL` | 對應 `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | 對應 `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | 僅後端 API 使用，**不可**暴露於前端 |
| `GEMINI_API_KEY` | Google AI Studio |
| `APP_URL` | 正式或預覽站網址（`NEXT_PUBLIC_APP_URL`） |

**Cloudflare Pages 專案環境變數**（執行期）：務必在 Dashboard 設定 **`GEMINI_API_KEY`** 與其餘後端用變數，與 GitHub Secrets 並列維護。

### Next.js 版本說明

`@cloudflare/next-on-pages` 目前 peer 要求 **`next` 為 `>=14.3.0` 且 `<=15.5.2`**；npm 上無 Next `14.3.x` 穩定版，故本 repo 使用 **`next@15.5.2`**（仍屬建議書「Next.js App Router」架構）。後續若遷移 **OpenNext for Cloudflare**（官方已標示 next-on-pages 進入維護末期），再於建議書改版中更新。

---

## 資安與額度（節錄建議書）

- **`GEMINI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY`**：僅 server-side；不可出現在 `NEXT_PUBLIC_*` 或客戶端 bundle。
- **RLS**：見 `supabase-mvp-schema.sql`。
- **Rate limiting**：建議書建議對 `/api/generate-itinerary` 在 Cloudflare WAF 限制每 IP 每分鐘次數。

---

## 單一真相來源

更完整的週次路線圖、Day 1–5 檢核、Issues 標籤與費用表，以 **`開發文件/御之旅_MVP開發規劃建議書_v2.docx`** 為準；本檔僅整理與**目前根目錄程式碼**一致之操作步驟。
