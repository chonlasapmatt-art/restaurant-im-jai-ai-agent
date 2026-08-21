// Cart — persisted in localStorage so it survives navigation between pages.
// Shape: { [sku]: qty }

const CART_KEY = 'imjai_cart_v1';

const Cart = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || {};
    } catch (e) {
      return {};
    }
  },

  write(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent('cart:change', { detail: cart }));
  },

  add(sku, qty = 1) {
    const cart = Cart.read();
    cart[sku] = (cart[sku] || 0) + qty;
    if (cart[sku] <= 0) delete cart[sku];
    Cart.write(cart);
  },

  setQty(sku, qty) {
    const cart = Cart.read();
    if (qty <= 0) {
      delete cart[sku];
    } else {
      cart[sku] = qty;
    }
    Cart.write(cart);
  },

  remove(sku) {
    Cart.setQty(sku, 0);
  },

  clear() {
    Cart.write({});
  },

  lines() {
    const cart = Cart.read();
    return Object.entries(cart)
      .map(([sku, qty]) => ({ product: findProduct(sku), qty }))
      .filter((line) => line.product);
  },

  count() {
    return Object.values(Cart.read()).reduce((a, b) => a + b, 0);
  },

  subtotal() {
    return Cart.lines().reduce((sum, line) => sum + line.product.price * line.qty, 0);
  }
};

function fmtTHB(n) {
  return '฿' + Math.round(n).toLocaleString('th-TH');
}
