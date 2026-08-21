// Small, dependency-free motion helpers shared across pages: scroll reveal,
// toast feedback, and a cart-badge bounce. Page-load entrance itself is pure
// CSS (`.page-enter` on <main>, see style.css) so it fires with zero JS.

function initReveal(selector = '.reveal') {
  const items = document.querySelectorAll(selector);
  if (items.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  items.forEach((el) => io.observe(el));
}

/** Applies a staggered --reveal-delay to a NodeList/array, in render order. */
function staggerReveal(elements, stepMs = 60, maxMs = 480) {
  Array.from(elements).forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${Math.min(i * stepMs, maxMs)}ms`);
    el.classList.add('reveal');
  });
}

function showToast(message, icon = 'check_circle') {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="material-symbols-outlined !text-lg">${icon}</span><span>${message}</span>`;
  root.appendChild(toast);
  setTimeout(() => toast.remove(), 2300);
}

function bounceCartBadge() {
  document.querySelectorAll('[data-cart-badge]').forEach((el) => {
    el.classList.remove('badge-pop');
    // restart the animation even if it's already mid-run
    void el.offsetWidth;
    el.classList.add('badge-pop');
  });
}
