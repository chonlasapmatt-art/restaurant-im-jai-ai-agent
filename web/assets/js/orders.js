// Order "database" — mock only, kept in localStorage on this browser.
//
// This is NOT wired to the real Google Sheets "Orders" tab yet, so the LINE bot
// (น้องอิ่มใจ) cannot see orders placed here. To go live, replace `saveOrderRecord()`
// below with a POST to an n8n webhook that appends a row to that sheet using the
// exact same columns — see README.md in this folder and the project's main
// README ("ยังไม่ได้ทำ" section) for the column list and wiring notes.

const ORDERS_KEY = 'imjai_orders_v1';

// Timeline stages mirror the Stitch order-tracking design. `afterMinutes` is how
// long after the order was placed the mock clock advances to that stage —
// this stands in for the kitchen updating a real status until there's a backend.
const STATUS_STEPS = [
  { key: 'received', label: 'รับออเดอร์แล้ว', icon: 'receipt', afterMinutes: 0 },
  { key: 'preparing', label: 'กำลังเตรียม', icon: 'soup_kitchen', afterMinutes: 2 },
  { key: 'ready', label: null, icon: null, afterMinutes: 8 }, // label depends on order_type, filled in below
  { key: 'completed', label: 'เสร็จสิ้น', icon: 'check_circle', afterMinutes: 15 }
];

function readyStepFor(orderType) {
  return orderType === 'delivery'
    ? { label: 'กำลังจัดส่ง', icon: 'local_shipping' }
    : { label: 'พร้อมรับที่ร้าน', icon: 'storefront' };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDateTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatTime(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function generateOrderId(d) {
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `ORD-${stamp}`;
}

function readOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveOrderRecord(order) {
  const orders = readOrders();
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

/**
 * Creates an order from the current cart. Matches the Orders sheet columns:
 * order_id, created_at, line_user_id, customer_name, phone, items, total, order_type, status, eta, note
 */
function createOrder({ customerName, phone, orderType, note, lineUserId, total }) {
  const lines = Cart.lines();
  if (lines.length === 0) throw new Error('cart is empty');

  const now = new Date();
  const eta = new Date(now.getTime() + 20 * 60000);
  const itemsText = lines.map((l) => `${l.product.name} x${l.qty}`).join(', ');
  if (total === undefined) total = Cart.subtotal();

  const order = {
    order_id: generateOrderId(now),
    created_at: formatDateTime(now),
    created_at_ms: now.getTime(),
    line_user_id: lineUserId || '',
    customer_name: customerName,
    phone,
    items: itemsText,
    items_detail: lines.map((l) => ({ sku: l.product.sku, name: l.product.name, qty: l.qty, price: l.product.price })),
    total,
    order_type: orderType,
    status: STATUS_STEPS[0].label,
    eta: formatTime(eta),
    note: note || ''
  };

  saveOrderRecord(order);
  Cart.clear();
  return order;
}

function getOrder(orderId) {
  return readOrders().find((o) => o.order_id === orderId) || null;
}

function getAllOrders() {
  return readOrders();
}

/** Returns { stepIndex, steps } describing where the order is on the mock timeline right now. */
function trackOrder(order) {
  const ready = readyStepFor(order.order_type);
  const steps = STATUS_STEPS.map((s) => (s.key === 'ready' ? { ...s, label: ready.label, icon: ready.icon } : s));

  const elapsedMinutes = (Date.now() - order.created_at_ms) / 60000;
  let stepIndex = 0;
  steps.forEach((s, i) => {
    if (elapsedMinutes >= s.afterMinutes) stepIndex = i;
  });

  return { stepIndex, steps };
}
