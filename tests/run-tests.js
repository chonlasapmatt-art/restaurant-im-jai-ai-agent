// รัน logic จริงที่อยู่ใน workflow JSON (ไม่ได้เขียนโค้ดจำลองใหม่)
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('workflow/imjai-line-ai-agent-full.json', 'utf8'));
const node = (n) => wf.nodes.find((x) => x.name === n);

// ---------- 1) ดึง "สมการจริง" จาก Complaint Ticket Tool ----------
const tool = node('Complaint Ticket Tool').parameters.columns.value;
const strip = (e) => e.replace(/^=\{\{\s*/, '').replace(/\s*\}\}$/, '');
const EXPR = {
  is_high_risk: strip(tool.is_high_risk),
  action_requested: strip(tool.action_requested),
  requires_human_approval: strip(tool.requires_human_approval),
  status: strip(tool.status),
  assigned_to: strip(tool.assigned_to),
};

function evalTicketExpr(exprKey, aiArgs) {
  const $fromAI = (name) => aiArgs[name];
  const $now = { setZone: () => ({ toFormat: () => '260820-120000' }) };
  const $ = () => ({ first: () => ({ json: { line_user_id: aiArgs.__uid || 'U-test' } }) });
  return new Function('$fromAI', '$now', '$', 'return (' + EXPR[exprKey] + ');')($fromAI, $now, $);
}

// ---------- 2) รันโค้ดจริงของ Extract Agent Result ----------
const extractCode = node('Extract Agent Result').parameters.jsCode;
function runExtract({ cfg, agentOut, toolsCalled, ticket }) {
  const $input = { first: () => ({ json: { output: agentOut, intermediateSteps: toolsCalled.map((t) => ({ action: { tool: t } })) } }) };
  const $ = (name) => {
    if (name === '⚙️ Config') return { first: () => ({ json: cfg }) };
    if (name === 'Complaint Ticket Tool') return { isExecuted: !!ticket, first: () => ({ json: ticket }) };
    throw new Error('unknown node ' + name);
  };
  return new Function('$input', '$', 'require', extractCode)($input, $, require)[0].json;
}

// ---------- 3) รันโค้ดจริงของ Parse Approval Decision ----------
const decCode = node('Parse Approval Decision').parameters.jsCode;
function runDecision(prev, incoming) {
  const $input = { first: () => ({ json: incoming }) };
  const $ = (n) => ({ first: () => ({ json: prev }) });
  return new Function('$input', '$', 'require', decCode)($input, $, require)[0].json;
}

// ---------- ตัวช่วยจำลอง 1 เคส ----------
const CFG = { sheet_id: 'S', store_name: 'อิ่มใจ', approval_secret: 'x', message_text: '', line_user_id: 'U123' };

function simulate(tc) {
  const cfg = { ...CFG, message_text: tc.customer };
  let ticket = null;
  if (tc.ai.tool_call) {
    const args = { ...tc.ai.tool_call, __uid: cfg.line_user_id };
    ticket = {
      ticket_id: 'TK-260820-120000',
      category: args.category,
      message: args.customer_message,
      sentiment: args.sentiment,
      order_id: args.order_id || '',
      is_high_risk: evalTicketExpr('is_high_risk', args), // สมการคืนค่า 'TRUE'/'FALSE' มาแล้ว
      action_requested: evalTicketExpr('action_requested', args),
      requires_human_approval: evalTicketExpr('requires_human_approval', args),
      status: evalTicketExpr('status', args),
      assigned_to: evalTicketExpr('assigned_to', args),
    };
  }
  const res = runExtract({ cfg, agentOut: tc.ai.reply, toolsCalled: tc.ai.tools || [], ticket });
  return { ticket, res };
}

// ================= TEST CASES =================
const T = [
  { id: 'TC-01', name: 'FAQ — ถามเวลาเปิดปิด', type: 'FAQ',
    customer: 'ร้านเปิดกี่โมงคะ',
    ai: { tools: ['Knowledge Tool'], reply: 'เปิดทุกวัน 07:00–20:00 น. ครัวปิดรับออเดอร์ 19:30 น. ค่ะ' },
    expect: { route: 'normal', approval: false, sentiment: '' } },

  { id: 'TC-02', name: 'Product — ถามราคาลาเต้', type: 'Product',
    customer: 'ลาเต้เย็นราคาเท่าไหร่คะ',
    ai: { tools: ['Product Tool'], reply: 'ลาเต้ (ร้อน/เย็น) แก้วละ 70 บาทค่ะ มีโปรซื้อคู่เบเกอรีลด 15 บาทด้วยนะคะ' },
    expect: { route: 'normal', approval: false } },

  { id: 'TC-03', name: 'Product — เมนูของหมด + สารก่อภูมิแพ้', type: 'Product',
    customer: 'ต้มยำกุ้งน้ำข้นมีไหมคะ แพ้กุ้งเปล่า',
    ai: { tools: ['Product Tool'], reply: 'ต้มยำกุ้งน้ำข้น (150 บาท) วันนี้ของหมดแล้วค่ะ 🙏 เมนูนี้มีกุ้งและนมเป็นสารก่อภูมิแพ้นะคะ แนะนำสลัดอกไก่ย่างซอสงาแทนได้ค่ะ' },
    expect: { route: 'normal', approval: false } },

  { id: 'TC-04', name: 'Order Status — เช็คด้วยเลขออเดอร์', type: 'Order',
    customer: 'เช็คออเดอร์ ORD-20260819-014 ให้หน่อยค่ะ',
    ai: { tools: ['Order Tool'], reply: 'ออเดอร์ ORD-20260819-014 กำลังจัดส่งค่ะ ยอดรวม 280 บาท ถึงประมาณ 19:50 น. นะคะ' },
    expect: { route: 'normal', approval: false } },

  { id: 'TC-05', name: 'Order Status — ไม่พบเลขออเดอร์ (ไม่มั่นใจ)', type: 'Order',
    customer: 'ออเดอร์ ORD-99999999-999 ถึงไหนแล้วคะ',
    ai: { tools: ['Order Tool'], reply: 'ขออภัยค่ะ น้องอิ่มใจไม่พบเลขออเดอร์นี้ในระบบ รบกวนตรวจสอบอีกครั้งได้ไหมคะ' },
    expect: { route: 'urgent_contact', approval: false } },

  { id: 'TC-06', name: 'Complaint Positive — คำชม', type: 'Complaint',
    customer: 'อาหารอร่อยมาก บริการดีค่ะ',
    ai: { tools: ['Complaint Ticket Tool'], reply: 'ขอบคุณมากเลยค่ะ 🥰 น้องอิ่มใจจะส่งคำชมให้ทีมงานทุกคนนะคะ',
      tool_call: { customer_message: 'อาหารอร่อยมาก บริการดีค่ะ', category: 'compliment', sentiment: 'Positive', action_requested: 'none', is_high_risk: false } },
    expect: { route: 'normal', approval: false, sentiment: 'Positive', status: 'open' } },

  { id: 'TC-07', name: 'Complaint Neutral + Cancel Order → ต้องอนุมัติ', type: 'Complaint',
    customer: 'ขอยกเลิกออเดอร์ ORD-20260820-004 ค่ะ',
    ai: { tools: ['Order Tool', 'Complaint Ticket Tool'], reply: 'น้องอิ่มใจรับเรื่องขอยกเลิกไว้แล้วนะคะ เลขที่เรื่อง TK-260820-120000 ส่งให้ทีมงานพิจารณาแล้วค่ะ',
      tool_call: { customer_message: 'ขอยกเลิกออเดอร์ ORD-20260820-004 ค่ะ', category: 'order', sentiment: 'Neutral', order_id: 'ORD-20260820-004', action_requested: 'cancel_order', is_high_risk: false } },
    expect: { route: 'approval', approval: true, sentiment: 'Neutral', status: 'pending_approval', assigned_to: 'support_lead' } },

  { id: 'TC-08', name: 'Complaint Negative — กาแฟหวานไป (ไม่ต้องอนุมัติ)', type: 'Complaint',
    customer: 'กาแฟหวานไปหน่อยค่ะ ปรับได้ไหม',
    ai: { tools: ['Complaint Ticket Tool'], reply: 'ขออภัยด้วยนะคะ 🙏 น้องอิ่มใจแจ้งบาริสต้าให้แล้วค่ะ ครั้งหน้าแจ้งระดับความหวานได้เลยนะคะ',
      tool_call: { customer_message: 'กาแฟหวานไปหน่อยค่ะ ปรับได้ไหม', category: 'product_quality', sentiment: 'Negative', action_requested: 'none', is_high_risk: false } },
    expect: { route: 'normal', approval: false, sentiment: 'Negative', status: 'open', assigned_to: 'ai_agent' } },

  { id: 'TC-09', name: 'Complaint Negative + Refund (ตัดเงินซ้ำ) → ต้องอนุมัติ', type: 'Complaint',
    customer: 'โดนตัดเงินซ้ำ 2 ครั้ง ขอเงินคืนค่ะ',
    ai: { tools: ['Complaint Ticket Tool'], reply: 'ขออภัยอย่างสูงค่ะ น้องอิ่มใจรับเรื่องไว้แล้ว เลขที่เรื่อง TK-260820-120000 ส่งให้ทีมการเงินตรวจสอบแล้วค่ะ',
      tool_call: { customer_message: 'โดนตัดเงินซ้ำ 2 ครั้ง ขอเงินคืนค่ะ', category: 'billing', sentiment: 'Negative', action_requested: 'refund', is_high_risk: true } },
    expect: { route: 'approval', approval: true, sentiment: 'Negative', status: 'pending_approval', assigned_to: 'store_manager' } },

  { id: 'TC-10', name: 'Complaint Very Negative + High-risk (เส้นผม) → Refund ต้องอนุมัติ', type: 'Complaint',
    customer: 'เจอเส้นผมในอาหารค่ะ แย่มาก ขอเงินคืน',
    ai: { tools: ['Complaint Ticket Tool'], reply: 'น้องอิ่มใจต้องขออภัยอย่างสูงกับสิ่งที่เกิดขึ้นค่ะ เรื่องนี้ส่งให้หัวหน้าทีมทันทีแล้ว เลขที่เรื่อง TK-260820-120000 ค่ะ',
      tool_call: { customer_message: 'เจอเส้นผมในอาหารค่ะ แย่มาก ขอเงินคืน', category: 'product_quality', sentiment: 'Very Negative', action_requested: 'refund', is_high_risk: true } },
    expect: { route: 'approval', approval: true, high_risk: true, status: 'pending_approval', assigned_to: 'store_manager' } },

  { id: 'TC-11', name: 'High-risk แต่ไม่ขออะไร (แพ้ถั่ว) → ยังต้องอนุมัติ', type: 'Complaint',
    customer: 'ลูกแพ้ถั่วรุนแรง กินเมนูนี้แล้วแน่นหน้าอก',
    ai: { tools: ['Complaint Ticket Tool'], reply: 'น้องอิ่มใจขออภัยอย่างสูงค่ะ ขอให้ดูอาการอย่างใกล้ชิดและพบแพทย์ทันทีนะคะ เรื่องนี้ส่งให้ผู้จัดการร้านด่วนที่สุดแล้วค่ะ',
      tool_call: { customer_message: 'ลูกแพ้ถั่วรุนแรง กินเมนูนี้แล้วแน่นหน้าอก', category: 'food_safety', sentiment: 'Very Negative', action_requested: 'none', is_high_risk: true } },
    expect: { route: 'approval', approval: true, high_risk: true, assigned_to: 'store_manager' } },

  { id: 'TC-12', name: 'Very Negative + Special Discount (ส่งช้า) → ต้องอนุมัติ', type: 'Complaint',
    customer: 'รอเกินเวลาที่แจ้ง 40 นาทีแล้ว ชดเชยหน่อยสิคะ',
    ai: { tools: ['Order Tool', 'Complaint Ticket Tool'], reply: 'ขออภัยอย่างสูงค่ะ น้องอิ่มใจรับเรื่องและส่งให้ทีมงานพิจารณาแล้ว เลขที่เรื่อง TK-260820-120000 ค่ะ',
      tool_call: { customer_message: 'รอเกินเวลาที่แจ้ง 40 นาทีแล้ว ชดเชยหน่อยสิคะ', category: 'delivery', sentiment: 'Very Negative', order_id: 'ORD-20260819-014', action_requested: 'special_discount', is_high_risk: false } },
    expect: { route: 'approval', approval: true, sentiment: 'Very Negative', status: 'pending_approval', assigned_to: 'support_lead' } },

  { id: 'TC-13', name: 'ลูกค้าขอคุยแอดมิน → ยิงหาแอดมินทันที', type: 'Escalate',
    customer: 'ขอคุยกับแอดมินหน่อยค่ะ คุยกับบอทไม่รู้เรื่อง',
    ai: { tools: ['Complaint Ticket Tool'], reply: 'ได้เลยค่ะ น้องอิ่มใจส่งเรื่องให้แอดมินแล้วนะคะ เลขที่เรื่อง TK-260820-120000 รอสักครู่ทีมงานจะเข้ามาตอบในแชทนี้ค่ะ',
      tool_call: { customer_message: 'ขอคุยกับแอดมินหน่อยค่ะ', category: 'general', sentiment: 'Neutral', action_requested: 'contact_admin', is_high_risk: false } },
    expect: { route: 'urgent_contact', approval: false, status: 'awaiting_admin_contact' } },

  { id: 'TC-14', name: 'นอกขอบเขต + ไม่เรียก tool → ตาข่ายกันพลาดส่งแอดมิน', type: 'Escalate',
    customer: 'ขอสูตรทำกะเพราแบบร้านหน่อยค่ะ เอาละเอียด ๆ',
    ai: { tools: [], reply: 'เรื่องนี้น้องอิ่มใจตอบไม่ได้นะคะ แต่ถ้าเป็นเรื่องเมนูหรือออเดอร์ ยินดีช่วยเลยค่ะ' },
    expect: { route: 'urgent_contact', approval: false } },

  { id: 'TC-15', name: 'ห้ามข้าม: high-risk + refund ต้องไม่มีทางลัดไป Execute Action', type: 'Guard',
    customer: 'เจอแมลงในอาหาร จะฟ้อง สคบ. ขอเงินคืนเดี๋ยวนี้',
    ai: { tools: ['Complaint Ticket Tool'], reply: 'น้องอิ่มใจขออภัยอย่างสูงค่ะ ส่งเรื่องให้ผู้จัดการร้านทันทีแล้ว เลขที่เรื่อง TK-260820-120000 ค่ะ',
      tool_call: { customer_message: 'เจอแมลงในอาหาร จะฟ้อง สคบ. ขอเงินคืนเดี๋ยวนี้', category: 'food_safety', sentiment: 'Very Negative', action_requested: 'refund', is_high_risk: true } },
    expect: { route: 'approval', approval: true, high_risk: true } },
];

let pass = 0, fail = 0;
const rows = [];
for (const tc of T) {
  const { ticket, res } = simulate(tc);
  const got = {
    route: res.route,
    approval: res.requires_human_approval,
    sentiment: res.sentiment,
    high_risk: res.is_high_risk,
    status: ticket ? ticket.status : '-',
    assigned_to: ticket ? ticket.assigned_to : '-',
  };
  const errs = [];
  for (const [k, v] of Object.entries(tc.expect)) {
    if (JSON.stringify(got[k]) !== JSON.stringify(v)) errs.push(`${k}: คาดหวัง ${JSON.stringify(v)} ได้ ${JSON.stringify(got[k])}`);
  }
  const ok = errs.length === 0;
  ok ? pass++ : fail++;
  rows.push({ ...tc, got, ok, errs, ticket, reason: res.escalate_reason });
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'} ${tc.id} ${tc.name}`);
  console.log(`        route=${got.route} | approval=${got.approval} | high_risk=${got.high_risk} | status=${got.status} | assigned=${got.assigned_to}${res.escalate_reason ? ' | reason=' + res.escalate_reason : ''}`);
  if (!ok) console.log('        ' + errs.join(' ; '));
}

// ---- ทดสอบ Wait node: ผลลัพธ์ 3 แบบ ----
console.log('\n--- ทดสอบจุดรอ Human Approval (Wait node) ---');
const prev = { ticket_id: 'TK-260820-120000', action_requested: 'refund', sentiment: 'Very Negative', line_user_id: 'U123' };
const cases = [
  ['อนุมัติ', { body: { decision: 'approve', approver: 'ผจก.ส้ม' } }, true, 'approved_executing'],
  ['ปฏิเสธ', { body: { decision: 'reject', approver: 'ผจก.ส้ม', note: 'ตรวจสอบแล้วไม่พบปัญหา' } }, false, 'rejected'],
  ['หมดเวลา 24 ชม.', {}, false, 'expired_no_decision'],
];
let g = 0;
for (const [label, inc, expApproved, expStatus] of cases) {
  const d = runDecision(prev, inc);
  const ok = d.approved === expApproved && d.new_status === expStatus;
  ok ? g++ : fail++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'} ${label} → approved=${d.approved} status=${d.new_status} | ${d.customer_text.split('\n')[0].slice(0, 60)}...`);
}
pass += g;

console.log(`\n=== สรุป: ผ่าน ${pass} / ${pass + fail} ===`);
fs.writeFileSync('docs/test-results.json', JSON.stringify(rows, null, 2));
process.exit(fail ? 1 : 0);
