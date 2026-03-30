/**
 * 團員匯入模組測試
 */
import * as XLSX from 'xlsx';
import { parseExcelMembers } from './member-import';

// 模擬 21 人團 (蘇國棟團)
const mockData = [
  { 姓名: '蘇國棟', 英文名: 'SU, KUO-TUNG', 性別: '男', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 12 },
  { 姓名: '蘇太太', 英文名: 'SU, TAI-TAI', 性別: '女', 房型: 'Double', 飲食: '不吃生食', 航班: '華航 CI130/CI131', 差點: 28 },
  { 姓名: '王大明', 英文名: 'WANG, DA-MING', 性別: '男', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 15 },
  { 姓名: '王小美', 英文名: 'WANG, XIAO-MEI', 性別: '女', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 22 },
  { 姓名: '陳志明', 英文名: 'CHEN, ZHI-MING', 性別: '男', 房型: 'Single', 飲食: '不吃牛肉', 航班: '長榮 BR116/BR115', 差點: 10 },
  { 姓名: '林俊傑', 英文名: 'LIN, JUN-JIE', 性別: '男', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 18 },
  { 姓名: '林太太', 英文名: 'LIN, TAI-TAI', 性別: '女', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 30 },
  { 姓名: '張三豐', 英文名: 'CHANG, SAN-FENG', 性別: '男', 房型: 'Double', 飲食: '', 航班: '長榮 BR116/BR115', 差點: 8 },
  { 姓名: '張太太', 英文名: 'CHANG, TAI-TAI', 性別: '女', 房型: 'Double', 飲食: '素食', 航班: '長榮 BR116/BR115', 差點: 25 },
  { 姓名: '李大華', 英文名: 'LI, DA-HUA', 性別: '男', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 14 },
  { 姓名: '李太太', 英文名: 'LI, TAI-TAI', 性別: '女', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 26 },
  { 姓名: '黃建國', 英文名: 'HUANG, JIAN-GUO', 性別: '男', 房型: 'Single', 飲食: '', 航班: '華航 CI130/CI131', 差點: 16 },
  { 姓名: '趙四海', 英文名: 'CHAO, SI-HAI', 性別: '男', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 20 },
  { 姓名: '趙太太', 英文名: 'CHAO, TAI-TAI', 性別: '女', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 32 },
  { 姓名: '吳五郎', 英文名: 'WU, WU-LANG', 性別: '男', 房型: 'Double', 飲食: '', 航班: '長榮 BR116/BR115', 差點: 11 },
  { 姓名: '吳太太', 英文名: 'WU, TAI-TAI', 性別: '女', 房型: 'Double', 飲食: '不吃海鮮', 航班: '長榮 BR116/BR115', 差點: 27 },
  { 姓名: '周六福', 英文名: 'CHOU, LIU-FU', 性別: '男', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 19 },
  { 姓名: '周太太', 英文名: 'CHOU, TAI-TAI', 性別: '女', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 24 },
  { 姓名: '鄭七郎', 英文名: 'CHENG, QI-LANG', 性別: '男', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 13 },
  { 姓名: '鄭太太', 英文名: 'CHENG, TAI-TAI', 性別: '女', 房型: 'Double', 飲食: '', 航班: '華航 CI130/CI131', 差點: 29 },
  { 姓名: '孫八仙', 英文名: 'SUN, BA-XIAN', 性別: '男', 房型: 'Single', 飲食: '', 航班: '長榮 BR116/BR115', 差點: 17 },
];

// Create xlsx buffer
const ws = XLSX.utils.json_to_sheet(mockData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Members');
const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

console.log('--- 團員匯入測試 (21人蘇國棟團) ---\n');

const start = performance.now();
const result = parseExcelMembers(buffer);
const elapsed = Math.round(performance.now() - start);

console.log(`⏱ 解析耗時: ${elapsed}ms`);
console.log(`\n--- 統計 ---`);
console.log(`✅ 總人數: ${result.stats.total}`);
console.log(`👨 男性: ${result.stats.male}`);
console.log(`👩 女性: ${result.stats.female}`);
console.log(`🏨 雙人房: ${result.stats.doubleRooms}`);
console.log(`🔑 單人房: ${result.stats.singleRooms}`);
console.log(`🍽 飲食備註: ${result.stats.dietaryNotes}`);

console.log(`\n--- 分房結果 (${result.rooms.length} 間) ---`);
result.rooms.forEach(r => {
  console.log(`  ${r.roomNo} [${r.type}] → ${r.guests.map(g => g.name).join(', ')}`);
});

if (result.errors.length > 0) {
  console.log('\n--- 警告 ---');
  result.errors.forEach(e => console.log(`  ⚠️ ${e}`));
}

// Assertions
const pass = (cond: boolean, msg: string) => console.log(cond ? `✅ ${msg}` : `❌ ${msg}`);
console.log('\n--- 驗證 ---');
pass(result.stats.total === 21, `Total = 21 (got ${result.stats.total})`);
pass(result.stats.male === 12, `Male = 12 (got ${result.stats.male})`);
pass(result.stats.female === 9, `Female = 9 (got ${result.stats.female})`);
pass(result.stats.singleRooms === 3, `Single = 3 (got ${result.stats.singleRooms})`);
pass(result.stats.doubleRooms === 9, `Double rooms = 9 (got ${result.stats.doubleRooms})`);
pass(result.rooms.length === 12, `Total rooms = 12 (got ${result.rooms.length})`);
pass(result.stats.dietaryNotes === 4, `Dietary notes = 4 (got ${result.stats.dietaryNotes})`);
pass(elapsed < 10000, `Parse < 10s (got ${elapsed}ms)`);
pass(result.errors.length === 0, `No errors (got ${result.errors.length})`);
