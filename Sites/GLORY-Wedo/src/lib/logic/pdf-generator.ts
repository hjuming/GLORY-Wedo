/**
 * 御之旅 — A4 PDF 落地指南生成器
 * Task 5.2: 使用 jsPDF 產生 300dpi 品質的單頁行程單
 */
import { jsPDF } from 'jspdf';

export interface PDFActionStop {
  type: string;
  name: string;
  time?: string;
  note?: string;
}

export interface PDFActionDay {
  day: number;
  date: string;
  title: string;
  stops: PDFActionStop[];
}

export interface PDFGuideData {
  tourName: string;
  pax: number;
  days: number;
  startDate: string;
  endDate: string;
  contactName: string;
  contactPhone: string;
  itinerary: PDFActionDay[];
}

const TYPE_ICONS: Record<string, string> = {
  golf: '[G]',
  hotel: '[H]',
  dining: '[D]',
  transport: '[T]',
  sightseeing: '[S]',
};

/**
 * Generate A4 PDF action guide and trigger download
 */
export function generateActionGuidePDF(data: PDFGuideData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const W = 210;
  const margin = 20;
  const contentW = W - margin * 2;
  let y = margin;

  // ── Header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('M.T TOURS — NOBLE HOUSE GLORY', margin, y);
  y += 8;

  doc.setFontSize(14);
  doc.text(`${data.tourName}`, margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${data.pax} pax | ${data.days} days | ${data.startDate} ~ ${data.endDate}`,
    margin, y
  );
  y += 4;

  // Header line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 6;

  // ── Contact Bar ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Guide: ${data.contactName} (${data.contactPhone})`, margin + 4, y + 6.5);
  y += 14;

  // ── Itinerary ──
  doc.setTextColor(30, 41, 59);

  for (const day of data.itinerary) {
    // Check page break
    if (y > 260) {
      doc.addPage();
      y = margin;
    }

    // Day header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`D${day.day}`, margin, y);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(day.date, margin + 10, y);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(day.title, margin + 28, y);
    y += 3;

    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin + 28, y, W - margin, y);
    y += 4;

    // Stops
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const stop of day.stops) {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }

      const icon = TYPE_ICONS[stop.type] || '[?]';
      doc.setTextColor(100, 116, 139);
      doc.text(icon, margin + 28, y);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(stop.name, margin + 38, y);

      if (stop.time) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        const timeW = doc.getTextWidth(stop.time);
        doc.text(stop.time, W - margin - timeW, y);
      }

      y += 4;

      if (stop.note) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`  ${stop.note}`, margin + 38, y);
        y += 3.5;
        doc.setFontSize(9);
      }

      doc.setFont('helvetica', 'normal');
    }

    y += 4;
  }

  // ── Footer ──
  if (y > 275) {
    doc.addPage();
    y = margin;
  }
  y = Math.max(y, 270);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, y, W - margin, y);
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Have a wonderful trip! Contact LINE support or emergency hotline anytime.', W / 2, y, { align: 'center' });

  // ── Download ──
  const filename = `${data.tourName}_ActionGuide.pdf`;
  doc.save(filename);
}
