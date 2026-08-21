// Order "database". Writes to Google Sheets via the n8n workflow in
// workflow/imjai-order-webapp-api.json when ORDER_API is configured below;
// otherwise falls back to a localStorage-only mock so the site still works
// as a demo out of the box.

// ⚙️ วาง Production URL ของ webhook ทั้ง 2 ตัว จาก workflow "imjai-order-webapp-api.json"
// ตรงนี้ที่เดียว — เว้นว่างไว้ = เว็บทำงานแบบ mock (เก็บออเดอร์ใน localStorage เบราว์เซอร์นี้เท่านั้น)
const ORDER_API = {
  createUrl: '', // เช่น 'https://your-n8n.example.com/webhook/imjai-order'
  statusUrl: '' // เช่น 'https://your-n8n.example.com/webhook/imjai-order-status'
};

const ORDERS_KEY = 'imjai_orders_v1';

// Timeline stages mirror the Stitch order-tracking design. `afterMinutes` is used only
// in mock mode, to simulate the kitchen advancing the order over time. In live mode
// (ORDER_API.statusUrl set) the step is read straight from the sheet's `status` column
// instead — nothing here auto-advances that; staff update it manually for now.
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
 *
 * Posts to ORDER_API.createUrl when configured (throws if that call fails — callers
 * should show the error rather than pretend the order went through) and always keeps a
 * local copy so this browser's "recent orders" / itemized tracking view still works.
 */
async function createOrder({ customerName, phone, orderType, note, lineUserId, total }) {
  const lines = Cart.lines();
  if (lines.length === 0) throw new Error('cart is empty');

  const itemsText = lines.map((l) => `${l.product.name} x${l.qty}`).join(', ');
  if (total === undefined) total = Cart.subtotal();
  const itemsDetail = lines.map((l) => ({ sku: l.product.sku, name: l.product.name, qty: l.qty, price: l.product.price }));

  let order;

  if (ORDER_API.createUrl) {
    const res = await fetch(ORDER_API.createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerName,
        phone,
        items: itemsText,
        total,
        order_type: orderType,
        note: note || '',
        line_user_id: lineUserId || ''
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.result !== 'ok') {
      throw new Error(data.message || 'เชื่อมต่อระบบสั่งอาหารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
    const now = new Date();
    order = {
      order_id: data.order_id,
      created_at: data.created_at || formatDateTime(now),
      created_at_ms: now.getTime(),
      line_user_id: lineUserId || '',
      customer_name: customerName,
      phone,
      items: itemsText,
      items_detail: itemsDetail,
      total,
      order_type: orderType,
      eta: data.eta,
      note: note || ''
    };
  } else {
    const now = new Date();
    const eta = new Date(now.getTime() + 20 * 60000);
    order = {
      order_id: generateOrderId(now),
      created_at: formatDateTime(now),
      created_at_ms: now.getTime(),
      line_user_id: lineUserId || '',
      customer_name: customerName,
      phone,
      items: itemsText,
      items_detail: itemsDetail,
      total,
      order_type: orderType,
      eta: formatTime(eta),
      note: note || ''
    };
  }

  saveOrderRecord(order);
  Cart.clear();
  return order;
}

function getLocalOrder(orderId) {
  return readOrders().find((o) => o.order_id === orderId) || null;
}

function getAllOrders() {
  return readOrders();
}

/** Fetches live status from ORDER_API.statusUrl. Returns null if not configured, unreachable, or malformed. */
async function fetchOrderStatus(orderId) {
  if (!ORDER_API.statusUrl) return null;
  try {
    const sep = ORDER_API.statusUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${ORDER_API.statusUrl}${sep}order_id=${encodeURIComponent(orderId)}`);
    if (res.status === 404) return { not_found: true };
    const data = await res.json();
    if (!res.ok || data.result !== 'ok') return null;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Resolves an order to show on the tracking page: prefers this browser's local copy
 * (so itemized lines are available) and layers live status/eta/total on top when
 * ORDER_API.statusUrl is configured and reachable. Returns null if the order can't be
 * found anywhere, or { not_found: true } is never returned here — callers get null instead.
 */
async function resolveOrder(orderId) {
  const local = getLocalOrder(orderId);
  const remote = await fetchOrderStatus(orderId);

  if (remote && remote.not_found && !local) return null;
  if (!remote && !local) return null;

  if (!remote) return local;

  const merged = Object.assign({}, local || {}, {
    order_id: remote.order_id || orderId,
    created_at: remote.created_at || (local && local.created_at),
    items: remote.items || (local && local.items),
    total: remote.total !== undefined ? remote.total : local && local.total,
    order_type: remote.order_type || (local && local.order_type),
    order_status: remote.order_status,
    eta: remote.eta || (local && local.eta),
    note: remote.note || (local && local.note) || ''
  });
  if (!merged.created_at_ms) merged.created_at_ms = Date.now();
  return merged;
}

/** Returns { stepIndex, steps } describing where the order is on the timeline right now. */
function trackOrder(order) {
  const ready = readyStepFor(order.order_type);
  const steps = STATUS_STEPS.map((s) => (s.key === 'ready' ? { ...s, label: ready.label, icon: ready.icon } : s));

  if (order.order_status !== undefined) {
    // Live order — reflect whatever status text is in the sheet, no simulation.
    let stepIndex = steps.findIndex((s) => s.label === order.order_status);
    if (stepIndex === -1) stepIndex = 0;
    return { stepIndex, steps };
  }

  const elapsedMinutes = (Date.now() - order.created_at_ms) / 60000;
  let stepIndex = 0;
  steps.forEach((s, i) => {
    if (elapsedMinutes >= s.afterMinutes) stepIndex = i;
  });

  return { stepIndex, steps };
}
