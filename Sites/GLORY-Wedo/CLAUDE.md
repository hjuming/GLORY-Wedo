# 御之旅 NOBLE HOUSE GLORY

## 可部署專案（倉庫根目錄）

在 **`/Users/MING/Sites/GLORY-Wedo`**（與根目錄 `package.json` 同層）執行：

- `npm install` / `npm run dev` / `npm run build`
- **`npm run pages:build`** → Cloudflare Pages 用產物（`.vercel/output/static`）

**部署方式**對齊 **`開發文件/御之旅_MVP開發規劃建議書_v2.docx`**：**GitHub Actions → Cloudflare Pages · Supabase · Gemini**。實作步驟與 Secrets 清單見 **`開發文件/docs/INTEGRATION_GUIDE.md`**。

## 內部文件（不單獨部署）

| 路徑 | 內容 |
|------|------|
| `開發文件/CLAUDE.md` | 產品脈絡、舊版 itinerary schema 參考 |
| `開發文件/docs/INTEGRATION_GUIDE.md` | 與建議書 v2 對齊之操作指南 |
| `開發文件/docs/supabase-mvp-schema.sql` | MVP 建表 SQL |
| `開發文件/御之旅_MVP開發規劃建議書_v2.docx` | 規劃書原文（週次路線圖、Day 1–5、Issues） |
