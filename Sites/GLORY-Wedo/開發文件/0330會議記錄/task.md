# 御之旅 (Royal Journey) 任務執行清單 - 執行工程師專用

> [!NOTE]
> 負責人：執行工程師 (AI Engineer)
> 驗考人：Antigravity (主計畫人)

## Phase 1：資料地基 (Week 1-2) - [x]

- [x] **1.1 資料庫設計與遷移**
    - [x] 擴展 `src/lib/schema.sql` 包含 `golf_courses`, `lodging`, `dining`, `sample_groups` 表。
    - [x] 確保 RLS (Row Level Security) 策略正確設置。
    - [x] 在 Supabase 執行 SQL 更新。

- [x] **1.2 歷史樣本結構化導入**
    - [x] 數位化 4 團樣本資料 (郭銘蹟/馬吉隊/蘇國棟/彥廷)。
    - [x] 建立 `src/lib/seeds/import_samples.ts` 腳本導入樣本。

- [x] **1.3 AI 提示詞工程 (AI Citation Engineering)**
    - [x] 針對手寫單 JPG/PDF 掃描件，設計專屬 Prompt 提取成本與服務明細。

---

## Phase 2：報價引擎實作 (Week 3-4) - [ ]

- [ ] **2.1 交通邏輯模組**
    - [ ] 實現 `get_transport_recommendation(pax, days)` 函數。
- [ ] **2.2 自動化加成邏輯**
    - [ ] 實現 `(Costs * 1.1) + ReferralFee` 計算公式。

---

## Phase 3：交付物生成 (Week 5-6) - [ ]

- [ ] **3.1 單頁行程單組件**
    - [ ] 完成 `OnePageRenderer.tsx` 介面開發。
- [ ] **3.2 PDF 匯出整合**
    - [ ] 串接 `jspdf` 实现 A4 格式匯出。

---

## Phase 4：AI 行程優化 (Week 7-8) - [ ]

- [ ] **4.1 地理範圍過濾器**
    - [ ] 基於「天數」限制活動區域的邏輯實作。
