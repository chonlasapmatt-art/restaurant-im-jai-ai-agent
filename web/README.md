# เว็บสั่งอาหาร ImJai Cafe & Kitchen

หน้าเว็บสั่งอาหารสำหรับ "อิ่มใจ (ImJai) Cafe & Kitchen" ต่อยอดจากดีไซน์ที่ export มาจาก Stitch
(`stitch_imjai_cafe_kitchen_web_app.zip` — 3 หน้า: หน้าแรก, ติดตามออเดอร์, ดีไซน์ซิสเต็ม) ให้กลายเป็น
เว็บที่ใช้งานได้จริง: มีเมนูครบ ตะกร้าสินค้า หน้าชำระเงินพร้อม QR PromptPay และหน้าติดตามสถานะ

เป็น **static site ล้วน** (HTML/CSS/JS, ไม่มี build step) ใช้ Tailwind ผ่าน CDN ตาม token สีและ
ฟอนต์จาก `imjai_hospitality_system/DESIGN.md` เดิม

เชื่อมกับ n8n ได้แล้วผ่าน `../workflow/imjai-order-webapp-api.json` — ดูหัวข้อ "เชื่อมกับ n8n" ด้านล่าง

## เปิดดู

```bash
cd web
python3 -m http.server 8080
# แล้วเปิด http://localhost:8080
```

หรือเปิด `index.html` ตรง ๆ ในเบราว์เซอร์ก็ได้ (ไม่มี build step ให้รัน)

## หน้าเว็บ

| ไฟล์ | รายละเอียด |
|---|---|
| `index.html` | หน้าแรก — เมนูแนะนำ, ข้อมูลร้าน, โปรโมชั่น |
| `menu.html` | เมนูทั้งหมด 16 รายการ (ตรงกับ `data/Products.csv`) กรองตามหมวดหมู่ได้ |
| `checkout.html` | สรุปตะกร้า + ฟอร์มข้อมูลลูกค้า + เลือกรับที่ร้าน/จัดส่ง + QR PromptPay |
| `track.html` | ติดตามสถานะออเดอร์แบบ timeline + "ออเดอร์ของฉัน" แบบเรียลไทม์เมื่อ login |
| `contact.html` | ฟอร์มติดต่อร้าน (ส่งเข้า Discord ผ่าน n8n) + ข้อมูลร้าน + ลิงก์แชท LINE |

ทุกหน้ามีปุ่ม **"เข้าสู่ระบบด้วย LINE"** ที่มุมขวาบนของ header (ผ่าน LIFF) — ดูหัวข้อด้านล่าง

เมนู/ราคาปัจจุบันอ้างอิงจาก `DATA_IM_JAI__Menu_FAQ.csv` ที่อัปโหลดมา (แทนที่ชุดข้อมูลตัวอย่างเดิม)
ราคาบางรายการจึงเปลี่ยนจากตอนแรก (เช่น คาโบนาร่า 135 → 99 บาท) และมีเมนูใหม่ (แซนวิชแฮมชีส) —
ดูหัวข้อ FAQ ในไฟล์นั้นด้วยถ้าจะทำหน้า FAQ ต่อ (ยังไม่ได้ทำในรอบนี้ เพราะไม่ได้อยู่ในสโคปที่ขอ)

## รูปสินค้า

ขอ "หารูปสินค้า" ไว้ แต่ **environment นี้ปิดการเข้าถึงอินเทอร์เน็ตสำหรับดึงรูปจากเว็บภายนอก**
(Unsplash/Pexels/Wikimedia ถูก egress-block หมด) จึงหารูปจริงมาใส่ไม่ได้ในรอบนี้ — ใช้ไอคอน
Material Symbols ตัวที่ตรงกับแต่ละเมนู (เช่น `rice_bowl` สำหรับข้าวกะเพรา, `egg` สำหรับไข่เจียว,
`grass` สำหรับมัทฉะ) วางบนพื้นไล่สีตามหมวดหมู่แทน (ดู `.dish-art` ใน `assets/css/style.css` และ
field `icon` ในแต่ละ product ที่ `assets/js/products.js`) เพื่อไม่ให้ต้องใช้รูปสต็อกที่หน้าตาไม่ตรงกับ
เมนูจริง ถ้าต้องการรูปถ่ายจริง แนะนำ:
- อัปโหลดรูปเมนูจริงของร้านมาให้ (จะ crop/optimize แล้ววางแทนไอคอนให้)
- หรือรันงานนี้ต่อในเซสชันที่เข้าอินเทอร์เน็ตได้ แล้วขอให้หาแหล่งรูป CC0/ฟรีเชิงพาณิชย์ (Pexels, Unsplash) ให้

## 🔌 เชื่อมกับ n8n (ทำให้ออเดอร์เขียนลง Google Sheet จริง)

เว็บนี้เชื่อมกับ n8n ผ่าน workflow ใหม่ `workflow/imjai-order-webapp-api.json` (แยกจาก workflow
หลักของบอท LINE) เปิด 4 endpoint: รับออเดอร์ / เช็คสถานะ / ออเดอร์ของฉัน / ติดต่อเรา แล้วให้เว็บ
`fetch()` ไปเรียก

### ตั้งค่า 4 ขั้นตอน

1. **Import workflow** — n8n → **⋯ → Import from File** → เลือก `workflow/imjai-order-webapp-api.json`
2. **แก้ SHEET_ID / DISCORD_WEBHOOK** — เปิด node สีเหลือง (Code) ทั้ง 4 ตัว (`⚙️ ตั้งค่า Order API`,
   `⚙️ ตั้งค่า Status API`, `⚙️ ตั้งค่า My Orders API`, `⚙️ ตั้งค่า Contact API`) แก้ `SHEET_ID` ให้เป็น
   Sheet ID **เดียวกับ** workflow หลักของบอท "น้องอิ่มใจ" และแก้ `DISCORD_WEBHOOK` ใน node Contact API
   (ใช้ตัวเดียวกับ workflow หลักก็ได้)
3. **ผูก credential** — node Google Sheets ทั้ง 3 ตัว ต้องผูก credential ชื่อ `Google Sheets account`
   (ตั้งชื่อตรงกับที่ผูกไว้ใน workflow หลัก n8n จะผูกให้อัตโนมัติ)
4. **Save → Active** แล้วเปิด node Webhook ทั้ง 4 ตัว คัดลอก **Production URL** ของแต่ละตัว

### เอา URL มาใส่ในเว็บ — 3 จุด

| Webhook (n8n) | ใส่ที่ไฟล์ | ตัวแปร |
|---|---|---|
| `imjai-order` | `assets/js/orders.js` | `ORDER_API.createUrl` |
| `imjai-order-status` | `assets/js/orders.js` | `ORDER_API.statusUrl` |
| `imjai-my-orders` | `assets/js/auth.js` | `MY_ORDERS_API_URL` |
| `imjai-contact` | `contact.html` (ในไฟล์เอง) | `CONTACT_API_URL` |

```js
// assets/js/orders.js
const ORDER_API = {
  createUrl: 'https://your-n8n.example.com/webhook/imjai-order',
  statusUrl: 'https://your-n8n.example.com/webhook/imjai-order-status'
};
```

เว้นว่างตัวไหนไว้ = ฟีเจอร์นั้นกลับไปทำงานแบบ mock/ปิดการใช้งานอัตโนมัติ (ตะกร้า+ออเดอร์เก็บใน
localStorage, ฟอร์มติดต่อโชว์ข้อความ "ยังไม่ได้ต่อระบบ") ไม่ error — ใช้ทดสอบ/เดโมได้โดยไม่ต้องมี n8n

สุดท้ายเอา URL หน้าเว็บ (เช่น URL ของ `menu.html` ที่ deploy แล้ว) ไปใส่ `ORDER_WEB_URL` ใน node
`⚙️ ตั้งค่าระบบ` ของ **workflow หลัก** — บอทจะเริ่มส่ง QR ให้ลูกค้าทันทีเมื่อลูกค้าอยากสั่งอาหารในแชท

## 👤 เข้าสู่ระบบด้วย LINE (LIFF)

ปุ่ม "เข้าสู่ระบบด้วย LINE" ที่ header ทุกหน้าใช้ **LIFF** (LINE Front-end Framework) — ล็อกอินแล้ว
เว็บจะรู้จัก `line_user_id` ของลูกค้าอัตโนมัติ (เติมให้ตอนสั่งอาหาร ไม่ต้องพิมพ์ชื่อเอง) และเปิดหน้า
"ออเดอร์ของฉัน" ใน `track.html` ที่ดึงสถานะจาก n8n ทุก 10 วินาที

### สร้าง LIFF app (ทำครั้งเดียว)

1. เปิด [LINE Developers Console](https://developers.line.biz/console/) → เลือก Provider เดียวกับ
   LINE OA ของร้าน → **Create a new channel → LINE Login**
2. ในแชนแนล LINE Login ที่สร้าง → แท็บ **LIFF** → **Add**
   - **Size**: Full (แนะนำ)
   - **Endpoint URL**: URL ของเว็บที่ deploy แล้ว เช่น `https://order.imjaicafe.com/index.html`
   - **Scope**: ติ๊ก `profile`
   - **Bot link feature**: เลือก **On (Aggressive)** แล้วผูกกับ LINE OA ของร้าน — ทำให้ลูกค้าที่ล็อกอิน
     จากเว็บถูกเพิ่มเป็นเพื่อนบอทอัตโนมัติด้วย เชื่อมฝั่งเว็บกับฝั่งแชทเป็นคนเดียวกัน
3. คัดลอก **LIFF ID** (หน้าตาเป็น `1234567890-AbCdEfGh`)

### เอา LIFF ID มาใส่ในเว็บ — จุดเดียว

เปิด `web/assets/js/auth.js` แก้บรรทัดบนสุด:

```js
const LIFF_ID = '1234567890-AbCdEfGh';
```

เว้นว่างไว้ = ปุ่มเข้าสู่ระบบซ่อนอัตโนมัติทุกหน้า เว็บยังสั่งอาหารได้ปกติแบบไม่ต้อง login (กรอกชื่อ/เบอร์
เองในหน้าชำระเงินเหมือนเดิม)

> ⚠️ LIFF ตรวจ endpoint URL ตอน runtime — ถ้า deploy เว็บไปคนละโดเมนกับที่ตั้งไว้ในขั้นตอนที่ 2 ต้องไป
> แก้ Endpoint URL ในหน้า LIFF ให้ตรงด้วย ไม่งั้น `liff.init()` จะ error

### ข้อควรรู้เมื่อต่อจริงแล้ว

- **สถานะออเดอร์ไม่อัปเดตอัตโนมัติ** — `imjai-order-webapp-api.json` เขียนแค่ตอนสร้างออเดอร์
  (status เริ่มต้น = "รับออเดอร์แล้ว") ไม่มีอะไรมาขยับสถานะต่อ ทีมงานต้องเข้าไปแก้คอลัมน์ `status` ใน
  ชีต `Orders` เอง (ให้ตรงกับข้อความใน `STATUS_STEPS` ที่ `assets/js/orders.js`) หน้า `track.html` จะ
  แสดงตามนั้นทันที ไม่ใช่การจำลองเวลาอีกต่อไป
- **CORS** — webhook node ตั้ง `Allowed Origins (CORS)` เป็น `*` ไว้แล้ว ถ้า n8n เวอร์ชันเก่ากว่านี้ไม่รองรับ
  ให้เช็คว่า preflight (OPTIONS) ผ่านหรือไม่ ถ้าไม่ผ่านต้องอัปเดต n8n หรือใส่ reverse proxy เติม header เอง
- **QR PromptPay ผูกเบอร์จริงแล้ว** (`STORE.promptpayId` ใน `assets/js/products.js`) แต่ QR ที่ generate
  เป็นแค่ payload ตามสเปค PromptPay เฉย ๆ **ไม่มีการยืนยันอัตโนมัติว่าเงินเข้าจริง** — พนักงานต้องเช็คสลิป/
  ยอดโอนเองทุกครั้ง ถ้าต้องการตรวจสลิปอัตโนมัติต้องต่อผู้ให้บริการแยก (เช่น SlipOK, Easy Slip) เพิ่มเอง
- **บันทึกในเบราว์เซอร์นี้ก็ยังเก็บอยู่** — `resolveOrder()` ใน `assets/js/orders.js` ผสานข้อมูลจาก
  localStorage (สำหรับรายการสินค้าแบบละเอียด) เข้ากับสถานะสดจาก n8n เข้าด้วยกัน ถ้าลูกค้าเปิดลิงก์
  ติดตามจากเครื่อง/เบราว์เซอร์อื่น จะเห็นแค่สรุปข้อความ `items` จากชีต ไม่เห็นรายการแยกทีละชิ้น
- **"ออเดอร์ของฉัน" ต้องมี `line_user_id`** — ปรากฏเฉพาะออเดอร์ที่สร้างตอน login ด้วย LINE แล้วเท่านั้น
  (เว็บส่ง `line_user_id` แนบไปตอนสั่งอัตโนมัติ) ออเดอร์ที่สั่งตอนยังไม่ login จะไม่โผล่ในรายการนี้
- **ฟอร์มติดต่อเราไม่ยืนยันว่าข้อความถึงจริง** — แค่ยิงเข้า Discord webhook (`onError:
  continueRegularOutput` ใน node "ส่งเข้า Discord") ถ้า Discord ล่มหรือ URL ผิด เว็บจะยังตอบ "สำเร็จ"
  อยู่ดี ควรทดสอบยิงจริงหลัง deploy ว่าข้อความเด้งเข้า Discord จริง

## โครงสร้างไฟล์

```
web/
├── index.html / menu.html / checkout.html / track.html / contact.html
├── assets/
│   ├── css/style.css          # custom styles (shadow, hover, timeline pulse ฯลฯ)
│   └── js/
│       ├── tailwind-config.js # design token เดียวกับ DESIGN.md
│       ├── products.js        # เมนู + ข้อมูลร้าน (sync กับ data/Products.csv)
│       ├── cart.js             # ตะกร้า (localStorage)
│       ├── orders.js           # สร้าง/อ่านออเดอร์ — เรียก n8n จริงถ้าตั้งค่า ORDER_API, ไม่งั้น mock
│       ├── auth.js             # เข้าสู่ระบบด้วย LINE (LIFF) + "ออเดอร์ของฉัน" แบบเรียลไทม์
│       ├── promptpay.js        # สร้าง PromptPay QR payload (EMV spec)
│       ├── qrcode.min.js       # QR code renderer (Kazuhiko Arase, MIT-style license)
│       ├── nav.js              # header/มือถือ drawer/ตะกร้า drawer ที่ใช้ร่วมกันทุกหน้า
│       └── animations.js       # scroll reveal, toast, cart-badge bounce (ดูหัวข้อ "ลูกเล่น")
└── README.md
```

## ลูกเล่น/แอนิเมชัน

- **โหลดหน้า**: `<main>` แต่ละหน้ามี class `page-enter` (ไล่มาจาก `style.css`) เฟดขึ้นเบา ๆ ตอนโหลด
  ไม่ต้องใช้ JS
- **Scroll reveal**: การ์ดเมนู/section ต่าง ๆ มี class `reveal` — เลื่อนเข้ามาในจอแล้วค่อยเฟดขึ้นทีละใบ
  แบบมี delay ไล่กัน (`staggerReveal()` + `initReveal()` ใน `animations.js`)
- **เพิ่มลงตะกร้า**: มี toast แจ้งเตือนล่างจอ + badge ตะกร้ากระเด้ง (`showToast()`, `bounceCartBadge()`)
- **หน้าแรก**: ไอคอนกาแฟใน hero มีไอน้ำลอย (`.steam`), ปุ่มแชทลอยหายใจเบา ๆ (`chat-breathe`)
- **การ์ดเมนู**: hover แล้วไอคอนลอยขึ้นเล็กน้อย + มีแสงกวาดผ่าน (sheen)
- **หน้าชำระเงิน**: สลับวิธีรับของ/ชำระเงินมี transition สี, QR code เด้งเข้า (`qr-pop`) ทุกครั้งที่ยอดเปลี่ยน
- **หน้าติดตามออเดอร์**: แถบ progress ของ timeline เปลี่ยนความยาวแบบ animate แทนที่จะกระโดด
- ทุกแอนิเมชันเคารพ `prefers-reduced-motion: reduce` (ปิดแทบทั้งหมดให้อัตโนมัติ)

อัปเดตเมนู/ราคาที่ `assets/js/products.js` ให้ตรงกับ `data/Products.csv` เสมอ เพื่อไม่ให้เว็บกับบอท
ตอบราคาไม่ตรงกัน
