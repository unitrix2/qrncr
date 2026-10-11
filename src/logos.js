// Built-in centre-logo library. Every logo is a self-contained SVG badge so it
// stays sharp in PNG, SVG and PDF exports and keeps good contrast in the QR.
import { iconInner } from './icons.js';

const glyph = (name, color = '#fff', sw = 2.2) =>
  `<g transform="translate(15 15) scale(1.4167)" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${iconInner(name)}</g>`;

const wrap = (inner, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64">${defs ? `<defs>${defs}</defs>` : ''}${inner}</svg>`;

const circle = (fill, inner, defs) => wrap(`<circle cx="32" cy="32" r="31" fill="${fill}"/>${inner}`, defs);
const squircle = (fill, inner, defs) => wrap(`<rect x="1" y="1" width="62" height="62" rx="18" fill="${fill}"/>${inner}`, defs);

export const LOGOS = [
  {
    id: 'whatsapp', name: 'WhatsApp',
    svg: circle('#1fb855', `<path d="M32 14a18 18 0 0 0-15.5 27.1L14 50l9.2-2.4A18 18 0 1 0 32 14z" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/><path d="M25.5 24.5c-1 1.2-1.2 3 .2 5.4 1.5 2.6 4.2 5.4 7.4 6.6 2 .7 3.5-.2 4.3-1.4l-3.1-2-1.5 1.1c-1.8-.8-3.6-2.5-4.5-4.4l1.2-1.4-1.8-3.4z" fill="#fff"/>`),
  },
  {
    id: 'instagram', name: 'Instagram',
    svg: squircle('url(#ig)', `<rect x="16" y="16" width="32" height="32" rx="10" fill="none" stroke="#fff" stroke-width="3.4"/><circle cx="32" cy="32" r="7.5" fill="none" stroke="#fff" stroke-width="3.4"/><circle cx="41.5" cy="22.5" r="2.2" fill="#fff"/>`,
      `<linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f9a43a"/><stop offset=".5" stop-color="#e1306c"/><stop offset="1" stop-color="#7a3fd1"/></linearGradient>`),
  },
  {
    id: 'youtube', name: 'YouTube',
    svg: wrap(`<rect x="1" y="12" width="62" height="40" rx="12" fill="#ef2b2b"/><path d="M27 23.5v17l15-8.5z" fill="#fff"/>`),
  },
  {
    id: 'facebook', name: 'Facebook',
    svg: circle('#1877f2', `<path d="M35.5 52V35.5h5.4l.9-6.6h-6.3v-4.2c0-1.9.6-3.2 3.3-3.2H42V15.6c-.6-.1-2.6-.3-4.9-.3-4.8 0-8.1 2.9-8.1 8.3v5.3h-5.4v6.6H29V52z" fill="#fff"/>`),
  },
  {
    id: 'x', name: 'X',
    svg: circle('#111111', `<path d="M19 18h8.6l7.2 9.8L43 18h3.8L36.6 30.2 47.5 46H39l-7.6-10.5L22.2 46H18.4l10.8-12.8z" fill="#fff"/>`),
  },
  {
    id: 'linkedin', name: 'LinkedIn',
    svg: squircle('#0a66c2', `<rect x="15" y="26" width="6.8" height="22" rx="1.2" fill="#fff"/><circle cx="18.4" cy="18.6" r="4" fill="#fff"/><path d="M26.5 26H33v3c1-2 3.3-3.6 6.5-3.6 6 0 8.5 3.6 8.5 9.6V48h-6.8V36.3c0-2.7-1-4.3-3.3-4.3-2.5 0-3.7 1.8-3.7 4.5V48h-6.7z" fill="#fff"/>`),
  },
  {
    id: 'telegram', name: 'Telegram',
    svg: circle('#2aa3e0', glyph('send', '#fff', 2.1)),
  },
  { id: 'upi', name: 'UPI / Pay', svg: squircle('#087a72', glyph('rupee', '#fff', 2.4)) },
  { id: 'wifi', name: 'Wi-Fi', svg: squircle('#2563eb', glyph('wifi', '#fff', 2.4)) },
  { id: 'phone', name: 'Call', svg: circle('#16a34a', glyph('phone', '#fff', 2.2)) },
  { id: 'mail', name: 'Email', svg: squircle('#e5484d', glyph('mail', '#fff', 2.2)) },
  { id: 'pin', name: 'Location', svg: circle('#f97316', glyph('pin', '#fff', 2.2)) },
  { id: 'store', name: 'Store', svg: squircle('#7c3aed', glyph('store', '#fff', 2.2)) },
  { id: 'coffee', name: 'Café', svg: circle('#92400e', glyph('coffee', '#fff', 2.2)) },
  { id: 'heart', name: 'Heart', svg: circle('#e11d48', `<g transform="translate(15 15) scale(1.4167)"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" fill="#fff"/></g>`) },
  { id: 'star', name: 'Star', svg: circle('#f59e0b', `<g transform="translate(15 15) scale(1.4167)"><path d="M11.5 2.3a.55.55 0 0 1 1 0l2.3 4.7a2.1 2.1 0 0 0 1.6 1.2l5.1.7a.55.55 0 0 1 .3.9l-3.7 3.6a2.1 2.1 0 0 0-.6 1.9l.9 5.1a.55.55 0 0 1-.8.6l-4.6-2.4a2.1 2.1 0 0 0-2 0L6.7 21a.55.55 0 0 1-.8-.600l.9-5.1a2.1 2.1 0 0 0-.6-1.9L2.6 9.8a.55.55 0 0 1 .3-.900L8 8.2a2.1 2.1 0 0 0 1.6-1.2z" fill="#fff"/></g>`) },
  { id: 'qr', name: 'QR mark', svg: squircle('#0f2a2e', glyph('qr', '#fff', 2.2)) },
];

const toUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Resolve a style.logo value ({kind:'preset'|'custom', ...}) into an image URL. */
export function logoSrc(logo) {
  if (!logo) return null;
  if (logo.kind === 'custom') return logo.src || null;
  const found = LOGOS.find((l) => l.id === logo.id);
  return found ? toUri(found.svg) : null;
}

export const logoThumb = (l) => toUri(l.svg);
