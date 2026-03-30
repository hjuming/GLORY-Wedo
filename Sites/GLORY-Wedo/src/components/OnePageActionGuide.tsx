/**
 * 御之旅 (Royal Journey) — 單頁落地行程單 (One-Page Action Guide)
 * 目的：高效率、高密度的 A4 落地執行指南
 */

import React from 'react';

export interface ActionStop {
  type: 'golf' | 'hotel' | 'dining' | 'transport' | 'sightseeing';
  name: string;
  time?: string;
  mapsUrl?: string;
  note?: string;
}

export interface ActionDay {
  day: number;
  date: string;
  title: string;
  stops: ActionStop[];
}

export interface ActionGuideProps {
  tourName: string;
  pax: number;
  days: number;
  startDate: string;
  endDate: string;
  contactName: string;
  contactPhone: string;
  itinerary: ActionDay[];
}

const TYPE_ICONS = {
  golf: '⛳',
  hotel: '🏨',
  dining: '🍽',
  transport: '🚌',
  sightseeing: '🗺',
};

const OnePageActionGuide: React.FC<ActionGuideProps> = ({
  tourName,
  pax,
  days,
  startDate,
  endDate,
  contactName,
  contactPhone,
  itinerary,
}) => {
  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '20mm',
      margin: '0 auto',
      background: '#fff',
      fontFamily: "'Noto Sans TC', sans-serif",
      color: '#1e293b',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <header style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>御之旅 NOBLE HOUSE GLORY</h1>
            <h2 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700, color: '#1e3a5f' }}>{tourName} — 落地行動指南</h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
            <div>團員數：{pax} 人 | 天數：{days} 天</div>
            <div>期間：{startDate} ~ {endDate}</div>
          </div>
        </div>
      </header>

      {/* Quick Contact */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
        <div style={{ flex: 1, fontSize: '12px' }}>
          <span style={{ fontWeight: 700 }}>🚗 導遊/接應：</span> {contactName} ({contactPhone})
        </div>
        <div style={{ flex: 1, fontSize: '12px' }}>
          <span style={{ fontWeight: 700 }}>🏨 飯店確認碼：</span> 請見行程明細
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {itinerary.map((day) => (
          <div key={day.day} style={{ display: 'flex', gap: '16px' }}>
            {/* Day Column */}
            <div style={{ width: '40px', flexShrink: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>D{day.day}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{day.date}</div>
            </div>

            {/* Content Column */}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                {day.title}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {day.stops.map((stop, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{TYPE_ICONS[stop.type]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>
                          {stop.name}
                          {stop.mapsUrl && (
                            <a href={stop.mapsUrl} style={{ marginLeft: '8px', fontSize: '11px', color: '#2563eb', textDecoration: 'none' }}>
                              📍導航
                            </a>
                          )}
                        </div>
                        {stop.time && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{stop.time}</div>}
                      </div>
                      {stop.note && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>• {stop.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ marginTop: '40px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
        祝您旅途愉快！如有急事，請隨時聯繫 LINE 客服或撥打緊急專線。
      </footer>
    </div>
  );
};

export default OnePageActionGuide;
