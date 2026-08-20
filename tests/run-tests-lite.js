// รันโค้ดจริงจาก workflow/imjai-line-ai-agent-lite.json
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('workflow/imjai-line-ai-agent-lite.json', 'utf8'));
const code = (n) => wf.nodes.find((x) => x.name === n).parameters.jsCode;

const EV = { line_user_id: 'U123', reply_token: 'RT', message_text: '', received_at: '2026-08-20 18:30:00',
             sheet_id: 'SHEET', discord_webhook: 'https://discord/x', order_web_url: '' };

// ── รันโค้ดจริงของ node "เตรียมข้อมูลให้ AI" ──
function runPrepare(db, myOrders, msg, memo = []) {
  const ev = { ...EV, message_text: msg };
  const wrap = (arr) => ({ all: () => arr.map((json) => ({ json })) });
  const $ = (n) => {
    if (n === '⚙️ ตั้งค่าระบบ (แก้ที่นี่ที่เดียว)') return { first: () => ({ json: ev }) };
    if (n === 'อ่านข้อมูลร้าน (StoreProfile)') return wrap(db.store);
    if (n === 'อ่าน FAQ (KnowledgeBase)') return wrap(db.faq);
    if (n === 'อ่านเมนู (Products)') return wrap(db.menu);
    if (n === 'อ่านออเดอร์ของลูกค้า') return wrap(myOrders);
    if (n === 'อ่านคลังคำตอบที่ยืนยันแล้ว') return wrap(memo);
    throw new Error(n);
  };
  return new Function('$input', '$', 'require', code('เตรียมข้อมูลให้ AI'))(wrap(memo), $, require)[0].json;
}

// ── รันโค้ดจริงของ node "ตรวจคำตอบ" ──
function runCheck(msg, aiReply, _unused, webUrl = '') {
  const ev = { ...EV, message_text: msg, order_web_url: webUrl };
  const $input = { first: () => ({ json: { output: aiReply } }) };
  const $ = (n) => {
    if (n === '⚙️ ตั้งค่าระบบ (แก้ที่นี่ที่เดียว)') return { first: () => ({ json: ev }) };
    throw new Error(n);
  };
  return new Function('$input', '$', 'require', code('ตรวจคำตอบ'))($input, $, require)[0].json;
}

// อ่าน CSV จริงจากโฟลเดอร์ data/ เพื่อทดสอบกับข้อมูลชุดเดียวกับที่จะ import เข้า Sheet
function readCsv(f) {
  const txt = fs.readFileSync('data/' + f, 'utf8').replace(/^\uFEFF/, '');
  const rows = []; let cur = ['']; let q = false;
  for (const ch of txt) {
    if (q) { if (ch === '"') q = false; else cur[cur.length - 1] += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') cur.push('');
    else if (ch === '\n') { rows.push(cur); cur = ['']; }
    else if (ch !== '\r') cur[cur.length - 1] += ch;
  }
  if (cur.length > 1 || cur[0]) rows.push(cur);
  const head = rows.shift();
  return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const SHEET = { store: readCsv('StoreProfile.csv'), faq: readCsv('KnowledgeBase.csv'), menu: readCsv('Products.csv') };

let pass = 0, fail = 0;
const check = (name, cond, detail) => { cond ? pass++ : fail++; console.log(`${cond ? '✅ PASS' : '❌ FAIL'} ${name}${detail ? '\n        ' + detail : ''}`); };

console.log('=== 1) การเตรียมข้อมูลส่งให้ AI ===');
const p1 = runPrepare(SHEET, [], 'ลาเต้ราคาเท่าไหร่');
check('รวมข้อมูลร้าน/FAQ/เมนู ครบ 3 หมวด',
  p1.context_text.includes('=== ข้อมูลร้าน ===') && p1.context_text.includes('=== คำถามที่พบบ่อย ===') && p1.context_text.includes('=== เมนูและราคา'));
check('ราคาลาเต้ถูกส่งให้ AI', p1.context_text.includes('ลาเต้') && p1.context_text.includes('ราคา 70 บาท'));
check('เมนูที่ของหมดถูกทำเครื่องหมายชัดเจน (กัน AI ตอบว่ายังมีขาย)',
  p1.context_text.includes('ต้มยำกุ้งน้ำข้น') && p1.context_text.includes('⛔ หมด/ไม่พร้อมขาย'),
  p1.context_text.split('\n').find((l) => l.includes('FD-05')));
check('สารก่อภูมิแพ้ถูกส่งให้ AI ครบ',
  p1.context_text.includes('สารก่อภูมิแพ้: กุ้ง (Shellfish), นม') && p1.context_text.includes('สารก่อภูมิแพ้: ไม่มี'));
check('อ่านฐานข้อมูลครบทั้ง 3 แท็บ',
  SHEET.store.length === 18 && SHEET.faq.length === 15 && SHEET.menu.length === 17,
  `StoreProfile ${SHEET.store.length} / KnowledgeBase ${SHEET.faq.length} / Products ${SHEET.menu.length} แถว`);
check('ลูกค้าใหม่ที่ยังไม่เคยสั่ง แสดงผลถูกต้อง',
  p1.context_text.includes('ยังไม่เคยสั่งอาหารผ่านแชทนี้') && p1.order_count === 0);

const ORDERS = [{ order_id: 'ORD-20260820-183000', created_at: '2026-08-20 18:30:00', items: 'ลาเต้เย็น x1',
                  total: '70', order_type: 'pickup', status: 'ครัวกำลังทำ', eta: '18:50', note: '' }];
const p2 = runPrepare(SHEET, ORDERS, 'ของยังไม่ได้เลย รออีกนานไหมคะ');
check('ออเดอร์ที่สั่งจากเว็บ ถูกดึงมาให้ AI ตอบเรื่อง "รอนานไหม" ทาง LINE',
  p2.context_text.includes('ORD-20260820-183000') && p2.context_text.includes('สถานะ: ครัวกำลังทำ') && p2.context_text.includes('ประมาณ 18:50'),
  p2.context_text.split('=== ออเดอร์ของลูกค้าคนนี้ ===')[1].trim().split('\n')[0]);

const MEMO = [{ id: 'MEM-0003', question: 'ขอใบกำกับภาษีได้ไหม', answer: 'ขอได้ค่ะ แจ้งชื่อบริษัทและเลขผู้เสียภาษีกับทีมงานนะคะ', verified: 'TRUE' }];
const p3 = runPrepare(SHEET, [], 'ขอใบกำกับภาษีหน่อยค่ะ', MEMO);
check('คลังคำตอบที่ทีมงานยืนยันแล้ว ถูกส่งให้ AI ใช้เป็นแนวทาง',
  p3.context_text.includes('คำตอบมาตรฐานที่ทีมงานยืนยันแล้ว') && p3.context_text.includes('ขอใบกำกับภาษีได้ไหม') && p3.memo_count === 1);

const p4 = runPrepare(SHEET, [], 'สวัสดีค่ะ', []);
check('ยังไม่มีคลังคำตอบ ก็ต้องทำงานได้ปกติ', p4.memo_count === 0 && !p4.context_text.includes('คำตอบมาตรฐาน'));

console.log('\n=== 2) การตัดสินใจส่งต่อแอดมิน ===');
const T = [
  ['ถามราคาปกติ → บอทตอบเอง', 'ลาเต้ราคาเท่าไหร่คะ', 'ลาเต้ 70 บาทค่ะ ☕', '', false],
  ['อยากสั่งอาหาร → ส่งลิงก์เว็บ ไม่ต้องแจ้งแอดมิน', 'ขอสั่งลาเต้เย็นค่ะ', 'ลาเต้เย็น 70 บาทค่ะ สั่งได้ที่ https://order.imjaicafe.com เลยนะคะ', '', false],
  ['AI ใส่ [[ADMIN]] เอง → แจ้งแอดมิน', 'ขอใบกำกับภาษีด้วยค่ะ', 'เรื่องนี้ขอให้ทีมงานดูแลต่อนะคะ\n[[ADMIN]]', '', true],
  ['ขอคืนเงิน → แจ้งแอดมิน', 'อาหารมีปัญหา ขอเงินคืนค่ะ', 'ขออภัยค่ะ ส่งเรื่องให้ทีมงานแล้วนะคะ', '', true],
  ['ขอยกเลิกออเดอร์ → แจ้งแอดมิน', 'ขอยกเลิกออเดอร์ค่ะ', 'รับเรื่องแล้วค่ะ', '', true],
  ['ขอส่วนลด → แจ้งแอดมิน', 'ส่งช้ามาก ขอส่วนลดหน่อยค่ะ', 'ขออภัยค่ะ', '', true],
  ['เจอเส้นผม (เรื่องความปลอดภัย) → แจ้งแอดมิน', 'เจอเส้นผมในอาหารค่ะ', 'ขออภัยอย่างสูงค่ะ', '', true],
  ['ขู่ฟ้อง สคบ. → แจ้งแอดมิน', 'จะแจ้ง สคบ. แล้วนะ', 'ขออภัยค่ะ', '', true],
  ['เร่งด่วน → แจ้งแอดมิน', 'ด่วนมากค่ะ รออยู่หน้าร้านแล้ว', 'กำลังเช็คให้นะคะ', '', true],
  ['ขอคุยกับแอดมิน → แจ้งแอดมิน', 'ขอคุยกับแอดมินหน่อยค่ะ', 'ได้เลยค่ะ กำลังตามให้นะคะ', '', true],
];
for (const [name, msg, reply, oid, expect] of T) {
  const r = runCheck(msg, reply, oid);
  check(name, r.need_admin === expect, `need_admin=${r.need_admin}${r.reason ? ' | ' + r.reason : ''}${r.new_order ? ' | order=' + r.new_order : ''}`);
}

console.log('\n=== 3) การตัดมาร์กเกอร์ [[ADMIN]] ออกก่อนส่งลูกค้า ===');
const r = runCheck('ขอใบกำกับภาษี', 'เรื่องนี้ขอให้ทีมงานดูแลต่อนะคะ\n[[ADMIN]]', '');
check('ลูกค้าต้องไม่เห็นคำว่า [[ADMIN]]', !r.reply_text.includes('[[ADMIN]]'), `ข้อความที่ส่งจริง: "${r.reply_text}"`);
check('บอทขัดข้องยังมีข้อความสำรอง', runCheck('สวัสดี', '', '').reply_text.length > 10);

console.log('\n=== 4) สั่งอาหาร = ส่ง QR ไปเว็บ ===');
const noWeb = runCheck('ขอสั่งอาหารหน่อย', 'ตอนนี้สั่งที่ร้านหรือโทร 02-123-4567 ได้เลยค่ะ', '', '');
check('ยังไม่มีเว็บ → ไม่แนบ QR แนะนำช่องทางอื่นแทน', noWeb.messages.length === 1 && noWeb.messages[0].type === 'text');

const withWeb = runCheck('ขอลิงก์สั่งอาหารหน่อย', 'สั่งผ่านเว็บได้ที่ https://order.imjaicafe.com เลยค่ะ\n[[QR]]', '', 'https://order.imjaicafe.com');
check('มีเว็บแล้ว + AI สั่ง [[QR]] → แนบรูป QR ให้ลูกค้าสแกน',
  withWeb.messages.length === 2 && withWeb.messages[1].type === 'image' && withWeb.messages[1].originalContentUrl.includes('order.imjaicafe.com'),
  withWeb.messages[1]?.originalContentUrl);
check('ลูกค้าต้องไม่เห็นคำว่า [[QR]]', !withWeb.reply_text.includes('[[QR]]'), `ข้อความที่ส่งจริง: "${withWeb.reply_text}"`);

const qrNoUrl = runCheck('ขอลิงก์', 'ค่ะ\n[[QR]]', '', '');
check('AI สั่ง [[QR]] แต่ยังไม่ได้ตั้งเว็บ → ไม่แนบรูป ไม่พัง', qrNoUrl.messages.length === 1);

console.log(`\n=== สรุป: ผ่าน ${pass} / ${pass + fail} ===`);
process.exit(fail ? 1 : 0);
