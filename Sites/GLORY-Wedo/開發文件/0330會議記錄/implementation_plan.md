# 御之旅 (Royal Journey) 高爾夫報價系統：開發指令 (Development Directive)

本指令基於《御之旅 MVP 開發規劃建議書 v2》與《高爾夫報價系統開發計畫 v1》，旨在解決手動報價失靈、資料碎片化及行程單缺失三大痛點。

## 開發者規範
- **技術棧對齊**：Next.js (App Router) + Tailwind CSS + Supabase。
- **資料流向**：所有計算邏輯必須可回溯（Traceable），歷史樣本必須結構化（Structured）。
- **驗收標準**：由 Antigravity 進行代碼審查（Code Review）與單元測試驗收後方可部署。

---

## 任務階段拆解

### Phase 1：資料地基（1-2 週）- **執行工程師任務**
> [!IMPORTANT]
> 將碎片化的資料轉化為可回溯的系統資產。

#### 1. 資料庫 Schema 擴建 (Supabase)
- **[NEW] `golf_resources`**：名稱、地址、座標、等級、平假日成本。
- **[NEW] `lodging_resources`**：單/雙人房成本、飯店等級。
- **[NEW] `dining_resources`**：餐次、預估人均、座標。
- **[NEW] `historical_samples`**：存儲 4 團（郭銘勳、馬吉隊、蘇國棟、彥廷）的歷史「成本-報價-服務」關聯資料。

#### 2. 資料導入
- 使用 Script 批量讀取 `開發文件/高爾夫旅遊文件` 下的樣本資料入庫。

---

### Phase 2：自動化報價引擎（3-4 週）- **執行工程師任務**
> [!TIP]
> 解決 PAX 變數造成的成本波動問題。

#### 1. 核心報價公式編碼
- 邏輯：`[(交通/人數) + 住宿 + 餐飲 + 球場 + 導遊小費] * 1.1 (加成)`。
- **[NEW] `TransportLogic.ts`**：根據人數自動判斷車型（海獅 v.s. Coaster）並分攤車資。
- 支援「單人房差」自動計算。

#### 2. 試算 UI 開發
- 仿 Excel 的網頁端錄入介面，支援業務員快速勾選飯店、球場、餐廳等級。

---

### Phase 3：行程單與 LINE 整合（5-6 週）- **執行工程師任務**

#### 1. 單頁行程單產生器
- **[NEW] `OnePageRenderer.tsx`**：A4 直式排版，包含每日時間軸、Google Maps 座標跳轉、緊急聯絡人。
- 整合 `jspdf` 或 `react-to-print` 提供 PDF 下載。

#### 2. LINE 官方帳號對接
- 建立 LINE Liff 或 Webview 開口，讓外站業務或旅行社可直接在 LINE 錄入需求。

---

### Phase 4：AI 定價邏輯與優化（7-8 週）- **執行工程師任務**
- 串接 Gemini 1.5 Pro API，分析歷史樣本庫，自動產出「成本波動敏感度分析」。
- 根據天數自動過濾「地理合理範圍」。

---

## 開發指令清單 (To-be started by AI Engineer)

1. [ ] **DB Setup**: 執行 `src/lib/schema.sql` (需合併 Phase 1 擴建)。
2. [ ] **Logic Core**: 建立 `src/lib/logic/quote-engine.ts`。
3. [ ] **UI Component**: 開發 `src/components/ActionGuide.tsx`。

## 查核與驗收計畫

### 部署規範
- 部署至 **Cloudflare Pages**。
- 環境變數（Supabase Keys）必須經由 Antigravity 審對後設定。

### 驗收測試
- **壓力測試**：輸入極端人數（1人、50人），檢查交通分攤費是否正確。
- **對比測試**：系統產出的報價必須與「蘇國棟團」手工報價誤差在 1% 以內。

---

## 開放問題
- **PDF 規格**：是否需要支援多國語言（日/繁中對照）？
- **支付串接**：本 MVP 是否需要整合「支付金流」，還是僅止於報價單？
