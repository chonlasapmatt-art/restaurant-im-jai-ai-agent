# เว็บสั่งอาหาร ImJai Cafe & Kitchen

หน้าเว็บสั่งอาหารสำหรับ "อิ่มใจ (ImJai) Cafe & Kitchen" ต่อยอดจากดีไซน์ที่ export มาจาก Stitch
(`stitch_imjai_cafe_kitchen_web_app.zip` — 3 หน้า: หน้าแรก, ติดตามออเดอร์, ดีไซน์ซิสเต็ม) ให้กลายเป็น
เว็บที่ใช้งานได้จริง: มีเมนูครบ ตะกร้าสินค้า หน้าชำระเงินพร้อม QR PromptPay และหน้าติดตามสถานะ

เป็น **static site ล้วน** (HTML/CSS/JS, ไม่มี build step) ใช้ Tailwind ผ่าน CDN ตาม token สีและ
ฟอนต์จาก `imjai_hospitality_system/DESIGN.md` เดิม

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
| `track.html` | ติดตามสถานะออเดอร์แบบ timeline |

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

## ⚠️ สถานะปัจจุบัน: mock ล้วน ยังไม่เชื่อมระบบจริง

ตามที่ผู้ใช้เลือกไว้ตอนเริ่มงานนี้:

1. **ออเดอร์ยังไม่ถูกเขียนลง Google Sheet `Orders`** — `assets/js/orders.js` เก็บออเดอร์ไว้ใน
   `localStorage` ของเบราว์เซอร์นั้น ๆ เท่านั้น บอท LINE "น้องอิ่มใจ" จึงยังตอบสถานะออเดอร์จากเว็บนี้ไม่ได้
2. **สถานะออเดอร์ในหน้า `track.html` เป็นการจำลองตามเวลา** ไม่ใช่สถานะจริงจากครัว
   (ดู `STATUS_STEPS` ใน `assets/js/orders.js`)
3. **QR PromptPay ยังไม่ผูกบัญชีร้านจริง** — `STORE.promptpayId` ใน `assets/js/products.js`
   เป็นเลขตัวอย่าง ต้องเปลี่ยนเป็นเบอร์/เลขพร้อมเพย์จริงของร้านก่อนใช้งานจริง

## ทำต่อให้เป็นระบบจริง (ตาม README หลักของโปรเจกต์)

โปรเจกต์หลักต้องการแค่ 2 อย่างจากเว็บนี้ (ดู "ยังไม่ได้ทำ" ใน README หลัก):

1. รับออเดอร์ + เก็บเงิน
2. เขียนออเดอร์ลงแท็บ `Orders` ตามคอลัมน์เดิม:
   `order_id, created_at, line_user_id, customer_name, phone, items, total, order_type, status, eta, note`

แนวทางที่แนะนำ (สอดคล้องกับสถาปัตยกรรมเดิมที่ใช้ n8n + Google Sheets อยู่แล้ว):

1. สร้าง n8n workflow ใหม่ที่เปิดรับ `POST /order` → validate → เขียนแถวใหม่ลงชีต `Orders`
   (ใช้ Google Sheets node แบบเดียวกับ workflow หลัก) → ตอบกลับ `order_id`
2. เพิ่ม endpoint `GET /order-status?order_id=...` ใน workflow เดียวกัน อ่านสถานะจากชีตแล้วส่งกลับ
   ให้ `track.html` เรียกแทนการจำลองสถานะ
3. แก้ `createOrder()` ใน `assets/js/orders.js` ให้ `fetch()` ไปยัง endpoint ใหม่แทนการเขียนลง
   `localStorage` อย่างเดียว
4. แก้ `trackOrder()` / `loadFromQuery()` ใน `track.html` ให้ดึงสถานะจาก endpoint แทน `trackOrder()`
   ที่จำลองเวลา
5. เอา URL เว็บนี้ (พร้อมเส้นทางไป `menu.html`) ไปใส่ `ORDER_WEB_URL` ใน node `⚙️ ตั้งค่าระบบ`
   ของ workflow หลัก บอทจะเริ่มส่ง QR ให้ลูกค้าทันที
6. ถ้าต้องรับเงินจริงผ่าน PromptPay ต้องต่อกับผู้ให้บริการตรวจสอบสลิป/webhook การชำระเงินจริง —
   ตอนนี้ QR ที่ generate เป็นแค่ payload ตามสเปค PromptPay เฉย ๆ ไม่มีการยืนยันว่าเงินเข้าจริง

## โครงสร้างไฟล์

```
web/
├── index.html / menu.html / checkout.html / track.html
├── assets/
│   ├── css/style.css          # custom styles (shadow, hover, timeline pulse ฯลฯ)
│   └── js/
│       ├── tailwind-config.js # design token เดียวกับ DESIGN.md
│       ├── products.js        # เมนู + ข้อมูลร้าน (sync กับ data/Products.csv)
│       ├── cart.js             # ตะกร้า (localStorage)
│       ├── orders.js           # สร้าง/อ่านออเดอร์ + จำลองสถานะ (mock, ดูหัวข้อด้านบน)
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
