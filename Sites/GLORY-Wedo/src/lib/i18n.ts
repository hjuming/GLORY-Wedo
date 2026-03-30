/**
 * 御之旅 Phase 7.3 — 輕量 i18n 框架
 * 支援 zh-TW (繁體中文) / ja (日本語)
 * 不依賴 i18next，直接用 Record + Context 實作
 */

export type Locale = 'zh-TW' | 'ja';

export const LOCALE_LABELS: Record<Locale, string> = {
  'zh-TW': '繁體中文',
  'ja': '日本語',
};

// 翻譯字典
const translations: Record<Locale, Record<string, string>> = {
  'zh-TW': {
    // 通用
    'app.name': '御之旅',
    'app.subtitle': 'M.T Tours — 行程規劃及報價系統',
    'app.company': 'NOBLE HOUSE GLORY',
    'app.footer': '御之旅 NOBLE HOUSE GLORY · 御居所 HOUSE HOTEL · 札幌',
    'btn.login': '登入',
    'btn.logout': '登出',
    'btn.download': '下載',
    'btn.generate': '產生',

    // 導航
    'nav.ai_plan': 'AI 行程規劃',
    'nav.action_guide': '落地指南',
    'nav.tasks': '任務管理',
    'nav.calendar': '月曆總覽',
    'nav.itinerary': '行程管理',
    'nav.members': '團員管理',
    'nav.cost': '成本報價',
    'nav.bi': '利潤儀表板',
    'nav.supplier': '供應商 PDF',
    'nav.cleaning': '清潔排程',
    'nav.docs': '文件輸出',
    'nav.settings': '系統設定',

    // ClientPortal
    'portal.itinerary': '行程表',
    'portal.pax': '人',
    'portal.days': '天',
    'portal.day': '第 {n} 天',
    'portal.navigate': '導航',
    'portal.add_calendar': '加入行事曆',
    'portal.realtime_badge': '即時更新',
    'portal.contact_guide': '聯絡領隊',
    'portal.tee_time': '開球時間',
    'portal.duration': '{n} 分鐘',
    'portal.cost_per_pax': '活動費/人',

    // 停留點類型
    'type.transport': '交通',
    'type.dining': '餐食',
    'type.hotel': '住宿',
    'type.sightseeing': '觀光',
    'type.nature': '自然',
    'type.onsen': '溫泉',
    'type.golf': '高爾夫',

    // LINE 通知
    'line.status_confirmed': '行程已確認！',
    'line.status_changed': '行程異動通知',
    'line.view_detail': '查看行程詳情',
  },
  'ja': {
    // 通用
    'app.name': '御之旅',
    'app.subtitle': 'M.T Tours — 旅程プランニング＆見積システム',
    'app.company': 'NOBLE HOUSE GLORY',
    'app.footer': '御之旅 NOBLE HOUSE GLORY · 御居所 HOUSE HOTEL · 札幌',
    'btn.login': 'ログイン',
    'btn.logout': 'ログアウト',
    'btn.download': 'ダウンロード',
    'btn.generate': '生成',

    // 導航
    'nav.ai_plan': 'AI 旅程プラン',
    'nav.action_guide': '現地ガイド',
    'nav.tasks': 'タスク管理',
    'nav.calendar': 'カレンダー',
    'nav.itinerary': '旅程管理',
    'nav.members': 'メンバー管理',
    'nav.cost': 'コスト見積',
    'nav.bi': '利益ダッシュボード',
    'nav.supplier': '業者PDF',
    'nav.cleaning': '清掃スケジュール',
    'nav.docs': '書類出力',
    'nav.settings': 'システム設定',

    // ClientPortal
    'portal.itinerary': '旅程表',
    'portal.pax': '名',
    'portal.days': '日間',
    'portal.day': 'Day {n}',
    'portal.navigate': 'ナビ',
    'portal.add_calendar': 'カレンダーに追加',
    'portal.realtime_badge': 'リアルタイム',
    'portal.contact_guide': 'ガイドに連絡',
    'portal.tee_time': 'ティータイム',
    'portal.duration': '{n} 分',
    'portal.cost_per_pax': '費用/人',

    // 停留點類型
    'type.transport': '交通',
    'type.dining': '食事',
    'type.hotel': '宿泊',
    'type.sightseeing': '観光',
    'type.nature': '自然',
    'type.onsen': '温泉',
    'type.golf': 'ゴルフ',

    // LINE 通知
    'line.status_confirmed': '旅程が確定しました！',
    'line.status_changed': '旅程変更のお知らせ',
    'line.view_detail': '旅程詳細を見る',
  },
};

/**
 * 翻譯函式
 * @param locale 語系
 * @param key 翻譯鍵
 * @param params 插值參數 (e.g. { n: 3 })
 */
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = translations[locale]?.[key] || translations['zh-TW']?.[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

/** 取得語系的所有翻譯 */
export function getTranslations(locale: Locale): Record<string, string> {
  return translations[locale] || translations['zh-TW'];
}
