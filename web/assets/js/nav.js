// Shared header behavior: mobile nav drawer + slide-over cart drawer + cart badge.
// Included on every page except checkout.html (which shows the cart inline instead).

function initNav() {
  document.querySelectorAll('[data-mobile-menu-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('mobile-drawer')?.classList.toggle('translate-x-full');
      document.getElementById('mobile-backdrop')?.classList.toggle('hidden');
    });
  });
  document.querySelectorAll('[data-mobile-menu-close]').forEach((btn) => {
    btn.addEventListener('click', closeMobileDrawer);
  });
  document.getElementById('mobile-backdrop')?.addEventListener('click', closeMobileDrawer);

  document.querySelectorAll('[data-cart-toggle]').forEach((btn) => {
    btn.addEventListener('click', openCartDrawer);
  });
  document.querySelectorAll('[data-cart-close]').forEach((btn) => {
    btn.addEventListener('click', closeCartDrawer);
  });
  document.getElementById('cart-backdrop')?.addEventListener('click', closeCartDrawer);

  renderCartBadge();
  renderCartDrawer();
  document.addEventListener('cart:change', () => {
    renderCartBadge();
    renderCartDrawer();
  });
}

function closeMobileDrawer() {
  document.getElementById('mobile-drawer')?.classList.add('translate-x-full');
  document.getElementById('mobile-backdrop')?.classList.add('hidden');
}

function openCartDrawer() {
  document.getElementById('cart-drawer')?.classList.remove('translate-x-full');
  document.getElementById('cart-backdrop')?.classList.remove('hidden');
}

function closeCartDrawer() {
  document.getElementById('cart-drawer')?.classList.add('translate-x-full');
  document.getElementById('cart-backdrop')?.classList.add('hidden');
}

function renderCartBadge() {
  const count = Cart.count();
  document.querySelectorAll('[data-cart-badge]').forEach((el) => {
    el.textContent = count;
    el.classList.toggle('hidden', count === 0);
  });
}

function renderCartDrawer() {
  const body = document.getElementById('cart-drawer-body');
  const footer = document.getElementById('cart-drawer-footer');
  if (!body) return;

  const lines = Cart.lines();

  if (lines.length === 0) {
    body.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-center gap-sm text-on-surface-variant py-xl">
      <span class="material-symbols-outlined text-5xl opacity-50">shopping_cart</span>
      <p class="font-body-md text-body-md">ตะกร้ายังว่างอยู่</p>
      <a href="menu.html" class="font-label-md text-label-md text-primary underline">ไปเลือกเมนู</a>
    </div>`;
    if (footer) footer.classList.add('hidden');
    return;
  }

  body.innerHTML = lines
    .map(
      (line) => `
    <div class="flex gap-sm items-center py-sm border-b border-outline-variant/30" data-sku="${line.product.sku}">
      <div class="dish-art w-14 h-14 rounded-lg flex-shrink-0" data-cat="${line.product.category}">
        <span class="material-symbols-outlined !text-2xl">${productIcon(line.product)}</span>
      </div>
      <div class="flex-grow min-w-0">
        <div class="font-label-md text-label-md text-on-surface truncate">${line.product.name}</div>
        <div class="font-body-md text-body-md text-primary">${fmtTHB(line.product.price)}</div>
      </div>
      <div class="flex items-center gap-xs">
        <button class="w-7 h-7 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors" data-qty-minus>
          <span class="material-symbols-outlined !text-base">remove</span>
        </button>
        <span class="w-5 text-center font-label-md text-label-md">${line.qty}</span>
        <button class="w-7 h-7 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors" data-qty-plus>
          <span class="material-symbols-outlined !text-base">add</span>
        </button>
      </div>
    </div>`
    )
    .join('');

  body.querySelectorAll('[data-qty-minus]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const sku = e.target.closest('[data-sku]').dataset.sku;
      Cart.add(sku, -1);
    });
  });
  body.querySelectorAll('[data-qty-plus]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const sku = e.target.closest('[data-sku]').dataset.sku;
      Cart.add(sku, 1);
    });
  });

  if (footer) {
    footer.classList.remove('hidden');
    const totalEl = footer.querySelector('[data-cart-total]');
    if (totalEl) totalEl.textContent = fmtTHB(Cart.subtotal());
  }
}

document.addEventListener('DOMContentLoaded', initNav);
