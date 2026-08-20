# 🍽️ อิ่มใจ (ImJai) Cafe & Kitchen — AI Customer Service & Complaint Agent

ระบบ AI ตอบลูกค้าอัตโนมัติผ่าน **LINE Official Account** ชื่อ **"น้องอิ่มใจ"** ทำงานบน **n8n**
อ่านข้อมูลจาก **Google Sheets** → ให้ **AI Agent (OpenAI GPT)** วิเคราะห์ → ตอบลูกค้าทันที
และถ้า **ไม่มั่นใจ** หรือเป็นเรื่อง **คืนเงิน / ยกเลิกออเดอร์ / ส่วนลดพิเศษ / เคสร้ายแรง**
จะ **ส่งต่อให้แอดมินทาง Discord** โดยไม่ดำเนินการเองเด็ดขาด

---

## 🗺️ ภาพรวมระบบ

```
ลูกค้าพิมพ์ใน LINE
        │
        ▼
[LINE Webhook] → [ตรวจ x-line-signature] → [ตอบ 200 กลับ LINE ทันที]
        │
        ▼
[Parse Event] → [⚙️ Config] → [Log ข้อความเข้า → ConversationLogs]
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  🤖 AI Agent "น้องอิ่มใจ" (OpenAI GPT)               │
│  ผูก 4 tools อ่าน/เขียน Google Sheets:               │
│   1. search_knowledge_base   → KnowledgeBase         │
│   2. get_product_info        → Products              │
│   3. get_order_status        → Orders                │
│   4. create_complaint_ticket → Tickets (เขียนแถวใหม่) │
└─────────────────────────────────────────────────────┘
        │
        ▼
[Extract Agent Result] → [Log ข้อความออก + sentiment + tool ที่เรียก]
        │
        ▼
        ├── 🟢 ตอบได้เลย ─────────► ตอบลูกค้าทาง LINE Reply API  ✅ จบ
        │
        ├── 🟡 ไม่มั่นใจ / ขอคุยแอดมิน ─► Discord แจ้งแอดมินทันที + ตอบลูกค้าว่ากำลังตามให้
        │
        └── 🔴 refund / cancel_order / special_discount / high-risk
                    │
                    ├─► ตอบลูกค้าว่า "รับเรื่องแล้ว รอทีมงาน" (ยังไม่ทำอะไร)
                    ├─► Discord แจ้งทีมงาน + ลิงก์ ✅อนุมัติ / ⛔ปฏิเสธ
                    ├─► ⏸ Wait for Human Approval  ◄── ประตูบังคับ ห้ามข้าม
                    │        └── หมดเวลา 24 ชม. = ไม่อนุมัติ (fail-safe)
                    ├─► IF: Approved?
                    │     ├─ true  → Execute Action (API จริง) → อัปเดต Ticket → Push แจ้งลูกค้า
                    │     └─ false → อัปเดต Ticket เป็น rejected → Push แจ้งลูกค้า (ไม่เรียก API ใด ๆ)
                    └─► Log ผลการอนุมัติลง ConversationLogs
```

**ระบบยืนยันการชำระเงิน (แยก trigger ต่างหาก ไม่ผ่าน AI Agent):**

```
ระบบชำระเงิน/QR ยิงมาบอกว่าจ่ายแล้ว
        │
        ▼
[Payment Webhook] → ตรวจ secret + order_id/amount ครบไหม → หาแถวใน Orders
        │
        ├── เจอออเดอร์ → อัปเดต payment_status = ชำระแล้ว → Push แจ้งลูกค้า (LINE) → log Discord → 200 OK
        └── หาไม่เจอ   → ไม่แตะชีต → แจ้งแอดมินให้ตรวจเองใน Discord → 404
```

---

## 📦 ไฟล์ในโปรเจกต์

| ไฟล์ | คำอธิบาย |
|---|---|
| `workflow/imjai-line-ai-agent-full.json` | **ไฟล์ n8n workflow** — import แล้วใช้ได้ทันที (58 node + 6 sticky note รวมส่วนยืนยันการชำระเงิน) |
| `docs/system-prompt.md` | System prompt ฉบับเต็มของน้องอิ่มใจ (ฝังอยู่ใน workflow แล้ว) |
| `docs/TEST_CASES.md` | สรุปผลทดสอบ 18 เคส |
| `data/StoreProfile.csv` | ข้อมูลร้าน 18 แถว |
| `data/KnowledgeBase.csv` | FAQ 15 ข้อ |
| `data/Products.csv` | เมนู 17 รายการ (กาแฟ 5 / non-coffee 4 / อาหาร 5 / ของหวาน 3) — มีคอลัมน์ `is_recommended` ไว้กำหนด "เมนูแนะนำ" ตายตัว กันบอทเลือกไม่ตรงกันเวลาถูกถามซ้ำ |
| `data/Orders.csv` | ออเดอร์ตัวอย่าง 3 รายการ — มีคอลัมน์ `payment_status` / `payment_ref` / `paid_at` สาธิตทั้งสถานะรอชำระเงินและชำระแล้ว |
| `data/Tickets.csv` | Ticket ร้องเรียนตัวอย่าง 10 รายการ |
| `data/ConversationLogs.csv` | หัวคอลัมน์ log บทสนทนา (+ ตัวอย่าง 2 แถว) |
| `deploy/docker-compose.yml` | สำหรับติดตั้ง n8n เองบน VPS (ตั้ง WEBHOOK_URL ให้แล้ว) |
| `deploy/Caddyfile` | reverse proxy + HTTPS อัตโนมัติ |
| `tests/run-tests.js` | รันทดสอบตรรกะจริงจากไฟล์ workflow |
| `tests/guard-approval.js` | ตรวจว่าไม่มีทางลัดข้าม Human Approval |

---

## 0️⃣ เตรียม n8n ก่อน (ถ้ายังไม่มี)

ระบบนี้ต้องการ n8n ที่ **เข้าถึงได้จากอินเทอร์เน็ตด้วย HTTPS** เพราะ LINE ต้องยิง webhook เข้ามา
และแอดมินต้องเปิดลิงก์อนุมัติจาก Discord ได้ — เลือกได้ 3 ทาง

| ทาง | เหมาะกับ | ค่าใช้จ่าย | ความยาก |
|---|---|---|---|
| **A. n8n Cloud** ⭐ แนะนำ | อยากใช้งานจริงเลย ไม่อยากดูแลเซิร์ฟเวอร์ | ทดลองฟรี 14 วัน แล้วประมาณ €24/เดือน | ⭐ ง่ายสุด |
| **B. Self-host บน VPS** | อยากคุมค่าใช้จ่ายระยะยาว มีโดเมนอยู่แล้ว | VPS ~150–300 บาท/เดือน | ⭐⭐⭐ |
| **C. เครื่องตัวเอง + ngrok** | แค่อยากลองเล่นก่อน | ฟรี | ⭐⭐ (URL เปลี่ยนทุกครั้งที่รีสตาร์ท) |

> **ต้องเป็น n8n เวอร์ชัน 1.70 ขึ้นไป** (แนะนำเวอร์ชันล่าสุด) เพราะ workflow นี้ใช้
> node แบบ `*Tool` และฟังก์ชัน `$fromAI()` ซึ่งมีในเวอร์ชันใหม่เท่านั้น

### ทาง A — n8n Cloud (แนะนำ)

1. สมัครที่ https://n8n.io → เลือกแพลน (มีทดลองฟรี)
2. จะได้ URL มาเลย เช่น `https://myshop.app.n8n.cloud` — **จดไว้ ใช้เป็น `public_base_url`**
3. ข้ามไปทำขั้นที่ 1 ได้เลย ไม่ต้องตั้งค่าอะไรเพิ่ม

> ⚠️ n8n Cloud ตั้ง environment variable เองไม่ได้ ให้พิมพ์ค่าลับลงใน node ตรง ๆ ตามขั้นที่ 4

### ทาง B — Self-host ด้วย Docker บน VPS

```bash
# 1. ชี้โดเมน (เช่น n8n.myshop.com) มาที่ IP ของ VPS ก่อน — รอ DNS อัปเดตสัก 5-30 นาที

# 2. โคลนโปรเจกต์นี้ลง VPS
git clone <repo-url> && cd restaurant-im-jai-ai-agent/deploy

# 3. ตั้งค่า
cp .env.example .env
openssl rand -hex 32          # เอาค่าที่ได้ไปใส่ N8N_ENCRYPTION_KEY ใน .env
nano .env                     # แก้ N8N_HOST เป็นโดเมนจริงของคุณ

# 4. รัน n8n
docker compose up -d
docker compose logs -f        # ดูว่าขึ้นสำเร็จไหม กด Ctrl+C เพื่อออก

# 5. เปิด HTTPS ด้วย Caddy (ออกใบรับรองให้อัตโนมัติ ฟรี)
sudo apt install -y caddy
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile   # แก้ n8n.myshop.com เป็นโดเมนจริง
sudo systemctl restart caddy
```

เปิด `https://<โดเมนของคุณ>` แล้วสร้าง owner account เป็นอันเสร็จ

> ⚠️ จุดที่คนพลาดบ่อยที่สุด: **ลืมตั้ง `WEBHOOK_URL`** ทำให้ n8n สร้าง webhook URL
> เป็น `http://localhost:5678/...` แล้ว LINE ยิงเข้าไม่ได้ — ไฟล์ `docker-compose.yml`
> ในโปรเจกต์นี้ตั้งให้แล้วจาก `N8N_HOST`

### ทาง C — ลองเล่นบนเครื่องตัวเอง

```bash
# รัน n8n
docker run -d --name n8n -p 5678:5678   -e GENERIC_TIMEZONE=Asia/Bangkok -e TZ=Asia/Bangkok   -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n:latest

# เปิดให้เข้าจากภายนอกด้วย ngrok (ต้องสมัคร ngrok ก่อน)
ngrok http 5678
# จะได้ URL เช่น https://a1b2-xxx.ngrok-free.app  → ใช้เป็น public_base_url
```

จากนั้นรีสตาร์ท n8n ใหม่โดยเพิ่ม `-e WEBHOOK_URL=https://a1b2-xxx.ngrok-free.app/`

> ⚠️ ngrok ฟรีจะเปลี่ยน URL ทุกครั้งที่รีสตาร์ท ต้องกลับไปแก้ทั้งใน LINE Console
> และใน node `⚙️ Config` ทุกครั้ง — เหมาะกับทดลองเท่านั้น ไม่เหมาะใช้งานจริง

---

## 🔑 credential ที่ต้องเตรียม (4 อย่าง)

| # | credential | เอามาจากไหน | ใช้ที่ node ไหน |
|---|---|---|---|
| 1 | **LINE Channel Access Token** | [LINE Developers Console](https://developers.line.biz/console/) → เลือก Provider → Messaging API channel → แท็บ **Messaging API** → *Channel access token (long-lived)* → กด Issue | ทุก node ที่ขึ้นต้นด้วย `Reply:` และ `Push` |
| 2 | **LINE Channel Secret** | channel เดียวกัน → แท็บ **Basic settings** → *Channel secret* | node `Verify LINE Signature` |
| 3 | **OpenAI API Key** | https://platform.openai.com/api-keys | node `OpenAI Chat Model` |
| 4 | **Google Sheets OAuth2** | [Google Cloud Console](https://console.cloud.google.com/) → เปิดใช้ *Google Sheets API* + *Google Drive API* → สร้าง OAuth client (Web application) → ใส่ redirect URL ที่ n8n บอก | ทุก node ที่เป็น Google Sheets |

**ไม่ต้องใช้ credential:** Discord (ใช้แค่ Webhook URL) และ Mock Action API

---

## 🚀 ขั้นตอนติดตั้ง (ทำตามลำดับ)

### ขั้นที่ 1 — สร้าง Google Sheets

1. สร้าง Spreadsheet ใหม่ 1 ไฟล์ ตั้งชื่อว่า `ImJai Database`
2. สร้างแท็บทั้งหมด **6 แท็บ** โดย **ชื่อแท็บต้องตรงเป๊ะ** (ตัวพิมพ์ใหญ่-เล็กมีผล):

   `StoreProfile` · `KnowledgeBase` · `Products` · `Orders` · `Tickets` · `ConversationLogs`

   > 💡 แท็บ `Products` มีคอลัมน์ `is_recommended` (TRUE/FALSE) และแท็บ `Orders` มีคอลัมน์
   > `payment_status` / `payment_ref` / `paid_at` — import จาก `data/Products.csv` และ `data/Orders.csv`
   > ตรง ๆ จะได้ครบทุกคอลัมน์อัตโนมัติ ไม่ต้องเพิ่มเอง

3. import ข้อมูลลงแต่ละแท็บ — เปิดแท็บที่ต้องการ แล้วไปที่
   **File → Import → Upload** → เลือกไฟล์ CSV ในโฟลเดอร์ `data/` →
   เลือก **Import location: `Replace current sheet`** → **Separator type: `Comma`** → กด Import

   > ⚠️ ห้ามเลือก `Create new spreadsheet` ไม่งั้นจะได้ไฟล์แยกกัน 6 ไฟล์
   > ⚠️ ไฟล์ CSV เป็น UTF-8 with BOM ภาษาไทยจะไม่เพี้ยน ถ้าเพี้ยนให้เลือก encoding เป็น UTF-8 ตอน import

4. คัดลอก **Spreadsheet ID** จาก URL เก็บไว้:
   ```
   https://docs.google.com/spreadsheets/d/【ตรงนี้คือ Spreadsheet ID】/edit
   ```

### ขั้นที่ 2 — สร้าง Discord Webhook (ช่องแจ้งเตือนแอดมิน)

1. ใน Discord server → คลิกขวาที่ channel ที่ต้องการ (เช่น `#imjai-alert`) → **Edit Channel**
2. **Integrations → Webhooks → New Webhook** → ตั้งชื่อ เช่น `อิ่มใจ Alert`
3. กด **Copy Webhook URL** เก็บไว้ (หน้าตาแบบ `https://discord.com/api/webhooks/xxxx/yyyy`)
4. ทดสอบว่าใช้ได้:
   ```bash
   curl -X POST -H 'Content-Type: application/json' \
        -d '{"content":"ทดสอบจากร้านอิ่มใจ ✅"}' \
        '<Webhook URL ที่คัดลอกมา>'
   ```

### ขั้นที่ 3 — Import workflow เข้า n8n

1. เปิด n8n → มุมขวาบน **⋯ → Import from File**
2. เลือก `workflow/imjai-line-ai-agent-full.json`
3. n8n จะเตือนว่าหา credential ไม่เจอ — ไม่ต้องตกใจ เดี๋ยวไปผูกในขั้นที่ 5

### ขั้นที่ 4 — ตั้งค่าที่ node `⚙️ Config` (จุดเดียวจบ)

เปิด node **`⚙️ Config`** แล้วแก้ค่าเหล่านี้:

| ฟิลด์ | ใส่อะไร |
|---|---|
| `sheet_id` | Spreadsheet ID จากขั้นที่ 1 |
| `discord_webhook_url` | Discord Webhook URL จากขั้นที่ 2 |
| `public_base_url` | URL สาธารณะของ n8n **ไม่ต้องมี `/` ปิดท้าย** เช่น `https://n8n.myshop.com` |
| `approval_secret` | ตั้งรหัสลับอะไรก็ได้ที่เดายาก เช่น `imjai-Xq82!kd93` |
| `mock_api_base` | ปล่อยไว้ก่อนได้ (`https://api.imjai-cafe.example.com/v1`) แล้วค่อยเปลี่ยนเป็น API จริงของร้าน |
| `admin_contact_note` | ข้อความท้ายการ์ด Discord |
| `payment_webhook_secret` | ตั้งรหัสลับอะไรก็ได้ที่เดายาก ใช้ยืนยันว่า webhook แจ้งชำระเงิน (ขั้นที่ 7) มาจากระบบชำระเงินจริง |

จากนั้นแก้อีก **4 จุดที่อยู่นอก Config** (เพราะเป็น node ที่ทำงานคนละ execution):

| node | แก้ตัวแปร | ใส่อะไร |
|---|---|---|
| `Verify LINE Signature` | `CHANNEL_SECRET` (บรรทัดบน ๆ) | LINE Channel Secret |
| `Build Approval Confirm Page` | `SECRET` | ใส่ค่า **เดียวกับ** `approval_secret` |
| `Build System Error Alert` | `WEBHOOK` | ใส่ค่า **เดียวกับ** `discord_webhook_url` |
| `⚙️ Payment Config` | `sheet_id`, `discord_webhook_url`, `payment_webhook_secret` | ใส่ค่า **เดียวกับ** node `⚙️ Config` ด้านบน (คนละ trigger เลยอ่านค่ากันไม่ได้ ต้องคัดลอกซ้ำ) |

> 💡 ถ้า n8n ของคุณตั้ง environment variable ได้ (self-host) จะตั้งเป็น
> `LINE_CHANNEL_SECRET`, `IMJAI_APPROVAL_SECRET`, `IMJAI_DISCORD_WEBHOOK` แทนก็ได้ โค้ดรองรับไว้แล้ว

### ขั้นที่ 5 — ผูก credential เข้ากับ node

| node | ประเภท credential | วิธีตั้ง |
|---|---|---|
| `OpenAI Chat Model` | **OpenAI** | ใส่ API key |
| Google Sheets ทุก node (11 node: อ่าน/เขียนตรง 7 + AI tool 4) | **Google Sheets OAuth2 API** | ตั้งอันเดียวแล้วเลือกซ้ำได้ทุก node |
| `Reply:` และ `Push` ทุก node (7 node) | **Header Auth** | **Name:** `Authorization` · **Value:** `Bearer <LINE Channel Access Token>` |

> ✅ ทริค: ตั้งชื่อ credential ว่า `Google Sheets account`, `OpenAi account`, `LINE Channel Access Token`
> ตรงตามที่ workflow อ้างอิงไว้ n8n จะผูกให้อัตโนมัติทุก node

### ขั้นที่ 6 — เปิดใช้งาน workflow แล้วเอา Webhook URL ไปตั้งใน LINE

1. กด **Save** แล้วสับสวิตช์ **Active** เป็นเปิด
2. เปิด node `LINE Webhook` → คัดลอก **Production URL**
   จะได้หน้าตาแบบ `https://n8n.myshop.com/webhook/imjai-line-webhook`
3. ไปที่ [LINE Developers Console](https://developers.line.biz/console/) → channel ของคุณ → แท็บ **Messaging API**
   - **Webhook URL:** วาง URL จากข้อ 2 → กด **Update** → กด **Verify** (ต้องขึ้น Success)
   - **Use webhook:** เปิด ✅
   - **Auto-reply messages:** ปิด ❌ (ไม่งั้นจะตอบซ้อนกับบอท)
   - **Greeting messages:** เปิดหรือปิดก็ได้
4. ตั้ง Error Workflow (ให้แจ้งแอดมินเมื่อระบบพัง):
   ในหน้า workflow → **⋯ → Settings → Error Workflow** → เลือก workflow นี้เอง

### ขั้นที่ 7 — ผูกระบบยืนยันการชำระเงิน (Payment Confirmation)

เมื่อลูกค้าจ่ายเงินจริงแล้ว (สแกน QR / โอน / บัตร) ให้ระบบชำระเงินของคุณ (payment gateway,
ระบบ POS หรือแอดมินเอง) ยิง POST มาที่ webhook นี้ — ระบบจะอัปเดตชีต `Orders` ให้อัตโนมัติ
พร้อม **พุชแจ้งลูกค้าทาง LINE ทันที** ว่าได้รับเงินแล้ว และ log เข้า Discord ให้ทีมงานเห็น

1. เปิด node `Payment Webhook` → คัดลอก **Production URL**
   จะได้หน้าตาแบบ `https://n8n.myshop.com/webhook/imjai-payment-confirm`
2. ตั้งให้ระบบชำระเงิน/QR ของคุณยิง `POST` มาที่ URL นี้เมื่อมีการจ่ายเงินสำเร็จ ด้วย body ประมาณนี้:

   ```json
   {
     "order_id": "ORD-20260820-002",
     "amount": 110,
     "payment_ref": "TXN123456",
     "method": "PromptPay",
     "secret": "<ค่าเดียวกับ payment_webhook_secret>"
   }
   ```

   (ส่ง `secret` ในฟิลด์ `secret` ของ body หรือ header `x-payment-secret` ก็ได้ — ถ้ายังไม่มีระบบชำระเงินที่ยิง
   webhook ได้เอง ให้แอดมินยิงเองด้วย `curl`/Postman เมื่อเช็คเงินเข้าบัญชีร้านแล้วก็ได้ ใช้งานได้เหมือนกัน)

3. ผลลัพธ์ที่ได้กลับมา:
   - `200 { "ok": true, ... }` — เจอออเดอร์ อัปเดต `payment_status = ชำระแล้ว` และแจ้งลูกค้าแล้ว
   - `400 { "ok": false, "error": "missing_order_id_or_amount" }` — body ส่งมาไม่ครบ
   - `401 { "ok": false, "error": "invalid_secret" }` — secret ไม่ตรง
   - `404 { "ok": false, "error": "order_not_found" }` — หาเลขออเดอร์นี้ในชีต Orders ไม่เจอ
     (ระบบจะไม่แตะชีตเลย และแจ้งแอดมินทาง Discord ให้ตรวจสอบเอง)
4. ทดสอบด้วย `curl`:
   ```bash
   curl -X POST 'https://n8n.myshop.com/webhook/imjai-payment-confirm' \
        -H 'Content-Type: application/json' \
        -d '{"order_id":"ORD-20260820-183000","amount":110,"payment_ref":"TEST-001","secret":"<payment_webhook_secret>"}'
   ```
   แล้วเช็คว่าคอลัมน์ `payment_status` ในชีต Orders เปลี่ยนเป็น `ชำระแล้ว` และลูกค้า (ถ้ามี `line_user_id`
   ผูกไว้ในแถวนั้น) ได้รับข้อความยืนยันทาง LINE

> จุดนี้เป็น **จุดเดียวใน workflow นี้ที่ n8n เขียนทับชีต Orders** (เขียนเฉพาะ 3 คอลัมน์ `payment_status` /
> `payment_ref` / `paid_at` เท่านั้น ไม่แตะสถานะครัวหรือคอลัมน์อื่น) — ถ้ายังไม่มี QR/ระบบชำระเงินจริง
> ข้ามขั้นตอนนี้ไปก่อนได้ ระบบส่วนอื่นทำงานได้ตามปกติ แล้วค่อยกลับมาผูกทีหลังก็ได้

---

## 🧪 วิธีทดสอบเบื้องต้น

### ทดสอบทีละชั้น (แนะนำให้ไล่ตามนี้)

**1) ทดสอบ Google Sheets อ่านได้ไหม**
เปิด node `Knowledge Tool` → กด **Execute step** → ต้องเห็น FAQ 15 แถว

**2) ทดสอบ AI Agent ตอบได้ไหม (ยังไม่ต้องต่อ LINE)**
กด **Execute Workflow** แล้วส่ง request ทดสอบเข้ามา:
```bash
curl -X POST 'https://n8n.myshop.com/webhook-test/imjai-line-webhook' \
  -H 'Content-Type: application/json' \
  -d '{"events":[{"type":"message","replyToken":"TEST_TOKEN","source":{"type":"user","userId":"Uabc123line"},"message":{"type":"text","id":"1","text":"ลาเต้ราคาเท่าไหร่คะ"}}]}'
```
> ระหว่างทดสอบ ให้เอา Channel Secret ออกจาก `Verify LINE Signature` ชั่วคราว
> (ปล่อยเป็นค่า `PASTE_YOUR_LINE_CHANNEL_SECRET`) ระบบจะข้ามการตรวจ signature ให้
> **อย่าลืมใส่กลับก่อนใช้งานจริง**

**3) ทดสอบผ่าน LINE จริง** — แอดเพื่อน LINE OA แล้วพิมพ์ทีละข้อความ:

| พิมพ์ว่า | ต้องได้ผลแบบไหน |
|---|---|
| `ร้านเปิดกี่โมง` | ตอบเวลาทำการทันที (เรียก Knowledge Tool) |
| `ลาเต้ราคาเท่าไหร่` | ตอบ 70 บาท (เรียก Product Tool) |
| `ต้มยำกุ้งมีไหม` | ต้องบอกว่า **ของหมดวันนี้** |
| `เช็คออเดอร์ ORD-20260819-014` | ตอบว่ากำลังจัดส่ง ถึงประมาณ 19:50 น. |
| `กาแฟหวานไปหน่อยค่ะ` | ขอโทษ + เปิด ticket + **ตอบทันที ไม่ต้องอนุมัติ** |
| `ขอยกเลิกออเดอร์ ORD-20260820-004` | ตอบว่ารับเรื่องแล้ว + **Discord เด้งขออนุมัติ** |
| `เจอเส้นผมในอาหาร ขอเงินคืน` | ขอโทษ + **Discord เด้งแบบด่วน @here** |
| `ขอคุยกับแอดมิน` | **Discord เด้งทันที** ไม่ต้องรออนุมัติ |

**4) ทดสอบการอนุมัติ**
- ดูข้อความใน Discord → กดลิงก์ **✅ อนุมัติ**
- จะเปิดหน้าเว็บให้กรอกชื่อผู้อนุมัติ → กดปุ่มยืนยัน
- ตรวจว่า: แถวใน `Tickets` เปลี่ยน status เป็น `completed` และลูกค้าได้รับข้อความแจ้งผลทาง LINE

**5) ทดสอบตรรกะแบบไม่ต้องต่อระบบจริง**
```bash
node tests/run-tests.js        # 18 เคส
node tests/guard-approval.js   # ตรวจไม่มีทางลัดข้าม Human Approval
```

---

## 🔒 กติกาความปลอดภัยที่ระบบบังคับไว้

### 1. AI ห้ามลงมือทำ 4 อย่างนี้เองเด็ดขาด
`refund` · `cancel_order` · `special_discount` · เคส `is_high_risk = true`

บังคับด้วย 3 ชั้นซ้อนกัน:

| ชั้น | กลไก |
|---|---|
| **ชั้นที่ 1 — Prompt** | system prompt ห้าม AI พูดว่า "คืนเงินให้แล้ว/ยกเลิกให้แล้ว/ให้ส่วนลดแล้ว" |
| **ชั้นที่ 2 — ไม่ให้เครื่องมือ** | tool ทั้ง 4 ตัวที่ AI ถืออยู่ **อ่าน/เขียน Google Sheets ได้เท่านั้น** ไม่มี tool ไหนยิง API refund/cancel ได้เลย |
| **ชั้นที่ 3 — โครงสร้าง workflow** | `requires_human_approval` คำนวณโดย **n8n ไม่ใช่ LLM** และ node `Execute Action` ต่ออยู่หลัง `⏸ Wait for Human Approval` → `IF: Approved?` (สาขา true) เท่านั้น — พิสูจน์แล้วด้วย `tests/guard-approval.js` |

### 2. ลิงก์อนุมัติใน Discord ไม่สามารถถูกกดโดยบอท/crawler
Discord จะ prefetch ลิงก์ในข้อความอัตโนมัติ ถ้าลิงก์นั้นชี้ตรงไปที่ resume URL ของ Wait node
**การ prefetch จะกลายเป็นการอนุมัติทันทีโดยไม่มีคนกด** ระบบนี้จึงออกแบบเป็น 2 จังหวะ:

```
ลิงก์ใน Discord  →  หน้ายืนยัน (GET, แค่ HTML เปล่า ๆ ทำอะไรไม่ได้)
                       └─ คนกดปุ่ม → fetch POST เข้า resume URL → workflow ถึงจะเดินต่อ
```
crawler ที่ prefetch จะได้แค่ HTML และไม่มีทางสั่ง POST ได้

### 3. ไม่อนุมัติภายใน 24 ชม. = ไม่ทำอะไรเลย (fail-safe)
Wait node ตั้ง timeout 24 ชั่วโมง เมื่อหมดเวลาจะไปเส้นทาง "ไม่อนุมัติ" อัตโนมัติ
ticket เปลี่ยนสถานะเป็น `expired_no_decision` และ **ไม่มีการเรียก API ใด ๆ**

### 4. ตรวจ x-line-signature ทุก request
กัน webhook ปลอมยิงเข้ามาสั่งงานบอท

### 5. ข้อความลูกค้าเป็นข้อมูล ไม่ใช่คำสั่ง
system prompt สั่งไว้ชัดว่า ถ้าลูกค้าอ้างว่าเป็นผู้จัดการ อ้างว่าอนุมัติแล้ว
หรือส่งข้อความที่ดูเหมือนคำสั่งระบบ → ห้ามทำตาม

---

## ⚠️ ข้อควรรู้ / ข้อจำกัดที่ต้องยอมรับ

| หัวข้อ | รายละเอียด |
|---|---|
| **Knowledge Tool กับ Product Tool คืนทั้งตาราง** | ทั้ง 2 tool ส่ง FAQ 15 แถว / เมนู 17 แถว ให้ LLM เลือกเอง เพราะ Google Sheets filter เป็น **exact match** ทำ fuzzy search ภาษาไทยไม่ได้ (ถ้าลูกค้าพิมพ์ "ลาเต้" จะหา "ลาเต้ (ร้อน/เย็น)" ไม่เจอ) ตารางเล็กแบบนี้ให้ LLM จับคู่เองแม่นกว่ามาก **ถ้าเมนูโตเกิน ~100 รายการ** ควรเปลี่ยนไปใช้ Vector Store หรือย้ายไป database จริง |
| **Order Tool กรองที่ Sheet** | ใช้ filter จริง (เลือกคอลัมน์อัตโนมัติจาก `order_id` → `customer_phone` → `line_user_id`) ข้อมูลออเดอร์ลูกค้าคนอื่นจึงไม่หลุดเข้า context ของ LLM |
| **Tickets มี 12 คอลัมน์** | เพิ่ม `order_id` และ `line_user_id` จากที่โจทย์กำหนด 10 คอลัมน์ เพราะ tool signature มี `order_id` และทีมงานต้องรู้ว่าจะติดต่อลูกค้าคนไหนกลับ |
| **1 webhook = 1 event** | โค้ดรองรับหลาย event ใน 1 request แต่ node หลัง AI Agent อ้างอิงด้วย `.first()` ถ้า LINE ส่งมาหลาย event พร้อมกัน (พบได้น้อยมาก) จะประมวลผลเฉพาะตัวแรก |
| **`sheetName` โหมด By Name** | ถ้า n8n เวอร์ชันของคุณไม่รู้จักโหมดนี้ ให้เปิด node นั้นแล้วเลือกแท็บจาก dropdown ใหม่อีกครั้ง (แก้ครั้งเดียวจบ) |
| **Mock Action API** | `Execute Action` ยิงไปที่ endpoint ตัวอย่าง ตั้ง `onError: continue` ไว้ ระบบจึงเดินต่อได้แม้ API ยังไม่มีจริง — **อย่าลืมเปลี่ยนเป็น API จริงก่อนใช้งานจริง** |

---

## ✅ เช็กลิสต์สิ่งที่ต้องทำทั้งหมด

พิมพ์ออกมาไล่ติ๊กได้เลย — ช่องที่มี ⏱️ คือเวลาที่น่าจะใช้

- [ ] ⏱️ 10 นาที — เตรียม n8n ให้เข้าถึงได้ด้วย HTTPS (ขั้นที่ 0)
- [ ] ⏱️ 15 นาที — สร้าง Google Sheet 6 แท็บ แล้ว import CSV จากโฟลเดอร์ `data/` (ขั้นที่ 1)
- [ ] ⏱️ 3 นาที — สร้าง Discord Webhook แล้วทดสอบด้วย `curl` (ขั้นที่ 2)
- [ ] ⏱️ 10 นาที — สร้าง LINE Messaging API channel + ออก Channel Access Token
- [ ] ⏱️ 5 นาที — เตรียม OpenAI API key (ต้องมีเครดิตในบัญชี ไม่งั้น agent จะ error)
- [ ] ⏱️ 10 นาที — สร้าง Google Cloud OAuth client สำหรับ Google Sheets
- [ ] ⏱️ 2 นาที — import `workflow/imjai-line-ai-agent-full.json` เข้า n8n (ขั้นที่ 3)
- [ ] ⏱️ 5 นาที — แก้ค่าใน node `⚙️ Config` + อีก 4 node ที่มีค่าลับ (ขั้นที่ 4)
- [ ] ⏱️ 10 นาที — ผูก credential ทั้ง 3 ชุดเข้ากับ node (ขั้นที่ 5)
- [ ] ⏱️ 5 นาที — Activate workflow แล้วตั้ง Webhook URL ใน LINE Console + กด Verify (ขั้นที่ 6)
- [ ] ⏱️ 2 นาที — ตั้ง Error Workflow ให้ชี้กลับมาที่ workflow นี้เอง
- [ ] ⏱️ 5 นาที — ผูก webhook ยืนยันการชำระเงินเข้ากับระบบชำระเงิน/QR (หรือไว้แอดมินยิงเอง) แล้วทดสอบด้วย `curl` (ขั้นที่ 7)
- [ ] ⏱️ 15 นาที — ทดสอบตามตาราง 8 ข้อความในหัวข้อ "วิธีทดสอบเบื้องต้น"
- [ ] ⏱️ 5 นาที — ทดสอบกดอนุมัติจากลิงก์ใน Discord แล้วเช็กว่า Ticket เปลี่ยนสถานะ

**รวมประมาณ 1.5 ชั่วโมง** ถ้ามี account ทั้งหมดพร้อมแล้ว

### หลังใช้งานจริงได้แล้ว ค่อยทำต่อ

| ลำดับ | สิ่งที่ควรทำ | ทำไม |
|---|---|---|
| 1 | เปลี่ยน `mock_api_base` เป็น API จริงของร้าน (ระบบ POS / payment gateway) | ตอนนี้ node `Execute Action` ยิงไปที่ endpoint ปลอม ตั้ง `onError: continue` ไว้ ระบบจึงเดินต่อได้แม้ยิงไม่สำเร็จ — **สถานะ ticket จะขึ้นว่าดำเนินการแล้วทั้งที่ยังไม่มีการคืนเงินจริง** |
| 2 | เอาข้อมูลจริงของร้านใส่ใน 5 แท็บแรก แทน mock data | ตอนนี้เป็นเมนู/ออเดอร์ตัวอย่างจาก PDF |
| 3 | ดู `ConversationLogs` ทุกสัปดาห์ | หาว่าลูกค้าถามอะไรบ่อยแล้วยังตอบไม่ได้ → เพิ่มเข้า `KnowledgeBase` |
| 4 | ปรับ system prompt จากเคสจริง | แก้ที่ `docs/system-prompt.md` แล้วคัดลอกไปวางที่ node `AI Agent` |
| 5 | ตั้ง Rich Menu ใน LINE OA | ให้ลูกค้ากดเมนู/โปรโมชัน/สมัครสมาชิกได้โดยไม่ต้องพิมพ์ |
| 6 | ต่อหน้าเว็บ (ตามที่คุยกันไว้) | ดูหัวข้อ "ส่วนที่จะทำต่อ" ด้านล่าง |

### ค่าใช้จ่ายที่ต้องเผื่อไว้ต่อเดือน

| รายการ | ประมาณการ |
|---|---|
| n8n Cloud (ถ้าเลือกทาง A) | ~€24 (~900 บาท) |
| หรือ VPS (ถ้าเลือกทาง B) | 150–300 บาท |
| OpenAI API | ขึ้นกับปริมาณแชท — ประมาณ 0.05–0.15 บาท/ข้อความ (gpt-4.1) ถ้าวันละ 100 ข้อความ ตกราว 150–450 บาท/เดือน |
| LINE Messaging API | ฟรี 500 ข้อความ push/เดือน (reply ไม่นับ) เกินกว่านั้นมีแพลนรายเดือน |
| Google Sheets / Discord | ฟรี |

> 💡 ประหยัดค่า OpenAI ได้โดยเปลี่ยน model ที่ node `OpenAI Chat Model` เป็น `gpt-4.1-mini`
> (ถูกลงหลายเท่า) แล้วทดสอบว่าคุณภาพการจำแนก sentiment / high-risk ยังรับได้ไหม

---

## 🔮 ส่วนที่จะทำต่อ (เว็บไซต์)

workflow นี้เตรียมทางไว้ให้แล้ว — เมื่อออกแบบหน้าเว็บเสร็จ เพิ่มได้โดย:

1. เพิ่ม **Webhook node** ตัวใหม่ path `imjai-web-chat` (method POST, response mode = Using Respond node)
2. ต่อเข้า node `⚙️ Config` เดิม โดยส่ง field ให้ตรงกัน: `message_text`, `line_user_id` (ใช้ session id ของเว็บแทน), `is_text = true`
3. เส้นทางตอบกลับ ให้แยกเป็น **Respond to Webhook** แทน LINE Reply API
4. **AI Agent, tools ทั้ง 4, ระบบ Human Approval และ Discord ใช้ร่วมกันได้ทั้งหมด ไม่ต้องทำใหม่**

---

## 📚 อ่านเพิ่ม

- System prompt ฉบับเต็ม → [`docs/system-prompt.md`](docs/system-prompt.md)
- ผลการทดสอบ 18 เคส → [`docs/TEST_CASES.md`](docs/TEST_CASES.md)
