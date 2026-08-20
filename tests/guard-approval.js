// พิสูจน์เชิงโครงสร้าง: ทุกเส้นทางที่ไปถึง node ที่ "ลงมือทำจริง" ต้องผ่าน Wait node
const wf = JSON.parse(require('fs').readFileSync('workflow/imjai-line-ai-agent-full.json', 'utf8'));
const WAIT = '⏸ Wait for Human Approval';
const ACTION_NODES = [
  'Execute Action (Mock Refund/Cancel/Discount API)',
  'Update Ticket → ดำเนินการแล้ว',
  'Update Ticket → ไม่อนุมัติ/หมดเวลา',
  'Push ผลอนุมัติให้ลูกค้า (LINE)',
  'Push ผลไม่อนุมัติให้ลูกค้า (LINE)',
];
const TRIGGERS = wf.nodes.filter(n => /webhook$|errorTrigger$/.test(n.type)).map(n => n.name);

// สร้าง adjacency เฉพาะ main connection (ตัด Wait ออก = ตัดสะพาน)
function adj(skipWait) {
  const a = {};
  for (const [src, out] of Object.entries(wf.connections)) {
    if (skipWait && src === WAIT) continue;               // ตัดขาออกของ Wait
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

// Wait ต้องต่อจาก Discord แจ้งทีม และมาจาก Route สาขา approval เท่านั้น
const inbound = Object.entries(wf.connections).filter(([, o]) => (o.main || []).some(b => (b || []).some(c => c.node === WAIT))).map(([s]) => s);
console.log(`\nnode ที่ต่อเข้า "${WAIT}": ${inbound.join(', ')}`);

// Route สาขา 0 = ต้องขออนุมัติ ต้องนำไปสู่ Wait
const route = wf.connections['Route: ต้องส่งต่อแอดมินไหม?'].main;
console.log('Route output 0 (ต้องขออนุมัติ) →', route[0].map(c => c.node).join(', '));
console.log('Route output 1 (ขอคุยแอดมินด่วน) →', route[1].map(c => c.node).join(', '));
console.log('Route output 2 (ตอบได้เลย) →', route[2].map(c => c.node).join(', '));

console.log(fail ? `\n❌ พบช่องโหว่ ${fail} จุด` : '\n✅ ยืนยัน: ไม่มีเส้นทางใดข้าม Wait for Human Approval ได้');
process.exit(fail ? 1 : 0);
