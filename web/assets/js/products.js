// Menu data — mirrors data/Products.csv (the sheet the LINE bot "น้องอิ่มใจ" reads from).
// Keep sku/name/price/is_available in sync with that CSV so the bot and the website never disagree.
// Source of truth for this revision: DATA_IM_JAI_Menu_FAQ.csv (uploaded 2026-08-21).

const STORE = {
  name: 'อิ่มใจ (ImJai) Cafe & Kitchen',
  tagline: 'รสชาติของความอิ่มใจ ในทุกคำที่ทาน',
  taglineEn: 'The taste of happiness in every bite.',
  address: '88/12 ถ.สุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ 10110',
  hours: 'ทุกวัน 07:00–20:00 น. (ครัวปิดรับออเดอร์ 19:30 น.)',
  phone: '02-123-4567',
  lineOA: '@imjaicafe',
  deliveryFeeNote: 'ฟรีค่าส่งเมื่อสั่งครบ 300 บาท / ต่ำกว่านั้นคิด 30 บาท',
  promptpayId: '099-875-6879' // เบอร์พร้อมเพย์จริงของร้าน
};

const CATEGORIES = [
  { id: 'coffee', label: 'กาแฟ', icon: 'coffee' },
  { id: 'non-coffee', label: 'เครื่องดื่มอื่น ๆ', icon: 'emoji_food_beverage' },
  { id: 'food', label: 'อาหารจานหลัก', icon: 'ramen_dining' },
  { id: 'dessert', label: 'ของหวาน & เบเกอรี่', icon: 'bakery_dining' }
];

// `icon` is a Material Symbols name used for the card art (see the note in style.css —
// this build has no real dish photography, so each item gets a distinct icon treatment
// instead of a mismatched stock photo).
const PRODUCTS = [
  { sku: 'FD-01', name: 'ข้าวผัดกะเพราหมูสับ ไข่ดาว', category: 'food', price: 79, description: 'เผ็ดกลาง ใส่ไข่ดาว 1 ฟอง เลือกไม่ใส่ผงชูรสได้', allergens: '-', is_available: true, promotion: '', icon: 'rice_bowl' },
  { sku: 'FD-02', name: 'ข้าวไข่เจียวหมูสับ', category: 'food', price: 65, description: 'ไข่เจียวนุ่มสไตล์ญี่ปุ่น เสิร์ฟพร้อมข้าวสวยและน้ำจิ้มซีฟู้ด', allergens: 'ไข่ (Egg)', is_available: true, promotion: '', icon: 'egg' },
  { sku: 'FD-03', name: 'สปาเก็ตตี้คาโบนาร่า', category: 'food', price: 99, description: 'ครีมชีสเบคอน ใส่พาร์เมซานชีส', allergens: 'นม (Milk), ไข่ (Egg)', is_available: true, promotion: '', icon: 'ramen_dining' },
  { sku: 'FD-04', name: 'แซนวิชแฮมชีส', category: 'food', price: 69, description: 'ขนมปังโฮลวีต แฮม เชดดาร์ชีส ผักสด', allergens: 'นม (Milk), กลูเตน (Gluten)', is_available: true, promotion: '', icon: 'lunch_dining' },
  { sku: 'FD-05', name: 'ต้มยำกุ้ง', category: 'food', price: 120, description: 'ต้มยำน้ำข้นรสจัด ใส่กุ้งสด 4 ตัว', allergens: 'กุ้ง (Shellfish)', is_available: false, promotion: '', icon: 'soup_kitchen', note: 'วันนี้หมดชั่วคราว แนะนำสปาเก็ตตี้คาโบนาร่าหรือข้าวผัดกะเพราแทนได้' },
  { sku: 'DS-01', name: 'เค้กช็อกโกแลต', category: 'dessert', price: 89, description: 'เนื้อเข้มข้น หน้าเคลือบกานาช', allergens: 'นม (Milk), ไข่ (Egg), กลูเตน (Gluten)', is_available: true, promotion: '', icon: 'cake' },
  { sku: 'DS-02', name: 'ครัวซองต์เนยสด', category: 'dessert', price: 55, description: 'อบสดทุกเช้า', allergens: 'นม (Milk), กลูเตน (Gluten)', is_available: true, promotion: 'ซื้อคู่กับกาแฟ/ชาลด 15 บาท ถึง 31 ส.ค. 2569', icon: 'bakery_dining' },
  { sku: 'DS-03', name: 'ชีสเค้กเรดเวลเวท', category: 'dessert', price: 95, description: 'เนื้อนุ่มครีมชีส', allergens: 'นม (Milk), ไข่ (Egg), กลูเตน (Gluten)', is_available: true, promotion: '', icon: 'cake' },
  { sku: 'DR-C01', name: 'อเมริกาโน่ (ร้อน/เย็น)', category: 'coffee', price: 60, description: 'เอสเพรสโซ + น้ำร้อน/น้ำแข็ง', allergens: '-', is_available: true, promotion: '', icon: 'coffee' },
  { sku: 'DR-C02', name: 'ลาเต้ (ร้อน/เย็น)', category: 'coffee', price: 70, description: 'เอสเพรสโซ + นมสด', allergens: 'นม (Milk)', is_available: true, promotion: 'ซื้อคู่กับเบเกอรีลด 15 บาท ถึง 31 ส.ค. 2569', icon: 'local_cafe' },
  { sku: 'DR-C03', name: 'คาปูชิโน่', category: 'coffee', price: 70, description: 'เอสเพรสโซ + นมสด + ฟองนม', allergens: 'นม (Milk)', is_available: true, promotion: 'ซื้อคู่กับเบเกอรีลด 15 บาท ถึง 31 ส.ค. 2569', icon: 'emoji_food_beverage' },
  { sku: 'DR-C04', name: 'มอคค่าเย็น', category: 'coffee', price: 80, description: 'เอสเพรสโซ + นม + ช็อกโกแลต', allergens: 'นม (Milk)', is_available: true, promotion: 'ซื้อคู่กับเบเกอรีลด 15 บาท ถึง 31 ส.ค. 2569', icon: 'icecream' },
  { sku: 'DR-N01', name: 'ชาไทยเย็น', category: 'non-coffee', price: 65, description: 'ชาไทย + นมข้น + นมสด', allergens: 'นม (Milk)', is_available: true, promotion: '', icon: 'emoji_food_beverage' },
  { sku: 'DR-N02', name: 'มัทฉะลาเต้', category: 'non-coffee', price: 85, description: 'มัทฉะเกรดพรีเมียม + นมสด', allergens: 'นม (Milk)', is_available: true, promotion: '', icon: 'grass' },
  { sku: 'DR-N03', name: 'น้ำผึ้งมะนาวโซดา', category: 'non-coffee', price: 60, description: 'น้ำผึ้ง + มะนาว + โซดา', allergens: '-', is_available: true, promotion: '', icon: 'local_bar' },
  { sku: 'DR-N04', name: 'สมูทตี้สตรอว์เบอร์รี', category: 'non-coffee', price: 90, description: 'สตรอว์เบอร์รี + โยเกิร์ต', allergens: 'นม (โยเกิร์ต)', is_available: true, promotion: '', icon: 'icecream' }
];

function findProduct(sku) {
  return PRODUCTS.find((p) => p.sku === sku);
}

function categoryLabel(id) {
  const c = CATEGORIES.find((c) => c.id === id);
  return c ? c.label : id;
}

function categoryIcon(id) {
  const c = CATEGORIES.find((c) => c.id === id);
  return c ? c.icon : 'restaurant';
}

function productIcon(p) {
  return p.icon || categoryIcon(p.category);
}
