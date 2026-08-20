# สรุปผลการทดสอบ — ImJai LINE AI Customer Service Agent

ทดสอบวันที่ 20 ส.ค. 2569 · **ผ่าน 18 / 18 เคส**

## วิธีทดสอบ

ไม่ได้เขียนตรรกะจำลองขึ้นมาใหม่ แต่ **ดึงโค้ดและสมการจริงออกมาจากไฟล์ `workflow/imjai-line-ai-agent.json` แล้วรันตรง ๆ** ด้วย Node.js คือ

| สิ่งที่ทดสอบ | ดึงมาจาก |
|---|---|
| สมการ `requires_human_approval`, `is_high_risk`, `status`, `assigned_to` | ฟิลด์ `columns.value` ของ node **Complaint Ticket Tool** |
| การเลือกเส้นทาง (normal / urgent_contact / approval) | `jsCode` ของ node **Extract Agent Result** |
| ผลการอนุมัติ / ปฏิเสธ / หมดเวลา | `jsCode` ของ node **Parse Approval Decision** |
| การไม่มีทางลัดข้าม Human Approval | วิเคราะห์กราฟ `connections` ทั้ง workflow |

อินพุตของแต่ละเคสคือ *ข้อความลูกค้า + สิ่งที่ AI Agent ตอบ/เรียก tool* (จำลองพฤติกรรม LLM ตาม system prompt) แล้วดูว่าตรรกะฝั่ง n8n ตัดสินใจถูกหรือไม่

รันซ้ำได้ด้วย: `node tests/run-tests.js` และ `node tests/guard-approval.js`

---

## ตารางผลการทดสอบ

| # | เคส | ประเภท | Sentiment | High-risk | Action | ต้องอนุมัติ | เส้นทาง | ผล |
|---|---|---|---|---|---|---|---|---|
| TC-01 | FAQ — ถามเวลาเปิดปิด | FAQ | - | ไม่ใช่ | `-` | ไม่ต้อง | ตอบทันที | ✅ ผ่าน |
| TC-02 | Product — ถามราคาลาเต้ | Product Inquiry | - | ไม่ใช่ | `-` | ไม่ต้อง | ตอบทันที | ✅ ผ่าน |
| TC-03 | Product — เมนูของหมด + สารก่อภูมิแพ้ | Product Inquiry | - | ไม่ใช่ | `-` | ไม่ต้อง | ตอบทันที | ✅ ผ่าน |
| TC-04 | Order Status — เช็คด้วยเลขออเดอร์ | Order Status | - | ไม่ใช่ | `-` | ไม่ต้อง | ตอบทันที | ✅ ผ่าน |
| TC-05 | Order Status — ไม่พบเลขออเดอร์ (ไม่มั่นใจ) | Order Status | - | ไม่ใช่ | `-` | ไม่ต้อง | แจ้งแอดมินทันที | ✅ ผ่าน |
| TC-06 | Complaint Positive — คำชม | Complaint | Positive | ไม่ใช่ | `none` | ไม่ต้อง | ตอบทันที | ✅ ผ่าน |
| TC-07 | Complaint Neutral + Cancel Order → ต้องอนุมัติ | Complaint | Neutral | ไม่ใช่ | `cancel_order` | **ต้อง** | รอ Human Approval | ✅ ผ่าน |
| TC-08 | Complaint Negative — กาแฟหวานไป (ไม่ต้องอนุมัติ) | Complaint | Negative | ไม่ใช่ | `none` | ไม่ต้อง | ตอบทันที | ✅ ผ่าน |
| TC-09 | Complaint Negative + Refund (ตัดเงินซ้ำ) → ต้องอนุมัติ | Complaint | Negative | ⚠️ ใช่ | `refund` | **ต้อง** | รอ Human Approval | ✅ ผ่าน |
| TC-10 | Complaint Very Negative + High-risk (เส้นผม) → Refund ต้องอนุมัติ | Complaint | Very Negative | ⚠️ ใช่ | `refund` | **ต้อง** | รอ Human Approval | ✅ ผ่าน |
| TC-11 | High-risk แต่ไม่ขออะไร (แพ้ถั่ว) → ยังต้องอนุมัติ | Complaint | Very Negative | ⚠️ ใช่ | `none` | **ต้อง** | รอ Human Approval | ✅ ผ่าน |
| TC-12 | Very Negative + Special Discount (ส่งช้า) → ต้องอนุมัติ | Complaint | Very Negative | ไม่ใช่ | `special_discount` | **ต้อง** | รอ Human Approval | ✅ ผ่าน |
| TC-13 | ลูกค้าขอคุยแอดมิน → ยิงหาแอดมินทันที | ส่งต่อแอดมิน | Neutral | ไม่ใช่ | `contact_admin` | ไม่ต้อง | แจ้งแอดมินทันที | ✅ ผ่าน |
| TC-14 | นอกขอบเขต + ไม่เรียก tool → ตาข่ายกันพลาดส่งแอดมิน | ส่งต่อแอดมิน | - | ไม่ใช่ | `-` | ไม่ต้อง | แจ้งแอดมินทันที | ✅ ผ่าน |
| TC-15 | ห้ามข้าม: high-risk + refund ต้องไม่มีทางลัดไป Execute Action | ทดสอบกติกาห้ามฝ่าฝืน | Very Negative | ⚠️ ใช่ | `refund` | **ต้อง** | รอ Human Approval | ✅ ผ่าน |

### ทดสอบจุดรอ Human Approval (Wait node)

| # | สถานการณ์ | อินพุตที่ resume webhook | ผลลัพธ์ | สถานะ ticket | เรียก Execute Action? | ผล |
|---|---|---|---|---|---|---|
| TC-16 | ทีมงานกดอนุมัติ | `{decision:"approve", approver:"ผจก.ส้ม"}` | `approved = true` | `completed` | ✅ เรียก (หลังอนุมัติเท่านั้น) | ✅ ผ่าน |
| TC-17 | ทีมงานกดปฏิเสธ | `{decision:"reject", note:"..."}` | `approved = false` | `rejected` | ❌ ไม่เรียก | ✅ ผ่าน |
| TC-18 | ไม่มีใครกดเลยครบ 24 ชม. | (ไม่มี body — Wait timeout) | `approved = false` | `expired_no_decision` | ❌ ไม่เรียก | ✅ ผ่าน |

> **จุดสำคัญ:** เคส TC-18 พิสูจน์ว่าระบบ *fail-safe* — ถ้าไม่มีการอนุมัติ ระบบจะไม่ดำเนินการอะไรเลย ไม่ใช่ปล่อยผ่าน

---

## ความครอบคลุมตามที่โจทย์กำหนด

### ครบ 4 ประเภทการสนทนา
| ประเภท | เคสที่ครอบคลุม | Tool ที่ถูกเรียก |
|---|---|---|
| FAQ | TC-01 | `search_knowledge_base` |
| Product Inquiry | TC-02, TC-03 | `get_product_info` |
| Order Status | TC-04, TC-05 | `get_order_status` |
| Complaint | TC-06 ถึง TC-13, TC-15 | `create_complaint_ticket` |

### ครบ 4 ระดับ Sentiment
| ระดับ | เคส | ตรวจแล้วว่า |
|---|---|---|
| Positive | TC-06 (คำชม) | เปิด ticket เก็บสถิติได้ แต่ไม่ต้องอนุมัติ |
| Neutral | TC-07, TC-13 | ขอยกเลิกแบบสุภาพก็ยัง**ต้อง**อนุมัติ (ตัดสินจาก action ไม่ใช่อารมณ์) |
| Negative | TC-08, TC-09 | Negative เฉย ๆ ไม่ต้องอนุมัติ / Negative + refund ต้องอนุมัติ |
| Very Negative | TC-10, TC-11, TC-12, TC-15 | ยกระดับให้ `store_manager` เมื่อ high-risk |

### ครบ 4 เงื่อนไข Human Approval
| เงื่อนไข | เคส | ผล |
|---|---|---|
| `action_requested = refund` | TC-09, TC-10, TC-15 | ✅ บังคับรออนุมัติ |
| `action_requested = cancel_order` | TC-07 | ✅ บังคับรออนุมัติ |
| `action_requested = special_discount` | TC-12 | ✅ บังคับรออนุมัติ |
| `is_high_risk = true` (แม้ไม่ขออะไรเลย) | TC-11 (แพ้ถั่ว), TC-15 (ขู่ฟ้อง สคบ.) | ✅ บังคับรออนุมัติ |

### ทดสอบเพิ่มเติมนอกโจทย์ — 'ไม่มั่นใจ ส่งแอดมินทันที'
| เคส | ทริกเกอร์ | ผล |
|---|---|---|
| TC-05 | คำตอบมีคำว่า "ไม่พบ..." | แจ้งแอดมินทันที (ไม่ต้องรออนุมัติ) |
| TC-13 | ลูกค้าพิมพ์ว่า "ขอคุยกับแอดมิน" | แจ้งแอดมินทันที |
| TC-14 | AI ตอบโดยไม่เรียก tool ใด ๆ เลย | แจ้งแอดมินทันที |

---

## ผลตรวจโครงสร้าง (กติกาห้ามฝ่าฝืน)

รัน `node tests/guard-approval.js` — วิเคราะห์กราฟ `connections` โดยตัดขาออกของ node `⏸ Wait for Human Approval` ทิ้ง แล้วดูว่ายังมี node ไหน "เดินไปถึงได้" จาก trigger หรือไม่:

```
trigger nodes: LINE Webhook, Approval Page Webhook, Error Trigger

✅ Execute Action (Mock Refund/Cancel/Discount API)   ลัดข้าม Wait ได้ = false
✅ Update Ticket → ดำเนินการแล้ว                      ลัดข้าม Wait ได้ = false
✅ Update Ticket → ไม่อนุมัติ/หมดเวลา                  ลัดข้าม Wait ได้ = false
✅ Push ผลอนุมัติให้ลูกค้า (LINE)                       ลัดข้าม Wait ได้ = false
✅ Push ผลไม่อนุมัติให้ลูกค้า (LINE)                     ลัดข้าม Wait ได้ = false

node ที่ต่อเข้า Wait: Discord — ขออนุมัติจากทีมงาน  (ทางเข้าเดียว)

✅ ยืนยัน: ไม่มีเส้นทางใดข้าม Wait for Human Approval ได้
```

นอกจากนี้ **AI Agent ไม่ได้ถือ tool ที่เรียก API refund/cancel/discount เลย** — tool ทั้ง 4 ตัวที่ผูกกับ agent อ่าน/เขียน Google Sheets เท่านั้น node เดียวที่ยิง API จริงคือ `Execute Action` ซึ่งอยู่หลัง Wait node และต่อจาก `IF: Approved?` สาขา true เท่านั้น

---

## ข้อจำกัดที่ยังทดสอบไม่ได้ในขั้นนี้

การทดสอบชุดนี้ยืนยัน **ตรรกะการตัดสินใจของ n8n** ได้ครบ แต่ยังไม่ได้ทดสอบสิ่งเหล่านี้ (ต้องรันกับของจริงหลังใส่ credential):

| หัวข้อ | ต้องทดสอบด้วยตัวเองตอน deploy |
|---|---|
| ความแม่นของ LLM | GPT จำแนก sentiment / high-risk ได้ตรงแค่ไหน — ให้ยิงข้อความจริงเข้า LINE แล้วดู `Tickets` sheet |
| การเชื่อม Google Sheets | ชื่อแท็บและหัวคอลัมน์ต้องตรงกับ CSV เป๊ะ |
| LINE signature | ต้องใส่ Channel Secret จริงที่ node `Verify LINE Signature` ก่อน (ไม่งั้นระบบจะข้ามการตรวจ) |
| Discord webhook | ทดสอบด้วย `curl -X POST -H 'Content-Type: application/json' -d '{"content":"test"}' <webhook_url>` |
| หน้าอนุมัติ | ต้องตั้ง `public_base_url` ให้ถูก ไม่งั้นลิงก์ใน Discord จะเปิดไม่ได้ |
