/**
 * 御之旅 — 團員 Excel/CSV 批量匯入引擎
 * Task 5.1: 支援 xlsx 解析、欄位映射、自動分房預覽
 */
import * as XLSX from 'xlsx';

export interface ImportedMember {
  id: number;
  name: string;
  nameEn: string;
  gender: 'M' | 'F';
  room: 'single' | 'double';
  diet: string;
  flight: string;
  handicap: number;
}

export interface RoomAssignment {
  roomNo: number;
  type: string;
  guests: ImportedMember[];
}

export interface ImportResult {
  members: ImportedMember[];
  rooms: RoomAssignment[];
  errors: string[];
  stats: {
    total: number;
    male: number;
    female: number;
    singleRooms: number;
    doubleRooms: number;
    dietaryNotes: number;
  };
}

// Column header aliases for flexible mapping
const HEADER_MAP: Record<string, string[]> = {
  name:     ['姓名', '名字', 'name', '中文名'],
  nameEn:   ['英文名', 'english', 'english name', 'name_en', 'nameen', '護照名'],
  gender:   ['性別', 'gender', 'sex'],
  room:     ['房型', 'room', 'room type', 'room_type', '房間'],
  diet:     ['飲食', '特殊餐飲', 'dietary', 'diet', '忌口', '飲食限制'],
  flight:   ['航班', 'flight', '班機', '航班資訊'],
  handicap: ['差點', 'handicap', 'hc', 'hdcp'],
};

function normalizeHeader(raw: string): string | null {
  const lower = raw.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.some(a => lower.includes(a.toLowerCase()))) return field;
  }
  return null;
}

function parseGender(val: string): 'M' | 'F' {
  const v = (val || '').trim().toUpperCase();
  if (v === 'F' || v === '女' || v === 'FEMALE') return 'F';
  return 'M';
}

function parseRoom(val: string): 'single' | 'double' {
  const v = (val || '').trim().toLowerCase();
  if (v.includes('single') || v.includes('單')) return 'single';
  return 'double';
}

/**
 * Parse Excel/CSV file buffer into structured member data
 */
export function parseExcelMembers(buffer: ArrayBuffer): ImportResult {
  const errors: string[] = [];
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (raw.length === 0) {
    return { members: [], rooms: [], errors: ['Excel 檔案為空或格式不正確'], stats: { total: 0, male: 0, female: 0, singleRooms: 0, doubleRooms: 0, dietaryNotes: 0 } };
  }

  // Map headers
  const headers = Object.keys(raw[0]);
  const fieldMap: Record<string, string> = {};
  for (const h of headers) {
    const mapped = normalizeHeader(h);
    if (mapped) fieldMap[mapped] = h;
  }

  if (!fieldMap.name) {
    errors.push('找不到「姓名」欄位，請確認 Excel 表頭包含「姓名」。');
    return { members: [], rooms: [], errors, stats: { total: 0, male: 0, female: 0, singleRooms: 0, doubleRooms: 0, dietaryNotes: 0 } };
  }

  const members: ImportedMember[] = [];
  raw.forEach((row, idx) => {
    const name = String(row[fieldMap.name] || '').trim();
    if (!name) {
      errors.push(`第 ${idx + 2} 行：姓名為空，已跳過`);
      return;
    }
    members.push({
      id: idx + 1,
      name,
      nameEn: fieldMap.nameEn ? String(row[fieldMap.nameEn] || '').trim().toUpperCase() : '',
      gender: fieldMap.gender ? parseGender(String(row[fieldMap.gender])) : 'M',
      room: fieldMap.room ? parseRoom(String(row[fieldMap.room])) : 'double',
      diet: fieldMap.diet ? String(row[fieldMap.diet] || '').trim() : '',
      flight: fieldMap.flight ? String(row[fieldMap.flight] || '').trim() : '',
      handicap: fieldMap.handicap ? parseInt(String(row[fieldMap.handicap])) || 0 : 0,
    });
  });

  // Auto room assignment
  const rooms = autoAssignRooms(members);

  const stats = {
    total: members.length,
    male: members.filter(m => m.gender === 'M').length,
    female: members.filter(m => m.gender === 'F').length,
    singleRooms: members.filter(m => m.room === 'single').length,
    doubleRooms: Math.ceil(members.filter(m => m.room === 'double').length / 2),
    dietaryNotes: members.filter(m => m.diet).length,
  };

  return { members, rooms, errors, stats };
}

/**
 * Auto room assignment: pair double-room members, assign singles
 */
export function autoAssignRooms(members: ImportedMember[]): RoomAssignment[] {
  const rooms: RoomAssignment[] = [];
  let roomNo = 201;

  // Singles first
  const singles = members.filter(m => m.room === 'single');
  singles.forEach(m => {
    rooms.push({ roomNo: roomNo++, type: '單人房', guests: [m] });
  });

  // Doubles: pair by gender then by flight
  const doubles = members.filter(m => m.room === 'double');
  const maleDoubles = doubles.filter(m => m.gender === 'M');
  const femaleDoubles = doubles.filter(m => m.gender === 'F');

  const pairUp = (list: ImportedMember[]) => {
    // Sort by flight to keep same-flight people together
    const sorted = [...list].sort((a, b) => a.flight.localeCompare(b.flight));
    for (let i = 0; i < sorted.length; i += 2) {
      if (sorted[i + 1]) {
        rooms.push({ roomNo: roomNo++, type: '兩人房', guests: [sorted[i], sorted[i + 1]] });
      } else {
        rooms.push({ roomNo: roomNo++, type: '兩人房 (單佔)', guests: [sorted[i]] });
      }
    }
  };

  pairUp(maleDoubles);
  pairUp(femaleDoubles);

  return rooms;
}

/**
 * Parse CSV string as fallback
 */
export function parseCsvMembers(csvText: string): ImportResult {
  const workbook = XLSX.read(csvText, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return parseExcelMembers(buffer);
}
