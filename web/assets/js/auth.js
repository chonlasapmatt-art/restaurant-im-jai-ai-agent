// "Sign in with LINE" via LIFF (LINE Front-end Framework).
//
// ⚙️ ใส่ LIFF ID จาก LINE Developers Console (สร้าง LINE Login channel → เพิ่ม LIFF app แบบ "Web")
// ตรงนี้ที่เดียว — เว้นว่างไว้ = ปุ่มเข้าสู่ระบบจะซ่อนอัตโนมัติ เว็บยังสั่งอาหารได้ปกติแบบไม่ต้อง login
// ดูขั้นตอนสร้าง LIFF app ใน README.md หัวข้อ "เข้าสู่ระบบด้วย LINE (LIFF)"
const LIFF_ID = '';

// ⚙️ วาง Production URL ของ webhook "imjai-my-orders" จาก workflow/imjai-order-webapp-api.json
const MY_ORDERS_API_URL = ''; // เช่น 'https://your-n8n.example.com/webhook/imjai-my-orders'

const AUTH_KEY = 'imjai_auth_profile_v1';

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch (e) {
    return null;
  }
}
function setProfile(p) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(p));
}
function clearProfile() {
  localStorage.removeItem(AUTH_KEY);
}
function isLoggedIn() {
  return !!getProfile();
}

let liffReady = false;

// Loaded on demand (only when LIFF_ID is set) so a slow/unreachable LINE CDN can never
// block page rendering — no <script> tag for this in <head>, unlike a normal dependency.
function loadLiffSdk() {
  return new Promise((resolve, reject) => {
    if (window.liff) return resolve();
    const s = document.createElement('script');
    s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('โหลด LIFF SDK ไม่สำเร็จ'));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('โหลด LIFF SDK หมดเวลา')), 8000);
  });
}

async function initAuth() {
  if (!LIFF_ID) {
    renderAuthUI();
    return;
  }
  try {
    await loadLiffSdk();
    await liff.init({ liffId: LIFF_ID });
    liffReady = true;
    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      setProfile({ userId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl || '' });
    } else {
      clearProfile();
    }
  } catch (e) {
    console.warn('LIFF init failed — เข้าสู่ระบบด้วย LINE จะใช้ไม่ได้จนกว่าจะแก้ LIFF_ID', e);
  }
  renderAuthUI();
  document.dispatchEvent(new CustomEvent('auth:ready'));
}

function loginWithLine() {
  if (!liffReady) return;
  if (!liff.isLoggedIn()) liff.login({ redirectUri: window.location.href });
}

function logoutOfLine() {
  if (liffReady && liff.isLoggedIn()) liff.logout();
  clearProfile();
  window.location.reload();
}

function renderAuthUI() {
  const profile = getProfile();
  document.querySelectorAll('[data-auth-slot]').forEach((slot) => {
    if (!LIFF_ID) {
      slot.innerHTML = '';
      return;
    }
    if (profile) {
      slot.innerHTML = `
        <button class="flex items-center gap-xs hover:opacity-80 transition-opacity" data-account-btn>
          ${profile.pictureUrl ? `<img src="${profile.pictureUrl}" class="w-8 h-8 rounded-full object-cover" alt="${profile.displayName}"/>` : '<span class="material-symbols-outlined text-primary">account_circle</span>'}
          <span class="hidden md:inline font-label-md text-label-md text-on-surface max-w-[120px] truncate">${profile.displayName}</span>
        </button>`;
      slot.querySelector('[data-account-btn]').addEventListener('click', () => {
        window.location.href = 'track.html#my-orders';
      });
    } else {
      slot.innerHTML = `
        <button class="flex items-center gap-xs bg-primary text-on-primary px-md py-xs rounded-full font-label-md text-label-md hover:bg-primary/90 transition-colors" data-login-btn>
          <span class="material-symbols-outlined !text-lg">login</span>
          <span class="hidden sm:inline">เข้าสู่ระบบด้วย LINE</span>
        </button>`;
      slot.querySelector('[data-login-btn]').addEventListener('click', loginWithLine);
    }
  });
}

document.addEventListener('DOMContentLoaded', initAuth);
