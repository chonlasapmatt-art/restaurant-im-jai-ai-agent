// พิสูจน์เชิงโครงสร้าง: ทุกเส้นทางที่ทำให้ payment_status กลายเป็น paid ต้องผ่าน Wait node
// (แอดมินต้องกดยืนยันจากหน้ายืนยันเท่านั้น — AI หรือ webhook อื่นสั่งจ่ายเงินเองไม่ได้)
const wf = JSON.parse(require('fs').readFileSync('workflow/imjai-line-ai-agent-v2.json', 'utf8'));
const WAIT = '⏸ Wait for Payment Confirm';
const ACTION_NODES = [
  'Update Order → ชำระเงินแล้ว',
  'Push LINE — แจ้งลูกค้าว่าชำระเงินแล้ว',
];
const TRIGGERS = wf.nodes.filter(n => /webhook$|errorTrigger$/.test(n.type)).map(n => n.name);

function adj(skipWait) {
  const a = {};
  for (const [src, out] of Object.entries(wf.connections)) {
    if (skipWait && src === WAIT) continue; // ตัดขาออกของ Wait = ตัดสะพาน
    for (const branch of (out.main || [])) for (const c of (branch || [])) (a[src] ??= []).push(c.node);
  }
  return a;
}
function reach(a, starts) {
  const seen = new Set(), st = [...starts];
  while (st.length) { const n = st.pop(); if (seen.has(n)) continue; seen.add(n); for (const m of (a[n] || [])) st.push(m); }
  return seen;
}

const withWait = reach(adj(false), TRIGGERS);
const withoutWait = reach(adj(true), TRIGGERS);

let fail = 0;
console.log('trigger nodes:', TRIGGERS.join(', '), '\n');
for (const n of ACTION_NODES) {
  const reachableNormally = withWait.has(n);
  const bypass = withoutWait.has(n);
  const ok = reachableNormally && !bypass;
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${n}\n     ต่อถึงได้ตามปกติ=${reachableNormally} | ลัดข้าม Wait ได้=${bypass}`);
}

// AI Agent tool "Create Order Tool" ต้องเขียนแค่ payment_status='unpaid'/status='รอชำระเงิน' เท่านั้น ห้ามมีคำว่า paid ตรง ๆ
const createOrderTool = wf.nodes.find(n => n.name === 'Create Order Tool');
const colValues = JSON.stringify(createOrderTool.parameters.columns.value);
const aiCanMarkPaid = /"payment_status"\s*:\s*"[^"]*paid[^"]*"/i.test(colValues.replace('"payment_status":"unpaid"', ''));
console.log(`\n${!aiCanMarkPaid ? '✅' : '❌'} Create Order Tool เขียน payment_status ตายตัวเป็น 'unpaid' เท่านั้น (AI แก้เป็น paid เองไม่ได้)`);
if (aiCanMarkPaid) fail++;

// Wait ต้องต่อจาก Discord แจ้งออเดอร์ใหม่ และมาจาก Order Created? เท่านั้น
const inbound = Object.entries(wf.connections).filter(([, o]) => (o.main || []).some(b => (b || []).some(c => c.node === WAIT))).map(([s]) => s);
console.log(`\nnode ที่ต่อเข้า "${WAIT}": ${inbound.join(', ')}`);

const orderCreatedRoute = wf.connections['Order Created?'].main;
console.log('Order Created? output 0 (มีออเดอร์ใหม่) →', orderCreatedRoute[0].map(c => c.node).join(', '));

console.log(fail ? `\n❌ พบช่องโหว่ ${fail} จุด` : '\n✅ ยืนยัน: ไม่มีเส้นทางใดข้าม Wait for Payment Confirm ได้ และ AI สั่ง paid เองไม่ได้');
process.exit(fail ? 1 : 0);
