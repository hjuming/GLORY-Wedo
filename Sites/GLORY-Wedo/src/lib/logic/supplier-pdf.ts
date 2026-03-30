/**
 * 御之旅 Phase 6.3 — 供應商 PDF 生成器
 * ① Rooming List（飯店分房表）
 * ② Tee-time Booking（球場預約表）
 * 雙語 Header（日文 + 中文/英文）
 */
import { jsPDF } from 'jspdf';

// ── 共用 ──
const MARGIN = 15;
const W = 210;
const CONTENT_W = W - MARGIN * 2;

function drawHeader(doc: jsPDF, title: string, titleJa: string, tourName: string, date: string) {
  let y = MARGIN;

  // Logo bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('NOBLE HOUSE GLORY — M.T TOURS', MARGIN, 14);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(titleJa, MARGIN, 22);

  y = 40;

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  y += 7;

  // Tour info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Tour: ${tourName}  |  Date: ${date}`, MARGIN, y);
  y += 4;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 6;

  return y;
}

function drawTableHeader(doc: jsPDF, y: number, headers: { label: string; labelJa: string; x: number; w: number }[]) {
  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, y - 4, CONTENT_W, 12, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  for (const h of headers) {
    doc.setTextColor(71, 85, 105);
    doc.text(h.label, h.x, y);
    doc.setTextColor(148, 163, 184);
    doc.text(h.labelJa, h.x, y + 4);
  }

  return y + 11;
}

// ══════════════════════════════════════════════════════════
// ① Rooming List — 飯店分房表
// ══════════════════════════════════════════════════════════

export interface RoomingGuest {
  name: string;
  nameEn: string;
  gender: 'M' | 'F';
  roomType: 'single' | 'double';
}

export interface RoomingListData {
  tourName: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  contactName: string;
  contactPhone: string;
  rooms: {
    roomNo: string;
    type: string;
    guests: { name: string; nameEn: string; gender: string }[];
  }[];
}

export function generateRoomingListPDF(data: RoomingListData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawHeader(doc, 'Rooming List', '宿泊者リスト / 分房表', data.tourName, `${data.checkIn} ~ ${data.checkOut} (${data.nights} nights)`);

  // Hotel info bar
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text(`Hotel / ホテル: ${data.hotelName}`, MARGIN + 4, y + 6.5);
  y += 14;

  // Table headers
  const cols = [
    { label: 'Room', labelJa: '部屋番号', x: MARGIN + 2, w: 20 },
    { label: 'Type', labelJa: 'タイプ', x: MARGIN + 24, w: 22 },
    { label: 'Guest 1', labelJa: '宿泊者1', x: MARGIN + 48, w: 45 },
    { label: 'Guest 2', labelJa: '宿泊者2', x: MARGIN + 95, w: 45 },
    { label: 'Gender', labelJa: '性別', x: MARGIN + 142, w: 20 },
  ];

  y = drawTableHeader(doc, y, cols);

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  for (const room of data.rooms) {
    if (y > 270) { doc.addPage(); y = MARGIN + 5; y = drawTableHeader(doc, y, cols); }

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(room.roomNo, cols[0].x, y);

    doc.setFont('helvetica', 'normal');
    doc.text(room.type === 'single' ? 'SGL' : 'TWN', cols[1].x, y);

    // Guest 1
    if (room.guests[0]) {
      doc.setFont('helvetica', 'bold');
      doc.text(room.guests[0].name, cols[2].x, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(room.guests[0].nameEn, cols[2].x, y + 3.5);
      doc.setFontSize(9);
    }

    // Guest 2
    doc.setTextColor(30, 41, 59);
    if (room.guests[1]) {
      doc.setFont('helvetica', 'bold');
      doc.text(room.guests[1].name, cols[3].x, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(room.guests[1].nameEn, cols[3].x, y + 3.5);
      doc.setFontSize(9);
    }

    // Gender
    doc.setTextColor(30, 41, 59);
    const genders = room.guests.map(g => g.gender === 'M' ? 'M' : 'F').join(' / ');
    doc.text(genders, cols[4].x, y);

    y += 9;
  }

  // Contact footer
  y = Math.max(y + 5, 260);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Contact: ${data.contactName} / ${data.contactPhone}`, MARGIN, y);
  doc.text('NOBLE HOUSE GLORY Co., Ltd.', W - MARGIN, y, { align: 'right' });

  doc.save(`${data.tourName}_RoomingList.pdf`);
}

// ══════════════════════════════════════════════════════════
// ② Tee-time Booking — 球場預約表
// ══════════════════════════════════════════════════════════

export interface TeeTimePlayer {
  name: string;
  nameEn: string;
  handicap: number;
}

export interface TeeTimeGroup {
  groupNo: number;
  course: string; // OUT / IN
  teeTime: string;
  players: TeeTimePlayer[];
}

export interface TeeTimeBookingData {
  tourName: string;
  courseName: string;
  courseNameJa?: string;
  playDate: string;
  contactName: string;
  contactPhone: string;
  totalPlayers: number;
  groups: TeeTimeGroup[];
}

export function generateTeeTimeBookingPDF(data: TeeTimeBookingData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawHeader(doc, 'Tee-time Booking', 'ティータイム予約 / プレーヤーリスト', data.tourName, data.playDate);

  // Course info bar
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  const courseLabel = data.courseNameJa ? `${data.courseName} / ${data.courseNameJa}` : data.courseName;
  doc.text(`Course / ゴルフ場: ${courseLabel}  |  Players: ${data.totalPlayers}`, MARGIN + 4, y + 6.5);
  y += 14;

  // Per group
  for (const group of data.groups) {
    if (y > 250) { doc.addPage(); y = MARGIN + 5; }

    // Group header
    doc.setFillColor(group.course === 'OUT' ? 22 : 37, group.course === 'OUT' ? 163 : 99, group.course === 'OUT' ? 74 : 235);
    doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`Group ${group.groupNo} — ${group.course}`, MARGIN + 4, y + 5.5);
    doc.text(`Tee: ${group.teeTime}`, W - MARGIN - 4, y + 5.5, { align: 'right' });
    y += 12;

    // Player table header
    const pCols = [
      { label: '#', labelJa: '', x: MARGIN + 2, w: 8 },
      { label: 'Player', labelJa: 'プレーヤー', x: MARGIN + 12, w: 50 },
      { label: 'Name (EN)', labelJa: '氏名(英)', x: MARGIN + 65, w: 55 },
      { label: 'HC', labelJa: 'ハンデ', x: MARGIN + 130, w: 15 },
    ];
    y = drawTableHeader(doc, y, pCols);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (let i = 0; i < group.players.length; i++) {
      const p = group.players[i];
      doc.setTextColor(100, 116, 139);
      doc.text(`${i + 1}`, pCols[0].x, y);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(p.name, pCols[1].x, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(p.nameEn, pCols[2].x, y);

      doc.setTextColor(22, 163, 74);
      doc.setFont('helvetica', 'bold');
      doc.text(String(p.handicap || '-'), pCols[3].x, y);
      doc.setFont('helvetica', 'normal');

      y += 6;
    }

    y += 4;
  }

  // Footer
  y = Math.max(y + 5, 260);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Contact: ${data.contactName} / ${data.contactPhone}`, MARGIN, y);
  doc.text('NOBLE HOUSE GLORY Co., Ltd.', W - MARGIN, y, { align: 'right' });

  doc.save(`${data.tourName}_TeeTimeBooking.pdf`);
}
