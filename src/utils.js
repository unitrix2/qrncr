// Small, dependency-free helpers shared across the app.

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export const debounce = (fn, ms = 60) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const slug = (s, max = 40) =>
  String(s)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max) || 'qr';

export const escHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const byteLength = (s) => new TextEncoder().encode(String(s)).length;

/* ---------- Colour helpers ---------- */

export function normHex(value, fallback = '#000000') {
  let s = String(value || '').trim();
  if (!s) return fallback;
  if (s[0] !== '#') s = '#' + s;
  if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + s.slice(1).split('').map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : fallback;
}

export const isHex = (s) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s || '').trim());

export function hexToRgb(hex) {
  const h = normHex(hex);
  return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* ---------- File helpers ---------- */

export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export const fileToDataUrl = (file) => blobToDataUrl(file);

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image could not be loaded'));
    img.src = src;
  });
}
