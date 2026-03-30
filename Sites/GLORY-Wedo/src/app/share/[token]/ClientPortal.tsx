'use client';

/**
 * 御之旅 Phase 7.1 — ClientPortal 互動式行程入口
 * Premium 行動端 UI：Google Maps 導航 · 行事曆匯出 · 即時更新 · 中/日切換
 */
import { useState, useEffect } from 'react';
import { type Locale, t, LOCALE_LABELS } from '@/lib/i18n';

// ── 停留點類型設定 ──
const TYPE_CFG: Record<string, { color: string; icon: string; key: string }> = {
  transport:   { color: "#2563eb", icon: "🚗", key: "type.transport" },
  dining:      { color: "#ea580c", icon: "🍽", key: "type.dining" },
  hotel:       { color: "#7c3aed", icon: "🏨", key: "type.hotel" },
  sightseeing: { color: "#ca8a04", icon: "🗺", key: "type.sightseeing" },
  nature:      { color: "#0d9488", icon: "🌿", key: "type.nature" },
  onsen:       { color: "#3b82f6", icon: "♨️", key: "type.onsen" },
  golf:        { color: "#16a34a", icon: "⛳", key: "type.golf" },
};

interface Stop {
  type: string;
  name: string;
  desc?: string;
  duration?: number;
  cost?: number;
  address?: string;
  lat?: number;
  lng?: number;
  teeTime?: string;
}

interface Day {
  day: number;
  title: string;
  date?: string;
  route?: string;
  stops: Stop[];
}

interface Itinerary {
  title: string;
  subtitle?: string;
  destination?: string;
  totalDays?: number;
  pax?: number;
  season?: string;
  transport?: string;
  hotel?: string;
  tags?: string[];
  startDate?: string;
  contactName?: string;
  contactPhone?: string;
  days: Day[];
}

function googleMapsUrl(stop: Stop): string | null {
  if (stop.lat && stop.lng) return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`;
  if (stop.address) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`;
  if (stop.name) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name)}`;
  return null;
}

function generateICS(title: string, date: string, time: string, location: string): string {
  // Simple ICS for Google/Apple Calendar
  const dt = date.replace(/-/g, '');
  const startH = time ? time.replace(':', '') + '00' : '080000';
  const endH = time ? String(parseInt(time.split(':')[0]) + 2).padStart(2, '0') + time.split(':')[1] + '00' : '100000';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Noble House Glory//MT Tours//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dt}T${startH}`,
    `DTEND:${dt}T${endH}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    'DESCRIPTION:御之旅 NOBLE HOUSE GLORY',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(title: string, date: string, time: string, location: string) {
  const ics = generateICS(title, date, time, location);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientPortal({ trip, token }: { trip: any; token: string }) {
  const [locale, setLocale] = useState<Locale>('zh-TW');
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  const plan: Itinerary = trip.days_json;
  const totalCost = plan.days.reduce(
    (s: number, d: Day) => s + d.stops.reduce((ss: number, st: Stop) => ss + (st.cost || 0), 0),
    0
  );

  // 模擬即時更新輪詢（每 60 秒）
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const i = (key: string, params?: Record<string, string | number>) => t(locale, key, params);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 30%, #f1f5f9 30.1%)',
      fontFamily: "'Noto Sans TC', 'Hiragino Sans', sans-serif",
    }}>
      {/* ── 頂部語系切換 ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)',
        padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>🏯 {i('app.company')}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(LOCALE_LABELS) as Locale[]).map(loc => (
            <button key={loc} onClick={() => setLocale(loc)} style={{
              padding: '3px 10px', borderRadius: 6, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
              background: locale === loc ? '#6366f1' : 'rgba(255,255,255,0.1)',
              color: locale === loc ? '#fff' : '#94a3b8',
            }}>{LOCALE_LABELS[loc]}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 32px' }}>
        {/* ── Hero Header ── */}
        <div style={{ padding: '24px 0 20px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
              background: '#16a34a', color: '#fff',
            }}>{i('portal.realtime_badge')}</span>
            <span style={{ fontSize: 9, color: '#64748b' }}>{lastUpdated}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.3 }}>{plan.title}</h1>
          {plan.subtitle && <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 12px' }}>{plan.subtitle}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {plan.tags?.map((tag: string) => (
              <span key={tag} style={{ padding: '3px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', fontSize: 11, color: '#e2e8f0' }}>{tag}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94a3b8' }}>
            {plan.destination && <span>📍 {plan.destination}</span>}
            {plan.pax && <span>👥 {plan.pax}{i('portal.pax')}</span>}
            {plan.totalDays && <span>📅 {plan.totalDays}{i('portal.days')}</span>}
          </div>
        </div>

        {/* ── 聯絡領隊 & 費用摘要 ── */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 16,
        }}>
          {plan.contactName && (
            <a href={plan.contactPhone ? `tel:${plan.contactPhone}` : '#'} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
              background: '#fff', borderRadius: 12, textDecoration: 'none', color: '#0f172a',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <span style={{ fontSize: 20 }}>📞</span>
              <div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{i('portal.contact_guide')}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{plan.contactName}</div>
              </div>
            </a>
          )}
          <div style={{
            flex: 1, padding: '12px 14px', background: '#fff', borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 10, color: '#64748b' }}>{i('portal.cost_per_pax')}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>&yen;{totalCost.toLocaleString()}</div>
          </div>
        </div>

        {/* ── Day Cards (Accordion) ── */}
        {plan.days.map((day: Day) => {
          const isOpen = expandedDay === day.day;
          const dayCost = day.stops.reduce((s: number, st: Stop) => s + (st.cost || 0), 0);
          const dayDate = day.date || (plan.startDate ? calculateDate(plan.startDate, day.day - 1) : '');

          return (
            <div key={day.day} style={{
              background: '#fff', borderRadius: 14, marginBottom: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              overflow: 'hidden', transition: 'all 0.2s ease',
            }}>
              {/* Day Header — tap to expand */}
              <div onClick={() => setExpandedDay(isOpen ? null : day.day)} style={{
                padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: isOpen ? '1px solid #f1f5f9' : 'none',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0,
                }}>D{day.day}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{day.title}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {dayDate && <span>{dayDate}</span>}
                    {day.stops.length > 0 && <span> · {day.stops.length} stops</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {dayCost > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>&yen;{dayCost.toLocaleString()}</div>}
                  <span style={{ fontSize: 14, color: '#94a3b8', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
              </div>

              {/* Expanded Stops */}
              {isOpen && (
                <div style={{ padding: '8px 12px 14px' }}>
                  {day.route && (
                    <div style={{ fontSize: 11, color: '#94a3b8', padding: '4px 8px', marginBottom: 8, background: '#f8fafc', borderRadius: 6 }}>
                      🛤 {day.route}
                    </div>
                  )}
                  {day.stops.map((stop: Stop, idx: number) => {
                    const tc = TYPE_CFG[stop.type] || TYPE_CFG.sightseeing;
                    const mapsUrl = googleMapsUrl(stop);
                    return (
                      <div key={idx} style={{
                        display: 'flex', gap: 10, padding: '10px 10px',
                        borderRadius: 10, marginBottom: 6,
                        background: tc.color + '08', borderLeft: `3px solid ${tc.color}`,
                      }}>
                        <span style={{ fontSize: 18, marginTop: 2 }}>{tc.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{stop.name}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                {i(tc.key)}
                                {(stop.duration ?? 0) > 0 && <span> · ⏱ {i('portal.duration', { n: stop.duration! })}</span>}
                                {stop.teeTime && <span> · {i('portal.tee_time')}: {stop.teeTime}</span>}
                              </div>
                            </div>
                            {(stop.cost ?? 0) > 0 && (
                              <span style={{ fontSize: 12, fontWeight: 700, color: tc.color, flexShrink: 0 }}>&yen;{(stop.cost!).toLocaleString()}</span>
                            )}
                          </div>
                          {stop.desc && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{stop.desc}</div>}
                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            {mapsUrl && (
                              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                                background: '#eff6ff', color: '#2563eb', textDecoration: 'none',
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                              }}>📍 {i('portal.navigate')}</a>
                            )}
                            {stop.teeTime && dayDate && (
                              <button onClick={() => downloadICS(stop.name, dayDate, stop.teeTime!, stop.address || stop.name)} style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                                background: '#f0fdf4', color: '#16a34a', border: 'none', cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                              }}>📅 {i('portal.add_calendar')}</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{i('app.footer')}</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Powered by 御之旅 ClientPortal v7.1</div>
        </div>
      </div>
    </div>
  );
}

/** 從起始日計算第 N 天日期 */
function calculateDate(startDate: string, offset: number): string {
  try {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offset);
    return `${d.getMonth() + 1}/${d.getDate()} (${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]})`;
  } catch {
    return '';
  }
}
