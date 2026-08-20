// รัน logic จริงของ node ยืนยันการชำระเงิน (ไม่ได้เขียนโค้ดจำลองใหม่)
// ครอบคลุม: ตรวจ secret, ตรวจฟิลด์ที่จำเป็น, และการรวมข้อมูลชำระเงิน + แถวออเดอร์ที่เจอ/ไม่เจอ
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('workflow/imjai-line-ai-agent-full.json', 'utf8'));
const node = (n) => wf.nodes.find((x) => x.name === n);

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'} ${name}`);
  if (detail !== undefined) console.log('       ', detail);
}

// ---------- 1) Parse Payment Event ----------
const parseCode = node('Parse Payment Event').parameters.jsCode;
function runParse(cfg) {
  const $json = cfg;
  return new Function('$json', parseCode)($json)[0].json;
}

const CFG_OK_SECRET = { sheet_id: 'S', discord_webhook_url: 'D', payment_webhook_secret: 'letmein123', admin_contact_note: 'note' };
const CFG_NO_SECRET = { sheet_id: 'S', discord_webhook_url: 'D', payment_webhook_secret: 'CHANGE_ME_PAYMENT_SECRET', admin_contact_note: 'note' };

check('secret ถูกต้อง → secret_valid = true',
  runParse({ ...CFG_OK_SECRET, body: { order_id: 'ORD-1', amount: 100, secret: 'letmein123' } }).secret_valid === true);

check('secret ผิด → secret_valid = false',
  runParse({ ...CFG_OK_SECRET, body: { order_id: 'ORD-1', amount: 100, secret: 'wrong' } }).secret_valid === false);

check('ยังไม่ได้ตั้ง secret (ยังเป็นค่า default) → ไม่บล็อก (secret_valid = true)',
  runParse({ ...CFG_NO_SECRET, body: { order_id: 'ORD-1', amount: 100 } }).secret_valid === true);

check('header x-payment-secret ใช้แทนได้',
  runParse({ ...CFG_OK_SECRET, body: { order_id: 'ORD-1', amount: 100 }, headers: { 'x-payment-secret': 'letmein123' } }).secret_valid === true);

check('ครบ order_id + amount → has_required_fields = true',
  runParse({ ...CFG_OK_SECRET, body: { order_id: 'ORD-1', amount: 100, secret: 'letmein123' } }).has_required_fields === true);

check('ไม่มี order_id → has_required_fields = false',
  runParse({ ...CFG_OK_SECRET, body: { amount: 100, secret: 'letmein123' } }).has_required_fields === false);

check('amount = 0 ยังถือว่าครบ (0 คือค่าที่ถูกต้อง ไม่ใช่ค่าว่าง)',
  runParse({ ...CFG_OK_SECRET, body: { order_id: 'ORD-1', amount: 0, secret: 'letmein123' } }).has_required_fields === true);

const aliasResult = runParse({ ...CFG_OK_SECRET, body: { orderId: 'ORD-2', total: 250, ref: 'TXN-9', channel: 'PromptPay', secret: 'letmein123' } });
check('รองรับชื่อฟิลด์ทางเลือก (orderId/total/ref/channel)',
  aliasResult.order_id === 'ORD-2' && aliasResult.amount === 250 && aliasResult.payment_ref === 'TXN-9' && aliasResult.method === 'PromptPay',
  JSON.stringify({ order_id: aliasResult.order_id, amount: aliasResult.amount, payment_ref: aliasResult.payment_ref, method: aliasResult.method }));

// ---------- 2) Merge Payment + Order ----------
const mergeCode = node('Merge Payment + Order').parameters.jsCode;
function runMerge(paymentJson, orderRowJson) {
  const $input = { first: () => ({ json: orderRowJson }) };
  const $ = (name) => {
    if (name === 'Parse Payment Event') return { first: () => ({ json: paymentJson }) };
    throw new Error('unknown node ' + name);
  };
  return new Function('$input', '$', mergeCode)($input, $)[0].json;
}

const payment = { order_id: 'ORD-20260820-183000', amount: 110, payment_ref: 'TXN-1', method: 'PromptPay', paid_at: '2026-08-20 18:31:00' };

check('เจอออเดอร์ในชีต → found = true พร้อมข้อมูลลูกค้าครบ',
  (() => {
    const r = runMerge(payment, {
      order_id: 'ORD-20260820-183000', customer_name: 'คุณส้ม', phone: '081-234-5671',
      line_user_id: 'Uabc123line', items: 'ลาเต้เย็น x1', total: '110', order_type: 'pickup', status: 'รับออเดอร์แล้ว', eta: '18:50',
    });
    return r.found === true && r.customer_name === 'คุณส้ม' && r.line_user_id === 'Uabc123line' && r.eta === '18:50';
  })());

check('หาไม่เจอในชีต (แถวว่าง) → found = false',
  runMerge(payment, {}).found === false);

console.log(`\n=== สรุป: ผ่าน ${pass} / ${pass + fail} ===`);
process.exit(fail ? 1 : 0);
