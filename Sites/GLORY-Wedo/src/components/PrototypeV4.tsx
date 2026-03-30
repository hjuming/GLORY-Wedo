import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import OnePageActionGuide from "./OnePageActionGuide";
import { calculateQuoteV2 } from "@/lib/logic/itinerary-costs";
import { analyzeQuotationAI } from "@/lib/logic/ai-advisor";
import { parseExcelMembers, type ImportResult } from "@/lib/logic/member-import";
import { generateActionGuidePDF } from "@/lib/logic/pdf-generator";
import { useAuth } from "@/lib/useAuth";
import type { Permission } from "@/lib/rbac";
import { generateRoomingListPDF, generateTeeTimeBookingPDF } from "@/lib/logic/supplier-pdf";

// ═══════════════════════════════════════════════════════════
// 御之旅／御居所 旅遊行程規劃及報價系統 v0.4
// 新增：AI 行程規劃模組（對話式 + 行程展示 + 分享）
// ═══════════════════════════════════════════════════════════

// ── Shared Data ──────────────────────────────────────────
const SUPPLIERS = {
  hotels: [
    { id: "h1", name: "御居所 HOUSE HOTEL", city: "札幌", single: 18000, double: 11800, breakfast: 1500 },
    { id: "h2", name: "洞爺湖萬世閣", city: "洞爺湖", single: 23000, double: 23000, breakfast: 0 },
  ],
  golf: [
    { id: "g1", name: "由仁東武 GC", fee: 15000 },
    { id: "g2", name: "Nidom Classic GC", fee: 17000 },
    { id: "g3", name: "一達國際私人 GC", fee: 10000 },
    { id: "g4", name: "桂 GC", fee: 30000 },
    { id: "g5", name: "HANAZONO GC", fee: 15000 },
  ],
  dining: [
    { id: "d1", name: "日式涮涮鍋", price: 8000 },
    { id: "d2", name: "日本和牛燒烤", price: 8000 },
    { id: "d3", name: "活帝王蟹和牛火鍋", price: 15000 },
  ],
  sightseeing: [
    { id: "s1", name: "Golf 5 免稅店" },
    { id: "s2", name: "場外市場（朝市）" },
    { id: "s3", name: "大倉山奧運跳台" },
    { id: "s4", name: "ES CON 棒球場" },
    { id: "s5", name: "狸小路商店街" },
  ],
};

const DEFAULT_ITINERARY = [
  { day: 1, date: "8/2(日)", title: "桃園→新千歲", items: [
    { type: "transport", name: "桃園機場 → 新千歲機場", cost: 0 },
    { type: "sightseeing", name: "Golf 5 免稅店", cost: 0 },
    { type: "dining", name: "日式涮涮鍋", cost: 8000, meal: "晚餐" },
    { type: "hotel", name: "御居所 HOUSE HOTEL", cost: 0 },
  ]},
  { day: 2, date: "8/3(一)", title: "由仁東武高爾夫俱樂部", items: [
    { type: "golf", name: "由仁東武 GC (27洞)", cost: 15000 },
    { type: "dining", name: "日本和牛燒烤", cost: 8000, meal: "晚餐" },
    { type: "hotel", name: "御居所 HOUSE HOTEL", cost: 0 },
  ]},
  { day: 3, date: "8/4(二)", title: "Nidom Classic Golf Club", items: [
    { type: "golf", name: "Nidom Classic GC (45洞)", cost: 17000 },
    { type: "dining", name: "活帝王蟹和牛火鍋", cost: 15000, meal: "晚餐" },
    { type: "hotel", name: "御居所 HOUSE HOTEL", cost: 0 },
  ]},
  { day: 4, date: "8/5(三)", title: "札幌市區一日遊", items: [
    { type: "sightseeing", name: "朝市→大倉山→棒球場→狸小路", cost: 0 },
    { type: "hotel", name: "御居所 HOUSE HOTEL", cost: 0 },
  ]},
  { day: 5, date: "8/6(四)", title: "一達國際私人高爾夫俱樂部", items: [
    { type: "golf", name: "一達國際私人 GC", cost: 10000 },
    { type: "hotel", name: "洞爺湖萬世閣", cost: 0 },
  ]},
  { day: 6, date: "8/7(五)", title: "新千歲→桃園", items: [
    { type: "transport", name: "新千歲機場 → 桃園機場", cost: 0 },
  ]},
];

const DEFAULT_MEMBERS = [
  { id: 1, name: "羅垞玉", nameEn: "LO, KAI-YU", gender: "M", room: "double", diet: "", flight: "長榮 BR116/BR115", handicap: 18 },
  { id: 2, name: "洪素櫻", nameEn: "HUNG, SU-YING", gender: "F", room: "double", diet: "", flight: "長榮 BR116/BR115", handicap: 24 },
  { id: 3, name: "藍宸睿", nameEn: "LAN, CHEN-JUI", gender: "M", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 15 },
  { id: 4, name: "何琬婷", nameEn: "HO, WAN-TING", gender: "F", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 28 },
  { id: 5, name: "廖俊雄", nameEn: "LIAO, CHUN-HSIUNG", gender: "M", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 12 },
  { id: 6, name: "廖苡伶", nameEn: "LIAO, YI-LING", gender: "F", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 30 },
  { id: 7, name: "劉異正", nameEn: "LIOU, YIH-JENQ", gender: "M", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 20 },
  { id: 8, name: "張淑香", nameEn: "CHANG, SHU-HSIANG", gender: "F", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 32 },
  { id: 9, name: "林淵俊", nameEn: "LIN, YUAN-CHUN", gender: "M", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 16 },
  { id: 10, name: "陳寶娟", nameEn: "CHEN, PAO-CHUAN", gender: "F", room: "double", diet: "不吃生食", flight: "華航 CI130/CI131", handicap: 26 },
  { id: 11, name: "林慶安", nameEn: "LIN, CHIN-AN", gender: "M", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 14 },
  { id: 12, name: "蔡秉芸", nameEn: "TSAI, PING-YUN", gender: "F", room: "double", diet: "不吃牛肉、雞鴨鵝", flight: "華航 CI130/CI131", handicap: 22 },
  { id: 13, name: "黃朝泰", nameEn: "HUANG, CHAO-TAI", gender: "M", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 19 },
  { id: 14, name: "蔡佳玲", nameEn: "TSAI, CHIA-LING", gender: "F", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 25 },
  { id: 15, name: "賴宏安", nameEn: "LAI, HUNG-AN", gender: "M", room: "double", diet: "不吃牛肉", flight: "華航 CI130/CI131", handicap: 17 },
  { id: 16, name: "黃祺惠", nameEn: "HUANG, CHI-HUI", gender: "F", room: "double", diet: "", flight: "華航 CI130/CI131", handicap: 29 },
];

const GOKYOSHO_ROOMS = [
  { id: "100", floor: "1F", maxCap: 3 }, { id: "101", floor: "1F", maxCap: 3 },
  { id: "200", floor: "2F", maxCap: 4 }, { id: "201", floor: "2F", maxCap: 2 },
  { id: "202", floor: "2F", maxCap: 2 }, { id: "203", floor: "2F", maxCap: 2 },
  { id: "300", floor: "3F", maxCap: 2 }, { id: "301", floor: "3F", maxCap: 2 },
  { id: "302", floor: "3F", maxCap: 2 }, { id: "303", floor: "3F", maxCap: 2 },
];

const ROOM_BOOKINGS = [
  { id: 1, checkIn: "2026-03-06", checkOut: "2026-03-08", nights: 2, guests: 4, floor: "1F", rooms: { "100": "2人白い布団", "101": "2人白い布団" }, note: "" },
  { id: 2, checkIn: "2026-03-08", checkOut: "2026-03-10", nights: 2, guests: 10, floor: "2F", rooms: { "200": "3人青+1白", "201": "2人", "202": "2人", "203": "2人" }, note: "" },
  { id: 3, checkIn: "2026-03-12", checkOut: "2026-03-18", nights: 6, guests: 10, floor: "2F", rooms: { "200": "3人青+1白", "201": "2人", "202": "2人", "203": "2人" }, note: "退房17→18日" },
  { id: 4, checkIn: "2026-03-13", checkOut: "2026-03-15", nights: 2, guests: 6, floor: "3F", rooms: { "300": "1人", "301": "1人", "302": "2人", "303": "2人" }, note: "" },
  { id: 9, checkIn: "2026-03-21", checkOut: "2026-03-28", nights: 7, guests: 9, floor: "2F", rooms: { "200": "3人青", "201": "2人", "202": "2人", "203": "2人" }, note: "" },
  { id: 10, checkIn: "2026-03-21", checkOut: "2026-03-25", nights: 4, guests: 4, floor: "1F", rooms: { "100": "2人白", "101": "2人白" }, note: "" },
  { id: 11, checkIn: "2026-03-30", checkOut: "2026-04-03", nights: 4, guests: 8, floor: "2F", rooms: { "200": "2人白", "201": "2人", "202": "2人", "203": "2人" }, note: "" },
  { id: 12, checkIn: "2026-04-04", checkOut: "2026-04-09", nights: 5, guests: 4, floor: "1F", rooms: { "100": "2人白", "101": "2人白" }, note: "" },
  { id: 13, checkIn: "2026-04-07", checkOut: "2026-04-12", nights: 5, guests: 8, floor: "2F", rooms: { "200": "2人白", "201": "2人", "202": "2人", "203": "2人" }, note: "" },
  { id: 14, checkIn: "2026-04-18", checkOut: "2026-04-22", nights: 4, guests: 11, floor: "2F", rooms: { "200": "3青+2白", "201": "2人", "202": "2人", "203": "2人" }, note: "" },
  { id: 15, checkIn: "2026-04-25", checkOut: "2026-04-29", nights: 4, guests: 3, floor: "1F", rooms: { "100": "2人白", "101": "1名特殊" }, note: "" },
];

// ── Task Manager Data ────────────────────────────────────
const INITIAL_TASKS = [
  { id: '1-1', cat: '一、台灣端｜業務與對外聯繫', title: '台灣高爾夫練習場拜訪', who: ['Kevin'], status: 'todo', notes: '' },
  { id: '1-2', cat: '一、台灣端｜業務與對外聯繫', title: '台灣企業/公司福委會拜訪', who: ['Kevin'], status: 'todo', notes: '' },
  { id: '1-3', cat: '一、台灣端｜業務與對外聯繫', title: '台灣旅行社拜訪與合作洽談', who: ['Kevin'], status: 'todo', notes: '' },
  { id: '1-4', cat: '一、台灣端｜業務與對外聯繫', title: '台灣直客業務開發', who: ['Kevin'], status: 'todo', notes: '' },
  { id: '1-5', cat: '一、台灣端｜業務與對外聯繫', title: '台灣端行程說明會/簡報安排', who: ['Kevin'], status: 'todo', notes: '' },
  { id: '1-6', cat: '一、台灣端｜業務與對外聯繫', title: '台灣端客戶諮詢回覆 (LINE/電話)', who: ['Kevin'], status: 'todo', notes: '' },
  { id: '1-7', cat: '一、台灣端｜業務與對外聯繫', title: '台灣端報價製作與報價說明', who: ['Kevin', 'May'], status: 'todo', notes: '' },
  { id: '1-8', cat: '一、台灣端｜業務與對外聯繫', title: '台灣端訂單確認與成團通知', who: ['Kevin', 'May'], status: 'todo', notes: '' },
  { id: '1-9', cat: '一、台灣端｜業務與對外聯繫', title: '台灣端客戶資料整理與管理', who: ['Kevin', 'May'], status: 'todo', notes: '' },
  { id: '1-10', cat: '一、台灣端｜業務與對外聯繫', title: '台灣端行程異動/取消溝通', who: ['Kevin', 'May'], status: 'todo', notes: '' },
  { id: '2-1', cat: '二、日本端｜合作開發與關係建立', title: '日本飯店合作洽談', who: ['Lily', 'Vivi'], status: 'todo', notes: '' },
  { id: '2-2', cat: '二、日本端｜合作開發與關係建立', title: '日本餐廳合作洽談', who: ['Lily', 'Vivi'], status: 'todo', notes: '' },
  { id: '2-3', cat: '二、日本端｜合作開發與關係建立', title: '日本高爾夫球場合作洽談', who: ['Lily', 'Vivi', 'Kevin'], status: 'todo', notes: '' },
  { id: '2-4', cat: '二、日本端｜合作開發與關係建立', title: '日本巴士公司長期合作洽談', who: ['Lily', 'Vivi', 'Kevin'], status: 'todo', notes: '' },
  { id: '2-5', cat: '二、日本端｜合作開發與關係建立', title: '日本旅行社/地接公司合作洽談', who: ['Lily', 'Vivi', 'Kevin'], status: 'todo', notes: '' },
  { id: '2-6', cat: '二、日本端｜合作開發與關係建立', title: '日本其他合作資源開發', who: ['Lily', 'Vivi'], status: 'todo', notes: '' },
  { id: '3-1', cat: '三、日本端｜訂位與地面執行', title: '日本巴士公司對接與訂車', who: ['Vivi', 'Yellow'], status: 'todo', notes: '' },
  { id: '3-2', cat: '三、日本端｜訂位與地面執行', title: '日本飯店訂房與房型確認', who: ['Vivi', 'May', 'Yellow'], status: 'todo', notes: '' },
  { id: '3-3', cat: '三、日本端｜訂位與地面執行', title: '日本餐廳訂位與團餐安排', who: ['Vivi', 'Yellow'], status: 'todo', notes: '' },
  { id: '3-4', cat: '三、日本端｜訂位與地面執行', title: '日本高爾夫球場訂場與開球時間', who: ['Kevin'], status: 'todo', notes: '' },
  { id: '3-5', cat: '三、日本端｜訂位與地面執行', title: '日本端行程事前確認', who: ['Vivi', 'Kevin', 'May'], status: 'todo', notes: '' },
  { id: '3-6', cat: '三、日本端｜訂位與地面執行', title: '日本端行程當日聯絡窗口', who: ['Vivi'], status: 'todo', notes: '' },
  { id: '3-7', cat: '三、日本端｜訂位與地面執行', title: '日本端突發狀況處理', who: ['Vivi'], status: 'todo', notes: '' },
  { id: '3-8', cat: '三、日本端｜訂位與地面執行', title: '日本端供應商聯絡紀錄整理', who: ['May'], status: 'todo', notes: '' },
  { id: '3-9', cat: '三、日本端｜訂位與地面執行', title: '日本端行程完成後確認', who: ['May', 'Vivi'], status: 'todo', notes: '' },
  { id: '4-1', cat: '四、內容製作與平台營運', title: '影片拍攝與製作', who: ['Yellow', 'May'], status: 'todo', notes: '' },
  { id: '4-2', cat: '四、內容製作與平台營運', title: '平台內容維護與上架', who: ['May'], status: 'todo', notes: '' },
  { id: '4-3', cat: '四、內容製作與平台營運', title: '平台 Q&A 與客人即時回覆', who: ['Kevin', 'May', 'Vivi', 'Yellow'], status: 'todo', notes: '客服輪值排班？' },
  { id: '5-1', cat: '五、行程規劃與文書製作', title: '高爾夫行程規劃', who: ['Kevin'], status: 'todo', notes: '' },
  { id: '5-2', cat: '五、行程規劃與文書製作', title: '一般旅遊行程規劃', who: ['Kevin', 'May', 'Vivi', 'Yellow'], status: 'todo', notes: '' },
  { id: '5-3', cat: '五、行程規劃與文書製作', title: '行程細節編排與調整', who: ['Kevin', 'May', 'Vivi', 'Yellow'], status: 'todo', notes: '' },
  { id: '5-4', cat: '五、行程規劃與文書製作', title: '行程文字整理與內部確認文件', who: ['Vivi', 'May'], status: 'todo', notes: '' },
  { id: '6-1', cat: '六、金流與帳務', title: '公司金流與帳務處理', who: ['Vivi'], status: 'todo', notes: '' },
];
const TEAM = ['Lily', 'Vivi', 'Yellow', 'May', 'Kevin'];
const TASK_CATS = [...new Set(INITIAL_TASKS.map(t => t.cat))];
const STATUS_MAP = {
  todo: { label: '未開始', color: '#94a3b8', bg: '#f1f5f9', next: 'in_progress' },
  in_progress: { label: '進行中', color: '#2563eb', bg: '#eff6ff', next: 'done' },
  done: { label: '已完成', color: '#16a34a', bg: '#f0fdf4', next: 'todo' },
};
const MEMBER_COLORS = { Lily: '#ec4899', Vivi: '#8b5cf6', Yellow: '#f59e0b', May: '#16a34a', Kevin: '#2563eb' };

const TYPE_CONFIG = {
  golf: { color: "#16a34a", bg: "#f0fdf4", icon: "⛳", label: "高爾夫" },
  dining: { color: "#ea580c", bg: "#fff7ed", icon: "🍽", label: "餐食" },
  transport: { color: "#2563eb", bg: "#eff6ff", icon: "🚌", label: "交通" },
  hotel: { color: "#7c3aed", bg: "#f5f3ff", icon: "🏨", label: "住宿" },
  sightseeing: { color: "#ca8a04", bg: "#fefce8", icon: "🏔", label: "觀光" },
  nature: { color: "#0d9488", bg: "#f0fdfa", icon: "🌿", label: "自然" },
  onsen: { color: "#3b82f6", bg: "#eff6ff", icon: "♨️", label: "溫泉" },
};
const fmt = (n: number) => `¥${n.toLocaleString()}`;
const fmtTWD = (n: number) => `NT$${Math.round(n).toLocaleString()}`;
const floorColors = { "1F": "#3b82f6", "2F": "#8b5cf6", "3F": "#f59e0b" };

// ── Styles ───────────────────────────────────────────────
const S = {
  app: { display: "flex", height: "100vh", fontFamily: "'Noto Sans TC','Hiragino Sans',sans-serif", background: "#f1f5f9", color: "#1e293b", fontSize: 13 },
  sidebar: { width: 210, background: "linear-gradient(195deg,#0f172a,#1e3a5f)", color: "#e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0 },
  navItem: (a) => ({ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, background: a?"rgba(255,255,255,0.12)":"transparent", borderLeft: a?"3px solid #60a5fa":"3px solid transparent", color: a?"#fff":"#94a3b8", fontSize: 12, fontWeight: a?600:400, transition: "all 0.15s" }),
  card: { background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 18, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 },
  badge: (c) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: c+"18", color: c }),
  btn: (v="primary") => ({ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: v==="primary"?"#2563eb":v==="danger"?"#ef4444":v==="ai"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#f1f5f9", color: v==="primary"||v==="danger"||v==="ai"?"#fff":"#475569" }),
  input: { padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, outline: "none", width: "100%" },
  select: { padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, outline: "none", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", padding: "7px 9px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0", fontWeight: 600, color: "#475569", fontSize: 11 },
  td: { padding: "7px 9px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
  tag: (c) => ({ display: "inline-block", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: c+"15", color: c, marginRight: 4 }),
};

// ── Shared Components ────────────────────────────────────
function StatBox({ icon, label, value, sub, accent }) {
  return <div style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", flex: 1, minWidth: 140 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}><span style={{ fontSize: 17 }}>{icon}</span><span style={{ fontSize: 11, color: "#64748b" }}>{label}</span></div>
    <div style={{ fontSize: 19, fontWeight: 800, color: accent||"#0f172a" }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
  </div>;
}

// ══════════════════════════════════════════════════════════
// AI ITINERARY PLANNING MODULE (NEW in v0.4)
// ══════════════════════════════════════════════════════════

// 預設北海道行程（由本次對話規劃產生）
const AI_HOKKAIDO_ITINERARY = {
  id: "hkd-2026-summer",
  title: "北海道夏季自駕遊",
  subtitle: "六天五夜 · 6人 · 夏季 · 自駕",
  destination: "北海道",
  totalDays: 6,
  pax: 6,
  season: "夏季（6–8月）",
  transport: "自駕",
  hotel: "札幌御居所 HOUSE HOTEL",
  tags: ["自然景觀", "海鮮美食", "溫泉", "薰衣草"],
  shareToken: "hkd-abc123",
  createdAt: "2026-03-27",
  days: [
    {
      day: 1, title: "抵達札幌 · 市區美食探索",
      route: "新千歲機場 → 二條市場 → 札幌御居所 → 薄野",
      stops: [
        { type: "transport", name: "新千歲機場租車出發", desc: "建議租 1 輛 7 人座廂型車（Toyota Alphard/Hiace）", duration: 30, cost: 0 },
        { type: "dining", name: "二條市場早午餐", desc: "海鮮丼、海膽、螃蟹，早上 7 點開門", duration: 60, cost: 3000 },
        { type: "hotel", name: "辦理入住 — 札幌御居所", desc: "寬敞獨棟、附停車場，六人住超舒適", duration: 30, cost: 0 },
        { type: "sightseeing", name: "大通公園 · 狸小路商店街", desc: "下午輕鬆逛街、採買伴手禮", duration: 120, cost: 0 },
        { type: "dining", name: "薄野味噌拉麵 + 居酒屋", desc: "Kifuh Susukino（11AM–凌晨 5AM），Sapporo 啤酒配居酒屋", duration: 120, cost: 3000 },
      ]
    },
    {
      day: 2, title: "小樽 · 海港美食之旅",
      route: "札幌 → 小樽（40 分）→ 回札幌",
      stops: [
        { type: "transport", name: "自駕前往小樽", desc: "車程約 40 分鐘，沿途高速公路", duration: 40, cost: 0 },
        { type: "dining", name: "三角市場海鮮早餐", desc: "比二條更在地、人潮少，性價比高，現烤海鮮定食", duration: 60, cost: 2500 },
        { type: "sightseeing", name: "小樽運河 · 玻璃工藝街", desc: "運河沿岸石造倉庫拍照，堺町通逛老街，試吃北菓樓甜點", duration: 120, cost: 0 },
        { type: "dining", name: "Donbei 小樽運河店午餐", desc: "海鮮丼，uni + toro 組合，2 點後人潮少", duration: 60, cost: 3500 },
        { type: "dining", name: "回札幌 · 螃蟹市場晚餐", desc: "Sapporo Crab Market，毛蟹 + 帝王蟹大吃一頓", duration: 120, cost: 8000 },
      ]
    },
    {
      day: 3, title: "洞爺湖 · 登別溫泉",
      route: "札幌 → 洞爺湖（1.5h）→ 登別（30min）→ 回札幌（1.5h）",
      stops: [
        { type: "nature", name: "洞爺湖環湖兜風", desc: "北海道三大絕景，UNESCO 地質公園，繞湖一圈約 1 小時", duration: 90, cost: 0 },
        { type: "dining", name: "洞爺湖畔午餐", desc: "湖邊餐廳，北海道和牛漢堡排 + 牛乳布丁", duration: 60, cost: 2500 },
        { type: "nature", name: "登別地獄谷", desc: "火山噴氣地形超壯觀，硫磺味十足，走完地獄谷後在溫泉街泡足湯", duration: 90, cost: 0 },
        { type: "onsen", name: "登別溫泉大澡堂", desc: "露天風呂，六個男生一起泡夏天夜間溫泉最爽", duration: 90, cost: 1200 },
      ]
    },
    {
      day: 4, title: "富良野 · 薰衣草花田",
      route: "札幌 → 富良野（2h）→ 美瑛 → 回札幌",
      stops: [
        { type: "nature", name: "Farm Tomita 富田農場", desc: "7 月花況最盛，免費入場，薰衣草霜淇淋必吃！早上去人少光線美", duration: 90, cost: 500 },
        { type: "nature", name: "北星山薰衣草花園", desc: "搭纜椅俯瞰花田全景，與 Farm Tomita 風格互補", duration: 60, cost: 700 },
        { type: "nature", name: "美瑛 — 青池（白金青池）", desc: "神秘土耳其藍色池水，枯木倒影，北海道必打卡絕景", duration: 40, cost: 200 },
        { type: "sightseeing", name: "美瑛丘陵兜風路線", desc: "「拼布之路」與「全景之路」，如法國鄉村風景", duration: 60, cost: 0 },
        { type: "dining", name: "回札幌 · 成吉思汗烤羊肉", desc: "Sapporo Beer Garden，北海道必吃！啤酒 + 烤羊肉最對味", duration: 120, cost: 4000 },
      ]
    },
    {
      day: 5, title: "支笏湖 · 悠哉半日遊",
      route: "札幌 → 支笏湖（1h）→ 回札幌",
      stops: [
        { type: "nature", name: "支笏湖水上活動", desc: "日本透明度最高湖泊之一，租獨木舟或透明船底遊湖", duration: 120, cost: 3000 },
        { type: "sightseeing", name: "回札幌 · 最後採購", desc: "AEON、DONKI 唐吉訶德，北海道乳製品、白色戀人大量掃貨", duration: 90, cost: 0 },
        { type: "dining", name: "告別晚餐 — 海鮮壽司割烹", desc: "薄野高級壽司，六人豪華告別餐，需提前訂位", duration: 120, cost: 6000 },
        { type: "sightseeing", name: "薄野 Craft Beer Bar 夜間收尾", desc: "最後一夜，威士忌吧，喝到盡興", duration: 120, cost: 2000 },
      ]
    },
    {
      day: 6, title: "退房 · 返程",
      route: "札幌御居所 → 新千歲機場",
      stops: [
        { type: "dining", name: "最後早餐 — 二條市場", desc: "再吃一次海鮮丼，結束美食之旅", duration: 60, cost: 2500 },
        { type: "transport", name: "退房 · 還車 · 飛回台灣", desc: "新千歲機場內美食街，飛機前繼續吃", duration: 60, cost: 0 },
      ]
    },
  ]
};

// AI 對話問答流程
const AI_QUESTIONS = [
  {
    id: "destination", question: "請問您想前往哪個目的地？",
    options: ["北海道", "沖繩", "東京近郊", "九州", "京都 / 大阪", "自訂輸入"]
  },
  {
    id: "duration", question: "預計幾天幾夜的行程？",
    options: ["3天2夜", "4天3夜", "5天4夜", "6天5夜", "7天6夜", "自訂"]
  },
  {
    id: "pax", question: "共有幾位旅客？",
    options: ["2人（情侶/夫妻）", "3–4人（家庭/小團）", "5–6人（好友團）", "7–10人（大團）", "10人以上"]
  },
  {
    id: "vibe", question: "這趟旅行的主題偏好？（可多選）",
    options: ["海鮮美食", "自然景觀", "溫泉體驗", "高爾夫", "文化歷史", "購物"], multi: true
  },
  {
    id: "season", question: "預計出發季節？",
    options: ["春季（3–5月）", "夏季（6–8月）", "秋季（9–11月）", "冬季（12–2月）"]
  },
  {
    id: "pace", question: "行程節奏偏好？",
    options: ["輕鬆悠哉（多休息）", "均衡（走動適中）", "行程滿滿（每天多景點）"]
  },
];

const STOP_TYPE_CONFIG = {
  transport: { color: "#2563eb", icon: "🚗", label: "交通" },
  dining: { color: "#ea580c", icon: "🍽", label: "餐食" },
  hotel: { color: "#7c3aed", icon: "🏨", label: "住宿" },
  sightseeing: { color: "#ca8a04", icon: "🗺", label: "觀光" },
  nature: { color: "#0d9488", icon: "🌿", label: "自然" },
  onsen: { color: "#3b82f6", icon: "♨️", label: "溫泉" },
  golf: { color: "#16a34a", icon: "⛳", label: "高爾夫" },
};

export function AIItineraryModule() {
  const [view, setView] = useState("chat"); // "chat" | "result" | "drafts"
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [drafts, setDrafts] = useState([AI_HOKKAIDO_ITINERARY]);
  const [shareMsg, setShareMsg] = useState("");
  const chatRef = useRef(null);

  const currentQ = AI_QUESTIONS[step];
  const isMulti = currentQ?.multi;
  const progress = Math.round((step / AI_QUESTIONS.length) * 100);

  const handleSelect = (opt) => {
    if (isMulti) {
      setSelected(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
    } else {
      const newAnswers = { ...answers, [currentQ.id]: opt };
      setAnswers(newAnswers);
      if (step < AI_QUESTIONS.length - 1) {
        setTimeout(() => setStep(s => s + 1), 300);
      } else {
        handleGenerate(newAnswers);
      }
    }
  };

  const handleMultiNext = () => {
    if (selected.length === 0) return;
    const newAnswers = { ...answers, [currentQ.id]: selected.join("、") };
    setAnswers(newAnswers);
    setSelected([]);
    if (step < AI_QUESTIONS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleGenerate(newAnswers);
    }
  };

  const handleGenerate = async (ans) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: ans }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedPlan(data.itinerary);
        setView("result");
        // 自動寫入 Supabase 草稿
        try {
          const plan = data.itinerary;
          const saveRes = await fetch("/api/trips", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: plan.title,
              destination: plan.destination,
              days_json: plan,
              tags: plan.tags,
              share_token: plan.shareToken,
            }),
          });
          const saveData = await saveRes.json();
          if (!saveData.success) {
            console.error("草稿儲存失敗:", saveData.error);
          }
        } catch (saveErr) {
          console.error("草稿儲存錯誤:", saveErr);
        }
      } else {
        setShareMsg("行程生成失敗，請重試");
        setTimeout(() => setShareMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
      setShareMsg("網路錯誤，請檢查連線");
      setTimeout(() => setShareMsg(""), 3000);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (generatedPlan && !drafts.find(d => d.id === generatedPlan.id)) {
      setDrafts(prev => [generatedPlan, ...prev]);
    }
    // 寫入 Supabase（upsert：share_token 相同則更新）
    if (generatedPlan) {
      try {
        const res = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: generatedPlan.title,
            destination: generatedPlan.destination,
            days_json: generatedPlan,
            tags: generatedPlan.tags,
            share_token: generatedPlan.shareToken,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShareMsg("行程草稿已儲存！");
        } else {
          setShareMsg("儲存失敗：" + (data.error || "未知錯誤"));
        }
      } catch (err) {
        console.error("儲存草稿錯誤:", err);
        setShareMsg("儲存失敗，請檢查連線");
      }
    } else {
      setShareMsg("行程草稿已儲存！");
    }
    setTimeout(() => setShareMsg(""), 2500);
  };

  const handleReset = () => {
    setStep(0); setAnswers({}); setSelected([]);
    setGenerating(false); setGeneratedPlan(null); setView("chat");
  };

  const totalCost = (plan) => plan.days.reduce((s, d) => s + d.stops.reduce((ss, st) => ss + (st.cost || 0), 0), 0);

  // ── Chat View ──
  if (view === "chat") return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ ...S.card, background: "linear-gradient(135deg,#1e3a5f,#6366f1)", color: "#fff", padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>✨ AI 行程規劃師</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>回答幾個問題，為您量身打造專屬行程</div>
          </div>
          <button onClick={() => setView("drafts")} style={{ ...S.btn("ghost"), fontSize: 11, background: "rgba(255,255,255,0.15)", color: "#fff", border: "none" }}>
            📋 已儲存行程 ({drafts.length})
          </button>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
            <span>問題 {step + 1} / {AI_QUESTIONS.length}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#60a5fa", borderRadius: 2, transition: "width 0.4s" }} />
          </div>
        </div>
      </div>

      {generating ? (
        <div style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f", marginBottom: 8 }}>AI 正在規劃您的行程...</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 24 }}>根據您的偏好，分析最佳景點組合與路線</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: "#6366f1", animation: `pulse 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
        </div>
      ) : (
        <div style={S.card}>
          {/* AI bubble */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✨</div>
            <div style={{ background: "#f1f5f9", borderRadius: "4px 12px 12px 12px", padding: "12px 16px", maxWidth: "80%" }}>
              <div style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6 }}>{currentQ?.question}</div>
            </div>
          </div>

          {/* Answer history */}
          {Object.entries(answers).map(([qid, ans]) => {
            const q = AI_QUESTIONS.find(q => q.id === qid);
            return (
              <div key={qid} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✨</div>
                  <div style={{ background: "#f1f5f9", borderRadius: "4px 12px 12px 12px", padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, color: "#475569" }}>{q?.question}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: "#1e3a5f", color: "#fff", borderRadius: "12px 12px 4px 12px", padding: "8px 14px", fontSize: 12, fontWeight: 600 }}>{ans}</div>
                </div>
              </div>
            );
          })}

          {/* Options */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {currentQ?.options.map(opt => {
              const isSel = isMulti && selected.includes(opt);
              return (
                <button key={opt} onClick={() => handleSelect(opt)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${isSel ? "#6366f1" : "#e2e8f0"}`, background: isSel ? "#eef2ff" : "#fff", color: isSel ? "#4f46e5" : "#475569", fontSize: 12, fontWeight: isSel ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                  {isSel ? "✓ " : ""}{opt}
                </button>
              );
            })}
          </div>
          {isMulti && selected.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleMultiNext} style={S.btn("primary")}>確認選擇 →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Result View ──
  if (view === "result" && generatedPlan) {
    const plan = generatedPlan;
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Result header */}
        <div style={{ ...S.card, background: "linear-gradient(135deg,#0f172a,#1e3a5f)", color: "#fff", padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>✨ AI 行程規劃完成</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{plan.title}</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{plan.subtitle}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {plan.tags.map(t => <span key={t} style={{ padding: "2px 10px", borderRadius: 99, background: "rgba(255,255,255,0.15)", fontSize: 11 }}>{t}</span>)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, opacity: 0.6 }}>活動費合計/人</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa" }}>¥{totalCost(plan).toLocaleString()}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={handleSaveDraft} style={{ ...S.btn("ghost"), background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", fontSize: 11 }}>
              💾 儲存草稿
            </button>
            <button onClick={() => {
              const token = plan.shareToken || plan.share_token || "";
              const url = `${window.location.origin}/share/${token}`;
              navigator.clipboard.writeText(url).then(() => {
                setShareMsg("分享連結已複製！" + url);
              }).catch(() => {
                setShareMsg("分享連結：" + url);
              });
              setTimeout(() => setShareMsg(""), 3000);
            }}
              style={{ ...S.btn("ghost"), background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", fontSize: 11 }}>
              🔗 複製分享連結
            </button>
            <button onClick={() => { setShareMsg("PDF 準備中…"); setTimeout(() => setShareMsg(""), 2000); }}
              style={{ ...S.btn("ghost"), background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", fontSize: 11 }}>
              📄 匯出 PDF
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={handleReset} style={{ ...S.btn("ghost"), background: "rgba(255,255,255,0.1)", color: "#94a3b8", border: "none", fontSize: 11 }}>
              重新規劃
            </button>
          </div>
          {shareMsg && <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(99,102,241,0.3)", borderRadius: 6, fontSize: 12, color: "#c7d2fe" }}>{shareMsg}</div>}
        </div>

        {/* Day cards */}
        {plan.days.map(day => {
          const isOpen = expandedDay === day.day;
          const dayCost = day.stops.reduce((s, st) => s + (st.cost || 0), 0);
          return (
            <div key={day.day} style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 10 }}>
              <div onClick={() => setExpandedDay(isOpen ? null : day.day)}
                style={{ padding: "12px 18px", background: isOpen ? "linear-gradient(90deg,#0f172a,#1e3a5f)" : "#f8fafc", color: isOpen ? "#fff" : "#0f172a", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: isOpen ? "rgba(255,255,255,0.2)" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: isOpen ? "#fff" : "#475569" }}>
                    D{day.day}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{day.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{day.route}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {dayCost > 0 && <span style={{ fontSize: 11, color: isOpen ? "#93c5fd" : "#64748b", fontWeight: 600 }}>¥{dayCost.toLocaleString()}/人</span>}
                  <span style={{ fontSize: 10, opacity: 0.5 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: "8px 14px 12px" }}>
                  {day.stops.map((stop, i) => {
                    const tc = STOP_TYPE_CONFIG[stop.type] || STOP_TYPE_CONFIG.sightseeing;
                    return (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 4, background: tc.color + "08", borderLeft: `3px solid ${tc.color}`, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 16, marginTop: 1 }}>{tc.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 600, fontSize: 12, color: "#0f172a" }}>{stop.name}</span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {stop.duration > 0 && <span style={{ fontSize: 10, color: "#94a3b8" }}>⏱ {stop.duration}分</span>}
                              {stop.cost > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: tc.color }}>¥{stop.cost.toLocaleString()}</span>}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 1.5 }}>{stop.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Convert to quote CTA */}
        <div style={{ ...S.card, background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0", padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#15803d" }}>🎉 行程規劃完成！</div>
              <div style={{ fontSize: 11, color: "#166534", marginTop: 2 }}>將此行程轉為正式報價單，或儲存至行程草稿庫</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSaveDraft} style={{ ...S.btn("primary"), background: "#16a34a", fontSize: 12 }}>💾 儲存草稿</button>
              <button style={{ ...S.btn("primary"), background: "#1e3a5f", fontSize: 12 }}>💰 轉為報價單</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Drafts View ──
  if (view === "drafts") return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>📋 行程草稿庫</div>
        <button onClick={() => { handleReset(); setView("chat"); }} style={{ ...S.btn("ai"), fontSize: 12 }}>✨ 新增 AI 行程</button>
      </div>
      {drafts.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: 40, color: "#94a3b8" }}>尚無儲存的行程草稿</div>
      )}
      {drafts.map(plan => (
        <div key={plan.id} style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "14px 18px", background: "linear-gradient(90deg,#0f172a,#1e3a5f)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{plan.title}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{plan.subtitle}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {plan.tags.map(t => <span key={t} style={{ padding: "1px 8px", borderRadius: 99, background: "rgba(255,255,255,0.15)", fontSize: 10 }}>{t}</span>)}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 10, opacity: 0.6 }}>建立日期</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>{plan.createdAt}</div>
              <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, marginTop: 4 }}>¥{totalCost(plan).toLocaleString()}/人</div>
            </div>
          </div>
          <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#64748b" }}>
              <span>📅 {plan.totalDays}天{plan.totalDays-1}夜</span>
              <span>👥 {plan.pax}人</span>
              <span>🚗 {plan.transport}</span>
              <span>🏨 {plan.hotel}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setGeneratedPlan(plan); setView("result"); }} style={{ ...S.btn("primary"), fontSize: 11, padding: "5px 12px" }}>查看行程</button>
              <button style={{ ...S.btn("ghost"), fontSize: 11, padding: "5px 12px", color: "#16a34a" }}>轉報價</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return null;
}

// ══════════════════════════════════════════════════════════
// TASK MANAGER MODULE (v0.3 unchanged)
// ══════════════════════════════════════════════════════════
function TaskModule() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [filterMember, setFilterMember] = useState('All');
  const [filterCat, setFilterCat] = useState('All');
  const [expanded, setExpanded] = useState(() => TASK_CATS.reduce((a, c) => ({ ...a, [c]: true }), {}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get('mt-tasks', true);
        if (result && result.value) {
          const saved = JSON.parse(result.value);
          if (Array.isArray(saved) && saved.length > 0) setTasks(saved);
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const saveToCloud = useCallback(async (data) => {
    setSaving(true);
    try {
      await window.storage.set('mt-tasks', JSON.stringify(data), true);
      setLastSaved(new Date().toLocaleTimeString('zh-TW'));
    } catch (e) { console.error('Save failed:', e); }
    setSaving(false);
  }, []);

  const updateTasks = useCallback((updater) => {
    setTasks(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveToCloud(next), 800);
      return next;
    });
  }, [saveToCloud]);

  const toggleStatus = (id) => updateTasks(prev => prev.map(t => t.id === id ? { ...t, status: STATUS_MAP[t.status].next } : t));
  const updateNotes = (id, notes) => updateTasks(prev => prev.map(t => t.id === id ? { ...t, notes } : t));

  const stats = useMemo(() => {
    const total = tasks.length, done = tasks.filter(t => t.status === 'done').length, ip = tasks.filter(t => t.status === 'in_progress').length;
    return { total, done, ip, todo: total - done - ip, pct: total ? Math.round(done / total * 100) : 0 };
  }, [tasks]);

  const filtered = useMemo(() => tasks.filter(t =>
    (filterMember === 'All' || t.who.includes(filterMember)) &&
    (filterCat === 'All' || t.cat === filterCat)
  ), [tasks, filterMember, filterCat]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(t => { if (!g[t.cat]) g[t.cat] = []; g[t.cat].push(t); });
    return g;
  }, [filtered]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>載入中...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <StatBox icon="📋" label="總任務" value={stats.total} accent="#0f172a" />
        <StatBox icon="⏳" label="未開始" value={stats.todo} accent="#94a3b8" />
        <StatBox icon="🔵" label="進行中" value={stats.ip} accent="#2563eb" />
        <StatBox icon="✅" label="已完成" value={stats.done} accent="#16a34a" />
        <div style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>整體進度</div>
          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${stats.pct}%`, background: "linear-gradient(90deg,#2563eb,#16a34a)", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{stats.pct}%</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 11, color: "#94a3b8" }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: saving ? "#f59e0b" : "#16a34a" }} />
        {saving ? "儲存中..." : lastSaved ? `已雲端同步 ${lastSaved}` : "雲端同步已啟用（所有裝置即時共享）"}
        <button onClick={() => saveToCloud(tasks)} style={{ ...S.btn("ghost"), fontSize: 11, padding: "3px 10px" }}>手動同步</button>
        <button onClick={() => { if(confirm("確定要重置所有任務狀態？")) { updateTasks(INITIAL_TASKS); }}} style={{ ...S.btn("ghost"), fontSize: 11, padding: "3px 10px", color: "#ef4444" }}>重置</button>
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ ...S.card, position: "sticky", top: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, letterSpacing: 1 }}>依負責人</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div onClick={() => setFilterMember('All')} style={{ padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: filterMember==='All'?700:400, background: filterMember==='All'?"#0f172a":"transparent", color: filterMember==='All'?"#fff":"#475569" }}>全部成員</div>
              {TEAM.map(m => {
                const cnt = tasks.filter(t => t.who.includes(m)).length;
                const doneCnt = tasks.filter(t => t.who.includes(m) && t.status === 'done').length;
                return <div key={m} onClick={() => setFilterMember(m)} style={{ padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: filterMember===m?700:400, background: filterMember===m?MEMBER_COLORS[m]+"15":"transparent", color: filterMember===m?MEMBER_COLORS[m]:"#475569", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: filterMember===m?`3px solid ${MEMBER_COLORS[m]}`:"3px solid transparent" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 11, background: MEMBER_COLORS[m]+"20", color: MEMBER_COLORS[m], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{m[0]}</span>
                    {m}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{doneCnt}/{cnt}</span>
                </div>;
              })}
            </div>
            <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>依階段</div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={S.select}>
              <option value="All">全部階段</option>
              {TASK_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {Object.keys(grouped).length === 0 && <div style={{ ...S.card, textAlign: "center", color: "#94a3b8", padding: 40 }}>沒有符合的任務，請調整篩選條件</div>}
          {Object.entries(grouped).map(([cat, catTasks]) => (
            <div key={cat} style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 12 }}>
              <div onClick={() => setExpanded(p => ({ ...p, [cat]: !p[cat] }))} style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{expanded[cat] ? "▼" : "▶"}</span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{cat}</span>
                  <span style={{ ...S.badge("#64748b"), fontSize: 10 }}>{catTasks.length}</span>
                </div>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{catTasks.filter(t => t.status === 'done').length}/{catTasks.length} 完成</span>
              </div>
              {expanded[cat] && <div>
                {catTasks.map(task => {
                  const st = STATUS_MAP[task.status];
                  const isDone = task.status === 'done';
                  return <div key={task.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", opacity: isDone ? 0.65 : 1 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <button onClick={() => toggleStatus(task.id)} style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.color}40`, background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        {task.status === 'todo' ? '○' : task.status === 'in_progress' ? '◐' : '●'} {st.label}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, textDecoration: isDone ? "line-through" : "none", color: isDone ? "#94a3b8" : "#0f172a" }}>
                            <span style={{ color: "#94a3b8", marginRight: 4, fontSize: 11 }}>{task.id}</span>{task.title}
                          </span>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {task.who.map(w => <span key={w} style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: MEMBER_COLORS[w] + "15", color: MEMBER_COLORS[w] }}>{w}</span>)}
                          </div>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <input type="text" placeholder="新增進度備註..." value={task.notes} onChange={e => updateNotes(task.id, e.target.value)}
                            style={{ ...S.input, fontSize: 11, padding: "5px 10px", background: task.notes ? "#fffbeb" : "#f8fafc", borderColor: task.notes ? "#fbbf24" : "#e2e8f0" }} />
                        </div>
                      </div>
                    </div>
                  </div>;
                })}
              </div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OTHER MODULES (unchanged from v0.3)
// ══════════════════════════════════════════════════════════
function ItineraryModule() {
  const [days, setDays] = useState(DEFAULT_ITINERARY);
  const handleMove = useCallback((dn, idx, dir) => { setDays(p => p.map(d => { if (d.day!==dn) return d; const it=[...d.items]; const ni=idx+dir; if(ni<0||ni>=it.length) return d; [it[idx],it[ni]]=[it[ni],it[idx]]; return{...d,items:it}; })); }, []);
  const total = days.reduce((s,d)=>s+d.items.reduce((ss,i)=>ss+(i.cost||0),0),0);
  return <div>
    {days.map(day=><div key={day.day} style={{...S.card,padding:0,overflow:"hidden"}}>
      <div style={{padding:"9px 14px",background:"linear-gradient(90deg,#0f172a,#1e3a5f)",color:"#fff",display:"flex",justifyContent:"space-between"}}><span><strong>Day {day.day}</strong> <span style={{opacity:0.7,marginLeft:6}}>{day.date} {day.title}</span></span><span style={{fontSize:12,color:"#93c5fd",fontWeight:600}}>{fmt(day.items.reduce((s,i)=>s+(i.cost||0),0))}/人</span></div>
      <div style={{padding:"5px 10px"}}>{day.items.map((item,idx)=>{const c=TYPE_CONFIG[item.type]||TYPE_CONFIG.sightseeing;return<div key={idx} style={{display:"flex",alignItems:"center",padding:"4px 7px",borderRadius:6,marginBottom:2,background:c.bg,borderLeft:`3px solid ${c.color}`,gap:7,fontSize:12}}><span>{c.icon}</span><span style={{flex:1,fontWeight:500}}>{item.name}</span>{item.meal&&<span style={S.tag(c.color)}>{item.meal}</span>}{item.cost>0&&<span style={{fontSize:11,fontWeight:600,color:c.color}}>{fmt(item.cost)}</span>}<span style={{cursor:"pointer",opacity:0.3,fontSize:11}} onClick={()=>handleMove(day.day,idx,-1)}>▲</span><span style={{cursor:"pointer",opacity:0.3,fontSize:11}} onClick={()=>handleMove(day.day,idx,1)}>▼</span></div>})}</div>
    </div>)}
    <div style={{position:"sticky",bottom:0,background:"linear-gradient(90deg,#0f172a,#1e3a5f)",borderRadius:10,padding:"9px 18px",display:"flex",justifyContent:"space-between",color:"#fff"}}><span style={{fontSize:12}}>活動費小計/人</span><span style={{fontSize:17,fontWeight:800}}>{fmt(total)}</span></div>
  </div>;
}

function MembersModule() {
  const [members, setMembers] = useState(DEFAULT_MEMBERS as any[]);
  const [sub, setSub] = useState("list");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelMembers(buffer);
      setImportResult(result);
      if (result.members.length > 0) {
        setMembers(result.members);
        setSub("import");
      }
    } catch (err) {
      setImportResult({ members: [], rooms: [], errors: ['檔案解析失敗，請確認為 xlsx 或 csv 格式'], stats: { total: 0, male: 0, female: 0, singleRooms: 0, doubleRooms: 0, dietaryNotes: 0 } });
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const rooms = useMemo(()=>{
    if (importResult?.rooms?.length) return importResult.rooms.map(r => ({ no: r.roomNo, type: r.type, guests: r.guests }));
    const p: any[] = [], d = members.filter((m: any) => m.room === "double");
    for (let i = 0; i < d.length; i += 2) if (d[i + 1]) p.push({ type: "兩人房", guests: [d[i], d[i + 1]], no: 200 + Math.floor(i / 2) + 15 });
    return p;
  }, [members, importResult]);

  const groups = useMemo(()=>{ const s=[...members].sort((a: any, b: any)=>(a.handicap||0)-(b.handicap||0)),g: any[]=[]; for(let i=0;i<s.length;i+=4) g.push({id:g.length+1,course:g.length<Math.ceil(s.length/8)?"OUT":"IN",players:s.slice(i,i+4)}); return g; },[members]);

  return <div>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
      {[["list","👥","團員"],["rooming","🏨","分房"],["golf","⛳","分組"]].map(([k,ic,lb])=><button key={k} onClick={()=>setSub(k as string)} style={{...S.btn(sub===k?"primary":"ghost")}}>{ic} {lb}</button>)}
      {importResult && <button onClick={()=>setSub("import")} style={{...S.btn(sub==="import"?"primary":"ghost")}}>📊 匯入結果</button>}
      <div style={{flex:1}}/>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{display:"none"}} />
      <button onClick={()=>fileRef.current?.click()} style={{...S.btn("ai"),opacity:importing?0.6:1}} disabled={importing}>
        {importing ? "⏳ 解析中..." : "📂 匯入 Excel/CSV"}
      </button>
      <span style={S.badge("#2563eb")}>共{members.length}人</span>
    </div>

    {/* Import Result Panel */}
    {sub==="import" && importResult && <div>
      {importResult.errors.length > 0 && <div style={{...S.card, background:"#fef2f2", border:"1px solid #fecaca"}}>
        <div style={{...S.cardTitle, color:"#991b1b"}}>⚠️ 匯入警告</div>
        {importResult.errors.map((err, i) => <div key={i} style={{fontSize:11,color:"#991b1b",marginBottom:2}}>• {err}</div>)}
      </div>}
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <StatBox icon="👥" label="總人數" value={importResult.stats.total} accent="#2563eb" />
        <StatBox icon="👨" label="男性" value={importResult.stats.male} accent="#2563eb" />
        <StatBox icon="👩" label="女性" value={importResult.stats.female} accent="#ec4899" />
        <StatBox icon="🏨" label="雙人房" value={importResult.stats.doubleRooms} accent="#7c3aed" />
        <StatBox icon="🔑" label="單人房" value={importResult.stats.singleRooms} accent="#ea580c" />
        <StatBox icon="🍽" label="飲食備註" value={importResult.stats.dietaryNotes} accent="#16a34a" />
      </div>
      <div style={{...S.card, background:"#f0fdf4", border:"1px solid #bbf7d0"}}>
        <div style={{...S.cardTitle, color:"#166534"}}>✅ 成功匯入 {importResult.stats.total} 人，自動分配 {importResult.rooms.length} 間房</div>
        <div style={{fontSize:11,color:"#166534"}}>系統已根據性別與航班自動配對雙人房，請切換至「分房」頁籤確認。</div>
      </div>
    </div>}

    {sub==="list"&&<div style={S.card}><table style={S.table}><thead><tr>{["#","姓名","英文名","性別","房型","飲食","航班","HC"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>{members.map((m: any)=><tr key={m.id}><td style={S.td}>{m.id}</td><td style={{...S.td,fontWeight:600}}>{m.name}</td><td style={S.td}>{m.nameEn}</td><td style={S.td}><span style={S.tag(m.gender==="M"?"#2563eb":"#ec4899")}>{m.gender==="M"?"男":"女"}</span></td><td style={S.td}><span style={S.tag(m.room==="single"?"#ea580c":"#7c3aed")}>{m.room==="single"?"單人":"雙人"}</span></td><td style={S.td}>{m.diet||<span style={{color:"#94a3b8"}}>無</span>}</td><td style={{...S.td,fontSize:10}}>{m.flight}</td><td style={S.td}>{m.handicap||"—"}</td></tr>)}</tbody></table></div>}

    {sub==="rooming"&&<div style={S.card}><div style={S.cardTitle}>🏨 自動分房表 ({rooms.length} 間)</div><table style={S.table}><thead><tr>{["房號","房型","住客1","住客2","航班"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>{rooms.map((r: any,i: number)=><tr key={i}><td style={{...S.td,fontWeight:700,color:"#ea580c",fontSize:15}}>{r.no || r.roomNo}</td><td style={S.td}>{r.type}</td><td style={{...S.td,fontWeight:600}}>{r.guests[0]?.name}</td><td style={{...S.td,fontWeight:600}}>{r.guests[1]?.name||"—"}</td><td style={{...S.td,fontSize:10}}>{r.guests[0]?.flight}</td></tr>)}</tbody></table></div>}

    {sub==="golf"&&<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{groups.map((g: any)=><div key={g.id} style={{...S.card,flex:"1 1 280px",minWidth:260,padding:0,overflow:"hidden"}}><div style={{padding:"7px 12px",background:g.course==="OUT"?"linear-gradient(90deg,#16a34a,#22c55e)":"linear-gradient(90deg,#2563eb,#60a5fa)",color:"#fff",display:"flex",justifyContent:"space-between"}}><strong>{g.course}-{g.id}</strong></div><div style={{padding:8}}>{g.players.map((pl: any,i: number)=><div key={pl.id} style={{display:"flex",alignItems:"center",padding:"4px 6px",borderRadius:5,marginBottom:2,background:i%2===0?"#f8fafc":"#fff",gap:6}}><span style={{width:16,height:16,borderRadius:8,background:pl.gender==="M"?"#dbeafe":"#fce7f3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:pl.gender==="M"?"#2563eb":"#ec4899"}}>{i+1}</span><span style={{fontWeight:600,flex:1,fontSize:12}}>{pl.name}</span><span style={{...S.tag("#16a34a"),fontSize:9}}>HC{pl.handicap||"—"}</span></div>)}</div></div>)}</div>}
  </div>;
}

function CostModule() {
  const [pax, setPax] = useState(16);
  const [golfPax, setGolfPax] = useState(16);
  const [days, setDays] = useState(6);
  const [hotelTier, setHotelTier] = useState('B');
  const [mk, setMk] = useState(1.1); // Markup Rate
  const [fx, setFx] = useState(0.22); // Exchange Rate

  const cDouble = useMemo(() => calculateQuoteV2({
    pax, golfPax, days, nights: days - 1, hotelTier: hotelTier as any, isSingleRoom: false, markupRate: mk, exchangeRate: fx
  }), [pax, golfPax, days, hotelTier, mk, fx]);

  const cSingle = useMemo(() => calculateQuoteV2({
    pax, golfPax, days, nights: days - 1, hotelTier: hotelTier as any, isSingleRoom: true, markupRate: mk, exchangeRate: fx
  }), [pax, golfPax, days, hotelTier, mk, fx]);

  const aiAdvice = useMemo(() => analyzeQuotationAI(cDouble, mk), [cDouble, mk]);

  return <div>
    <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      <StatBox icon="👥" label="人數" value={pax + "人"} accent="#2563eb" />
      <StatBox icon="💴" label="雙人售價/人" value={fmtTWD(cDouble.finalQuoteTwd)} sub={fmt(cDouble.subtotalJpy)} accent="#16a34a" />
      <StatBox icon="🔑" label="單人售價/人" value={fmtTWD(cSingle.finalQuoteTwd)} sub={fmt(cSingle.subtotalJpy)} accent="#ea580c" />
      <StatBox icon="📊" label="利潤率" value={`${Math.round((mk - 1) * 100)}%`} accent="#7c3aed" />
    </div>

    <div style={{ ...S.card, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
      <div>
        <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>總人數</label>
        <input type="range" min={4} max={24} value={pax} onChange={e => { setPax(+e.target.value); setGolfPax(+e.target.value); }} />
        <strong style={{ marginLeft: 5 }}>{pax}</strong>
      </div>
      <div>
        <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>打球人數</label>
        <input type="number" value={golfPax} onChange={e => setGolfPax(+e.target.value)} style={{ ...S.input, width: 60 }} />
      </div>
      <div>
        <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>天數</label>
        <select value={days} onChange={e => setDays(+e.target.value)} style={S.select}>
          {[5, 6, 7, 8, 9, 10].map(d => <option key={d} value={d}>{d}天{d - 1}夜</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>飯店等級</label>
        <select value={hotelTier} onChange={e => setHotelTier(e.target.value)} style={S.select}>
          <option value="A">A級 (豪華)</option>
          <option value="B">B級 (精選)</option>
          <option value="C">C級 (經濟)</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 2 }}>加價倍率</label>
        <input type="number" step={0.05} value={mk} onChange={e => setMk(+e.target.value)} style={{ ...S.input, width: 60 }} />
      </div>
    </div>

    <div style={S.card}>
      <div style={S.cardTitle}>💰 Logic V2 成本明細 (人均日幣)</div>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>項目</th>
            <th style={{ ...S.th, textAlign: "right" }}>雙人房 (JPY)</th>
            <th style={{ ...S.th, textAlign: "right" }}>單人房 (JPY)</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["① 交通 (含司機小費/過路費)", cDouble.transportJpy, cSingle.transportJpy],
            ["② 住宿 (含早餐)", cDouble.hotelJpy, cSingle.hotelJpy],
            ["③ 餐食 (午/晚+水果)", cDouble.diningJpy, cSingle.diningJpy],
            ["④ 球場 (含桿弟/球車)", cDouble.golfJpy, cSingle.golfJpy],
            ["⑤ 導遊 (費+津貼)", cDouble.staffJpy, cSingle.staffJpy],
          ].map(([l, d, s], i) => (
            <tr key={i}>
              <td style={S.td}>{l}</td>
              <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(d as number)}</td>
              <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(s as number)}</td>
            </tr>
          ))}
          <tr style={{ background: "#f0f9ff" }}>
            <td style={{ ...S.td, fontWeight: 700 }}>淨成本合計 (JPY)</td>
            <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: "#2563eb" }}>{fmt(cDouble.subtotalJpy)}</td>
            <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: "#ea580c" }}>{fmt(cSingle.subtotalJpy)}</td>
          </tr>
          <tr style={{ background: "#f0fdf4" }}>
            <td style={{ ...S.td, fontWeight: 700 }}>台幣最終報價 (TWD)</td>
            <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: "#16a34a", fontSize: 16 }}>{fmtTWD(cDouble.finalQuoteTwd)}</td>
            <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: "#ea580c", fontSize: 16 }}>{fmtTWD(cSingle.finalQuoteTwd)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* AI Advisor Panel */}
    <div style={{ ...S.card, background: aiAdvice.status === 'alert' ? '#fef2f2' : aiAdvice.status === 'warning' ? '#fffbeb' : '#f0fdf4', border: `1px solid ${aiAdvice.status === 'alert' ? '#fecaca' : aiAdvice.status === 'warning' ? '#fef3c7' : '#bbf7d0'}` }}>
      <div style={{ ...S.cardTitle, color: aiAdvice.status === 'alert' ? '#991b1b' : aiAdvice.status === 'warning' ? '#92400e' : '#166534' }}>
        🤖 AI 報價顧問建議
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{aiAdvice.message}</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, lineBreak: "anywhere" }}>
        {aiAdvice.suggestions.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
      </ul>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════
// BI MODULE — 利潤儀表板 (Phase 6.2, Admin only)
// ══════════════════════════════════════════════════════════
function BIModule() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/profit')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={S.card}><div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>⏳ 載入利潤數據中...</div></div>;
  if (!data) return <div style={S.card}><div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>暫無數據</div></div>;

  const { summary, alertTours, tours } = data;
  const marginPct = (summary.avgMargin * 100).toFixed(1);
  const isHealthy = summary.avgMargin >= 0.10;

  // 計算供應商佔比（基於 CostModule 的 calculateQuoteV2 邏輯）
  // 使用平均 16 人 6 天 B 級的模擬計算
  const sampleCost = calculateQuoteV2({ pax: 16, golfPax: 16, days: 6, nights: 5, hotelTier: 'B', isSingleRoom: false });
  const total = sampleCost.subtotalJpy;
  const ratios = {
    hotel: { pct: ((sampleCost.hotelJpy / total) * 100).toFixed(1), color: '#7c3aed', label: '住宿 / 宿泊', icon: '🏨' },
    golf: { pct: ((sampleCost.golfJpy / total) * 100).toFixed(1), color: '#16a34a', label: '球場 / ゴルフ', icon: '⛳' },
    transport: { pct: ((sampleCost.transportJpy / total) * 100).toFixed(1), color: '#2563eb', label: '交通 / 交通', icon: '🚌' },
    dining: { pct: ((sampleCost.diningJpy / total) * 100).toFixed(1), color: '#ea580c', label: '餐飲 / 食事', icon: '🍽' },
    staff: { pct: ((sampleCost.staffJpy / total) * 100).toFixed(1), color: '#64748b', label: '導遊司機 / ガイド', icon: '👤' },
  };

  return <div>
    {/* KPI 卡片 */}
    <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      <StatBox icon="📊" label="團數" value={summary.tourCount} accent="#2563eb" />
      <StatBox icon="💴" label="總營收" value={fmt(summary.totalRevenue)} sub="Revenue (JPY)" accent="#16a34a" />
      <StatBox icon="💰" label="總成本" value={fmt(summary.totalCost)} sub="Cost (JPY)" accent="#ea580c" />
      <StatBox icon="📈" label="總毛利" value={fmt(summary.totalProfit)} sub={`平均利潤率 ${marginPct}%`} accent={isHealthy ? "#16a34a" : "#ef4444"} />
    </div>

    {/* 預警區 */}
    {alertTours.length > 0 && <div style={{ ...S.card, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 14 }}>
      <div style={{ ...S.cardTitle, color: "#991b1b" }}>🚨 利潤預警 — 以下團利潤率低於 8%</div>
      {alertTours.map((t: any) => <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #fecaca", gap: 10, fontSize: 12 }}>
        <span style={{ fontWeight: 700, flex: 1 }}>{t.tourName}</span>
        <span style={{ color: "#64748b" }}>{t.pax}人</span>
        <span style={{ fontWeight: 700, color: "#ef4444" }}>{(t.margin * 100).toFixed(1)}%</span>
        <span style={S.badge("#ef4444")}>markup ×{t.markupRate}</span>
      </div>)}
    </div>}

    {/* 供應商佔比圖 */}
    <div style={S.card}>
      <div style={S.cardTitle}>📊 供應商成本佔比分析 (基準: 16人 6天 B級)</div>
      <div style={{ fontSize: 10, color: "#64748b", marginBottom: 12 }}>「一房二球三餐」黃金佔比基準：住宿 30%+ / 球場 15%+ / 餐飲 25%+</div>
      <div style={{ display: "flex", gap: 2, height: 32, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
        {Object.values(ratios).map((r, i) => <div key={i} style={{ flex: parseFloat(r.pct), background: r.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 700, minWidth: 30 }}>{r.pct}%</div>)}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {Object.values(ratios).map((r, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color, display: "inline-block" }} />
          <span>{r.icon} {r.label}</span>
          <strong style={{ color: r.color }}>{r.pct}%</strong>
        </div>)}
      </div>
    </div>

    {/* 團別利潤明細 */}
    <div style={S.card}>
      <div style={S.cardTitle}>📋 各團利潤明細</div>
      <table style={S.table}><thead><tr>{["團名", "人數", "狀態", "成本(JPY)", "營收(JPY)", "毛利(JPY)", "利潤率"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{tours.map((t: any) => {
          const marginColor = t.margin < 0.08 ? "#ef4444" : t.margin < 0.12 ? "#f59e0b" : "#16a34a";
          const statusColors: Record<string, string> = { completed: "#16a34a", confirmed: "#2563eb", draft: "#94a3b8", quoted: "#7c3aed" };
          return <tr key={t.id}>
            <td style={{ ...S.td, fontWeight: 600 }}>{t.tourName}</td>
            <td style={S.td}>{t.pax}</td>
            <td style={S.td}><span style={S.badge(statusColors[t.status] || "#94a3b8")}>{t.status}</span></td>
            <td style={{ ...S.td, textAlign: "right" }}>{fmt(t.costJpy)}</td>
            <td style={{ ...S.td, textAlign: "right" }}>{fmt(t.revenueJpy)}</td>
            <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: marginColor }}>{fmt(t.profitJpy)}</td>
            <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: marginColor }}>{(t.margin * 100).toFixed(1)}%</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════
// SUPPLIER PDF MODULE — 供應商 PDF 自動化 (Phase 6.3)
// ══════════════════════════════════════════════════════════
function SupplierPDFModule() {
  const [genType, setGenType] = useState<string | null>(null);
  const members = DEFAULT_MEMBERS;

  const handleRoomingList = useCallback(() => {
    setGenType('rooming');
    // 從 members 生成 rooming data
    const rooms: { roomNo: string; type: string; guests: { name: string; nameEn: string; gender: string }[] }[] = [];
    const doubles = members.filter(m => m.room === 'double');
    for (let i = 0; i < doubles.length; i += 2) {
      rooms.push({
        roomNo: String(200 + Math.floor(i / 2)),
        type: 'double',
        guests: [
          { name: doubles[i].name, nameEn: doubles[i].nameEn, gender: doubles[i].gender },
          ...(doubles[i + 1] ? [{ name: doubles[i + 1].name, nameEn: doubles[i + 1].nameEn, gender: doubles[i + 1].gender }] : []),
        ],
      });
    }
    const singles = members.filter(m => m.room === 'single');
    singles.forEach((s, i) => {
      rooms.push({ roomNo: String(300 + i), type: 'single', guests: [{ name: s.name, nameEn: s.nameEn, gender: s.gender }] });
    });

    generateRoomingListPDF({
      tourName: '北海道高爾夫美食之旅',
      hotelName: '御居所 HOUSE HOTEL（札幌）',
      checkIn: '2026-08-02',
      checkOut: '2026-08-07',
      nights: 5,
      contactName: 'Kevin',
      contactPhone: '+81-90-XXXX-XXXX',
      rooms,
    });
    setTimeout(() => setGenType(null), 1500);
  }, [members]);

  const handleTeeTimeBooking = useCallback(() => {
    setGenType('teetime');
    // 從 members 生成 golf groups
    const sorted = [...members].sort((a, b) => (a.handicap || 99) - (b.handicap || 99));
    const groups: { groupNo: number; course: string; teeTime: string; players: { name: string; nameEn: string; handicap: number }[] }[] = [];
    for (let i = 0; i < sorted.length; i += 4) {
      const g = sorted.slice(i, i + 4);
      groups.push({
        groupNo: groups.length + 1,
        course: groups.length < Math.ceil(sorted.length / 8) ? 'OUT' : 'IN',
        teeTime: `07:${String(30 + groups.length * 8).padStart(2, '0')}`,
        players: g.map(p => ({ name: p.name, nameEn: p.nameEn, handicap: p.handicap })),
      });
    }

    generateTeeTimeBookingPDF({
      tourName: '北海道高爾夫美食之旅',
      courseName: '由仁東武 Golf Club',
      courseNameJa: '由仁東武ゴルフクラブ',
      playDate: '2026-08-03',
      contactName: 'Kevin',
      contactPhone: '+81-90-XXXX-XXXX',
      totalPlayers: members.length,
      groups,
    });
    setTimeout(() => setGenType(null), 1500);
  }, [members]);

  return <div>
    <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      <StatBox icon="📧" label="供應商文件" value="2 類" accent="#7c3aed" />
      <StatBox icon="👥" label="當前團員" value={`${members.length}人`} accent="#2563eb" />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
      {/* Rooming List */}
      <div style={{ ...S.card, border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 36 }}>🏨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Rooming List</div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>宿泊者リスト / 飯店分房表</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>A4 PDF・双語 Header（日文＋英文）</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
              內容：房號、房型(SGL/TWN)、住客姓名（中英）、性別
            </div>
          </div>
        </div>
        <button onClick={handleRoomingList} disabled={genType === 'rooming'} style={{ ...S.btn("primary"), marginTop: 12, width: "100%", opacity: genType === 'rooming' ? 0.6 : 1 }}>
          {genType === 'rooming' ? '⏳ 產生中...' : '📄 產生 Rooming List PDF'}
        </button>
      </div>

      {/* Tee-time Booking */}
      <div style={{ ...S.card, border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 36 }}>⛳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Tee-time Booking</div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>ティータイム予約 / プレーヤーリスト</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>A4 PDF・双語 Header（日文＋英文）</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
              內容：分組(OUT/IN)、開球時間、球員姓名（中英）、差點
            </div>
          </div>
        </div>
        <button onClick={handleTeeTimeBooking} disabled={genType === 'teetime'} style={{ ...S.btn("primary"), marginTop: 12, width: "100%", opacity: genType === 'teetime' ? 0.6 : 1 }}>
          {genType === 'teetime' ? '⏳ 產生中...' : '📄 產生 Tee-time Booking PDF'}
        </button>
      </div>
    </div>

    {/* 說明 */}
    <div style={{ ...S.card, background: "#f8fafc", marginTop: 14 }}>
      <div style={{ ...S.cardTitle, color: "#475569" }}>📝 使用說明</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#64748b", lineHeight: 1.8 }}>
        <li><strong>Rooming List</strong>：發送給飯店確認房間分配，Header 含日文「宿泊者リスト」方便日本飯店閱讀。</li>
        <li><strong>Tee-time Booking</strong>：發送給球場預約開球時間，按差點排序自動分組，Header 含日文「ティータイム予約」。</li>
        <li>PDF 使用目前「團員管理」中的資料自動帶入，請確認團員資料正確後再產生。</li>
      </ul>
    </div>
  </div>;
}

function CleaningModule() {
  const [month,setMonth]=useState(0);
  const [dataSource, setDataSource] = useState<'local'|'cloud'>('local');
  const [cloudBookings, setCloudBookings] = useState<any[]|null>(null);
  const [loading, setLoading] = useState(false);
  const ms=[{label:"2026年3月",m:2},{label:"2026年4月",m:3}];

  // Fetch live data from Supabase when cloud mode is selected
  const fetchCloudData = useCallback(async () => {
    setLoading(true);
    try {
      const { getSupabaseBrowser } = await import('@/lib/supabase-browser');
      const sb = getSupabaseBrowser();
      // Query daily_plans + hotels for real booking data
      const { data: tours } = await sb.from('tours').select('id, group_name, status, start_date, end_date, pax').eq('status', 'confirmed');
      if (tours && tours.length > 0) {
        // Map confirmed tours into cleaning tasks
        const bookings = tours.map((t: any, idx: number) => ({
          id: 100 + idx,
          checkIn: t.start_date,
          checkOut: t.end_date,
          nights: Math.ceil((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86400000),
          guests: t.pax || 0,
          floor: idx % 2 === 0 ? "2F" : "3F",
          rooms: idx % 2 === 0
            ? { "200": `${t.group_name}`, "201": "2人", "202": "2人" }
            : { "300": `${t.group_name}`, "301": "2人" },
          note: `${t.group_name} (自動)`,
        }));
        setCloudBookings(bookings);
      } else {
        setCloudBookings([]);
      }
    } catch {
      setCloudBookings([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (dataSource === 'cloud' && cloudBookings === null) fetchCloudData();
  }, [dataSource, cloudBookings, fetchCloudData]);

  const activeBookings: any[] = dataSource === 'cloud' && cloudBookings ? cloudBookings : ROOM_BOOKINGS;

  const sel=ms[month]||ms[0], dim=new Date(2026,sel.m+1,0).getDate(), dates=Array.from({length:dim},(_,i)=>i+1);
  const dow=["日","一","二","三","四","五","六"];
  const isOcc=(rid: string,day: number)=>activeBookings.find((b: any)=>{if(!b.rooms[rid])return false;const ci=new Date(b.checkIn),co=new Date(b.checkOut),dt=new Date(2026,sel.m,day);return dt>=ci&&dt<co;});
  const isCo=(rid: string,day: number)=>{const ds=`2026-${String(sel.m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;return activeBookings.find((b: any)=>b.rooms[rid]&&b.checkOut===ds);};
  const tasks=useMemo(()=>{const t: any[]=[];activeBookings.forEach((b: any)=>{const co=new Date(b.checkOut);if(co.getMonth()!==sel.m)return;Object.entries(b.rooms).forEach(([rid,cfg])=>{const nx=activeBookings.find((nb: any)=>nb.rooms[rid]&&nb.checkIn===b.checkOut);t.push({date:co.getDate(),rid,floor:GOKYOSHO_ROOMS.find(r=>r.id===rid)?.floor,prev:cfg,next:nx?(nx as any).rooms[rid]:null,urgent:!!nx,note:b.note});});});return t.sort((a,b)=>a.date-b.date||a.rid.localeCompare(b.rid));},[sel.m, activeBookings]);

  return <div>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
      {ms.map((m,i)=><button key={i} onClick={()=>setMonth(i)} style={S.btn(month===i?"primary":"ghost")}>{m.label}</button>)}
      <div style={{flex:1}}/>
      <button onClick={()=>setDataSource('local')} style={S.btn(dataSource==='local'?'primary':'ghost')}>📋 本地資料</button>
      <button onClick={()=>setDataSource('cloud')} style={{...S.btn(dataSource==='cloud'?'primary':'ghost'),opacity:loading?0.6:1}}>
        {loading ? "⏳ 載入中..." : "☁️ 雲端即時"}
      </button>
      <span style={S.badge("#7c3aed")}>御居所</span>
    </div>

    {dataSource === 'cloud' && cloudBookings?.length === 0 && <div style={{...S.card, background:"#fffbeb", border:"1px solid #fef3c7"}}>
      <div style={{fontSize:12, color:"#92400e"}}>⚠️ 尚無已確認 (confirmed) 的團務資料。當 tours.status 設為 confirmed 時，清潔排程會自動產生。</div>
    </div>}

    <div style={{...S.card,padding:0,overflow:"auto"}}><div style={{padding:"9px 12px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",fontWeight:700,fontSize:12}}>🏨 房間佔用甘特圖 — {sel.label} {dataSource==='cloud'&&<span style={{...S.tag("#7c3aed"),marginLeft:6}}>LIVE</span>}</div>
      <div style={{overflow:"auto"}}><table style={{borderCollapse:"collapse" as const,fontSize:10,minWidth:dim*26+70}}><thead><tr><th style={{position:"sticky",left:0,background:"#f8fafc",padding:"5px 7px",borderBottom:"2px solid #e2e8f0",fontWeight:700,fontSize:10,zIndex:2,minWidth:60,textAlign:"left" as const}}>房間</th>{dates.map(d=>{const dw=new Date(2026,sel.m,d).getDay();return<th key={d} style={{padding:"2px 1px",borderBottom:"2px solid #e2e8f0",fontSize:8,textAlign:"center" as const,minWidth:24,background:dw%6===0?"#fef2f2":"#f8fafc",color:dw%6===0?"#ef4444":"#64748b"}}><div>{d}</div><div style={{fontSize:7}}>{dow[dw]}</div></th>})}</tr></thead>
        <tbody>{GOKYOSHO_ROOMS.map(room=><tr key={room.id}><td style={{position:"sticky",left:0,background:"#fff",padding:"3px 7px",borderBottom:"1px solid #f1f5f9",fontWeight:600,fontSize:10,zIndex:1}}><span style={{display:"inline-block",width:5,height:5,borderRadius:3,background:(floorColors as any)[room.floor],marginRight:3}}/>{room.id}</td>{dates.map(d=>{const occ=isOcc(room.id,d),co=isCo(room.id,d);let bg=new Date(2026,sel.m,d).getDay()%6===0?"#fefafa":"#fff",ct="";if(occ){bg=(floorColors as any)[room.floor]+"18";ct="●";}if(co&&!occ){bg="#fef3c7";ct="🧹";}if(co&&occ){bg="#fecaca";ct="⚡";}return<td key={d} style={{padding:0,borderBottom:"1px solid #f1f5f9",textAlign:"center" as const,background:bg,fontSize:9,height:22,minWidth:24}} title={occ?`${occ.rooms[room.id]}`:""}>{ct}</td>})}</tr>)}</tbody></table></div>
      <div style={{padding:"6px 12px",borderTop:"1px solid #e2e8f0",display:"flex",gap:14,fontSize:9,color:"#64748b"}}><span>● 入住中</span><span>🧹 清潔日</span><span>⚡ 緊急周轉</span></div>
    </div>
    <div style={{...S.card,marginTop:12}}><div style={S.cardTitle}>🧹 清潔任務 — {sel.label}</div><table style={S.table}><thead><tr>{["日期","房間","樓層","前組","下組","狀態"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>{tasks.map((t: any,i: number)=><tr key={i} style={{background:t.urgent?"#fef2f2":undefined}}><td style={{...S.td,fontWeight:700}}>{sel.m+1}/{t.date}</td><td style={{...S.td,fontWeight:600}}>{t.rid}</td><td style={S.td}><span style={S.badge((floorColors as any)[t.floor])}>{t.floor}</span></td><td style={{...S.td,fontSize:11}}>{t.prev}</td><td style={{...S.td,fontSize:11}}>{t.next||"—"}</td><td style={S.td}>{t.urgent?<span style={S.badge("#ef4444")}>⚡緊急</span>:<span style={S.badge("#16a34a")}>一般</span>}{t.note&&<span style={{...S.tag("#f59e0b"),marginLeft:3}}>{t.note}</span>}</td></tr>)}</tbody></table></div>
  </div>;
}

function CalendarModule() {
  const [month,setMonth]=useState(2);
  const ms=[["2026年4月",3],["2026年5月",4],["2026年6月",5],["2026年7月",6],["2026年8月",7]];
  const tours=[{name:"鄭大哥團",start:new Date(2026,3,29),end:new Date(2026,4,3),color:"#2563eb"},{name:"蘇國棟團7天",start:new Date(2026,5,8),end:new Date(2026,5,14),color:"#7c3aed"},{name:"許醫師團",start:new Date(2026,5,19),end:new Date(2026,5,23),color:"#ca8a04"},{name:"馬吉欣團",start:new Date(2026,4,13),end:new Date(2026,4,16),color:"#dc2626"},{name:"三益高爾夫",start:new Date(2026,7,2),end:new Date(2026,7,7),color:"#0d9488"}];
  const [,bm]=ms[month],fd=new Date(2026,bm,1).getDay(),dim=new Date(2026,bm+1,0).getDate();
  const cells=[...Array(fd).fill(null),...Array.from({length:dim},(_,i)=>i+1)],dow=["日","一","二","三","四","五","六"];
  return <div>
    <div style={{display:"flex",gap:6,marginBottom:12}}>{ms.map(([l],i)=><button key={i} onClick={()=>setMonth(i)} style={S.btn(month===i?"primary":"ghost")}>{l}</button>)}</div>
    <div style={S.card}><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:"#e2e8f0",borderRadius:8,overflow:"hidden"}}>{dow.map(d=><div key={d} style={{padding:"6px 3px",textAlign:"center",fontWeight:700,fontSize:11,background:"#f8fafc",color:"#64748b"}}>{d}</div>)}{cells.map((d,i)=>{const dt=d?tours.filter(t=>{const date=new Date(2026,bm,d);return date>=t.start&&date<=t.end;}):[];return<div key={i} style={{minHeight:68,padding:2,background:d?"#fff":"#f8fafc",borderTop:"1px solid #f1f5f9"}}>{d&&<><div style={{fontSize:10,fontWeight:600,color:i%7===0||i%7===6?"#ef4444":"#1e293b"}}>{d}</div>{dt.map((t,ti)=><div key={ti} style={{fontSize:7,padding:"1px 3px",borderRadius:2,marginBottom:1,background:t.color+"15",color:t.color,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>)}</>}</div>})}</div></div>
  </div>;
}

function DocumentsModule() {
  const [gen,setGen]=useState(null);
  const docs=[{id:"it",icon:"📄",name:"行程說明書",fmt:"PDF"},{id:"qi",icon:"💰",name:"報價（內部）",fmt:"PDF/Excel"},{id:"qe",icon:"📋",name:"報價（對外）",fmt:"PDF"},{id:"mb",icon:"👥",name:"團員名單",fmt:"Excel"},{id:"rm",icon:"🏨",name:"分房表",fmt:"PDF"},{id:"gf",icon:"⛳",name:"球場分組表",fmt:"PDF"},{id:"cl",icon:"🧹",name:"清潔排程表",fmt:"PDF"}];
  return <div style={S.card}><div style={S.cardTitle}>📁 文件輸出</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>{docs.map(d=><div key={d.id} style={{border:"1px solid #e2e8f0",borderRadius:10,padding:12,display:"flex",gap:10,background:gen===d.id?"#f0fdf4":"#fff"}}><span style={{fontSize:24}}>{d.icon}</span><div style={{flex:1}}><div style={{fontWeight:700,fontSize:12}}>{d.name}</div><span style={S.tag("#2563eb")}>{d.fmt}</span></div><button onClick={()=>{setGen(d.id);setTimeout(()=>setGen(null),1200);}} style={S.btn("primary")}>{gen===d.id?"⏳":"產生"}</button></div>)}</div></div>;
}

function SettingsModule() {
  return <div style={S.card}><div style={S.cardTitle}>⚙️ 系統設定</div><table style={S.table}><thead><tr>{["供應商","類型","單價"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>
    {SUPPLIERS.hotels.map(h=><tr key={h.id}><td style={{...S.td,fontWeight:600}}>{h.name}</td><td style={S.td}><span style={S.tag("#7c3aed")}>飯店</span></td><td style={S.td}>單{fmt(h.single)}/雙{fmt(h.double)}</td></tr>)}
    {SUPPLIERS.golf.map(g=><tr key={g.id}><td style={{...S.td,fontWeight:600}}>{g.name}</td><td style={S.td}><span style={S.tag("#16a34a")}>球場</span></td><td style={S.td}>{fmt(g.fee)}</td></tr>)}
  </tbody></table></div>;
}

function ActionGuideModule() {
  const [pdfLoading, setPdfLoading] = useState(false);

  // 模擬數據對齊統整表 5D4N 模式
  const mockData = {
    tourName: "蘇國棟高爾夫假期",
    pax: 15,
    days: 6,
    startDate: "2026/08/02",
    endDate: "2026/08/07",
    contactName: "Kevin",
    contactPhone: "0912-345-678",
    itinerary: [
      {
        day: 1, date: "8/2", title: "抵達北海道",
        stops: [
          { type: "transport" as const, name: "新千歲機場接機", time: "14:20", note: "華航 CI130" },
          { type: "dining" as const, name: "海鮮割烹晚餐", time: "18:30" },
          { type: "hotel" as const, name: "北廣島 Classe Hotel", note: "Check-in" },
        ]
      },
      {
        day: 2, date: "8/3", title: "由仁東武開球",
        stops: [
          { type: "golf" as const, name: "由仁東武 GC (27洞)", time: "08:30", mapsUrl: "https://maps.google.com/?q=Yuni+Dobashi+Golf" },
          { type: "dining" as const, name: "現場午餐", time: "13:30" },
          { type: "hotel" as const, name: "北廣島 Classe Hotel" },
        ]
      }
    ]
  };

  const handleDownloadPDF = useCallback(() => {
    setPdfLoading(true);
    try {
      generateActionGuidePDF({
        tourName: mockData.tourName,
        pax: mockData.pax,
        days: mockData.days,
        startDate: mockData.startDate,
        endDate: mockData.endDate,
        contactName: mockData.contactName,
        contactPhone: mockData.contactPhone,
        itinerary: mockData.itinerary.map(day => ({
          day: day.day,
          date: day.date,
          title: day.title,
          stops: day.stops.map(s => ({ type: s.type, name: s.name, time: s.time, note: 'note' in s ? s.note : undefined })),
        })),
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
    setPdfLoading(false);
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, gap: 8 }}>
        <button onClick={handleDownloadPDF} disabled={pdfLoading} style={{ ...S.btn("primary"), opacity: pdfLoading ? 0.6 : 1 }}>
          {pdfLoading ? "⏳ 生成中..." : "📄 下載 PDF (A4)"}
        </button>
      </div>
      <div style={{ padding: "20px", display: "flex", justifyContent: "center", background: "#f1f5f9", borderRadius: 10 }}>
        <div style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.15)", transform: "scale(0.85)", transformOrigin: "top center" }}>
          <OnePageActionGuide {...mockData} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN APP (v0.4)
// ══════════════════════════════════════════════════════════
const NAV: { key: string; icon: string; label: string; badge?: string; perm?: Permission }[] = [
  { key: "ai_plan", icon: "✨", label: "AI 行程規劃", badge: "NEW", perm: "view_ai_planner" },
  { key: "action_guide", icon: "🗺", label: "落地指南", badge: "ACT" },
  { key: "tasks",   icon: "✅", label: "任務管理" },
  { key: "calendar",icon: "📅", label: "月曆總覽" },
  { key: "itinerary",icon:"🗺", label: "行程管理", perm: "manage_tours" },
  { key: "members", icon: "👥", label: "團員管理", perm: "manage_members" },
  { key: "cost",    icon: "💰", label: "成本報價", perm: "view_cost_breakdown" },
  { key: "bi",      icon: "📊", label: "利潤儀表板", badge: "BI", perm: "view_profit_dashboard" },
  { key: "supplier",icon: "📧", label: "供應商 PDF", perm: "export_supplier_pdf" },
  { key: "cleaning",icon: "🧹", label: "清潔排程", perm: "manage_cleaning" },
  { key: "docs",    icon: "📄", label: "文件輸出" },
  { key: "settings",icon: "⚙️", label: "系統設定" },
];

const TITLES = {
  ai_plan:  "AI 行程規劃師",
  action_guide: "落地行動指南 (A4 一頁式)",
  tasks:    "任務管理中心",
  calendar: "月曆總覽",
  itinerary:"行程管理",
  members:  "團員分房分組",
  cost:     "成本報價",
  bi:       "利潤儀表板 (BI)",
  supplier: "供應商 PDF 自動化",
  cleaning: "御居所清潔排程",
  docs:     "文件輸出",
  settings: "系統設定",
} as Record<string, string>;

export default function App() {
  const [nav, setNav] = useState("ai_plan");
  const auth = useAuth();

  // 根據角色權限過濾側邊欄
  const visibleNav = NAV.filter(n => !n.perm || auth.can(n.perm));

  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <div style={{ padding: "16px 14px 7px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>御之旅</div>
          <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>M.T Tours — 行程規劃及報價系統</div>
        </div>
        <div style={{ padding: "8px 0", flex: 1 }}>
          {visibleNav.map(n => (
            <div key={n.key} onClick={() => setNav(n.key)} style={S.navItem(nav === n.key)}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && (
                <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#6366f1", color: "#fff", fontWeight: 700 }}>{n.badge}</span>
              )}
            </div>
          ))}
        </div>
        {/* 使用者資訊 + 登出 */}
        <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {auth.user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 10, color: "#e2e8f0", fontWeight: 600 }}>{auth.user.email}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}>{auth.roleLabel}</span>
                <span onClick={auth.signOut} style={{ fontSize: 9, color: "#94a3b8", cursor: "pointer" }}>登出</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 9, color: "#64748b" }}>
              <a href="/login" style={{ color: "#a5b4fc", textDecoration: "none" }}>登入</a>
              <span style={{ margin: "0 4px" }}>·</span>
              <span>NOBLE HOUSE GLORY</span>
            </div>
          )}
          <div style={{ fontSize: 9, color: "#475569", marginTop: 4 }}>Prototype v0.4</div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 48, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{TITLES[nav]}</span>
            {nav === "ai_plan" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#eef2ff", color: "#4f46e5", fontWeight: 700 }}>Claude AI 驅動</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={S.badge("#16a34a")}>北海道高爾夫美食之旅</span>
            <span style={{ fontSize: 10, color: "#64748b" }}>2026/08/02–07</span>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {nav === "action_guide" && <ActionGuideModule />}
          {nav === "ai_plan"  && <AIItineraryModule />}
          {nav === "tasks"    && <TaskModule />}
          {nav === "calendar" && <CalendarModule />}
          {nav === "itinerary"&& <ItineraryModule />}
          {nav === "members"  && <MembersModule />}
          {nav === "cost"     && <CostModule />}
          {nav === "bi"       && <BIModule />}
          {nav === "supplier" && <SupplierPDFModule />}
          {nav === "cleaning" && <CleaningModule />}
          {nav === "docs"     && <DocumentsModule />}
          {nav === "settings" && <SettingsModule />}
        </div>
      </div>
    </div>
  );
}
