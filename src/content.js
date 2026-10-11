// Content types: form fields + the function that turns them into a QR payload.
// build() returns '' while required fields are missing.

const enc = encodeURIComponent;
const trim = (v) => String(v ?? '').trim();

const wifiEsc = (s) => String(s).replace(/([\\;,:"])/g, '\\$1');
const vEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const hasScheme = (s) => /^[a-z][a-z0-9+.-]*:/i.test(s);

const dtLocal = (v) => (v ? v.replace(/[-:]/g, '').slice(0, 13) + '00' : '');
function addHour(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  d.setHours(d.getHours() + 1);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

export const SOCIAL = {
  instagram: { name: 'Instagram', url: 'https://instagram.com/' },
  youtube: { name: 'YouTube', url: 'https://youtube.com/@' },
  linkedin: { name: 'LinkedIn', url: 'https://linkedin.com/in/' },
  x: { name: 'X (Twitter)', url: 'https://x.com/' },
  facebook: { name: 'Facebook', url: 'https://facebook.com/' },
  github: { name: 'GitHub', url: 'https://github.com/' },
  telegram: { name: 'Telegram', url: 'https://t.me/' },
  snapchat: { name: 'Snapchat', url: 'https://snapchat.com/add/' },
  tiktok: { name: 'TikTok', url: 'https://tiktok.com/@' },
};

const COINS = {
  bitcoin: 'Bitcoin', ethereum: 'Ethereum', litecoin: 'Litecoin', bitcoincash: 'Bitcoin Cash', dogecoin: 'Dogecoin', solana: 'Solana',
};

export const CONTENT_TYPES = [
  {
    id: 'url', label: 'Website', icon: 'globe',
    hint: 'Opens a web page when scanned. https:// is added automatically.',
    fields: [{ key: 'url', label: 'Web address', type: 'text', placeholder: 'example.com/menu', required: true, full: true, inputmode: 'url' }],
    build: (v) => { const u = trim(v.url); return u ? (hasScheme(u) ? u : `https://${u}`) : ''; },
  },
  {
    id: 'text', label: 'Plain text', icon: 'text',
    hint: 'Shows the text on the scanner. Good for codes, notes and serial numbers.',
    fields: [{ key: 'text', label: 'Text', type: 'textarea', placeholder: 'Type anything…', required: true, full: true }],
    build: (v) => String(v.text ?? '').trim(),
  },
  {
    id: 'wifi', label: 'Wi-Fi', icon: 'wifi',
    hint: 'Guests join the network by scanning, with no password typing.',
    fields: [
      { key: 'ssid', label: 'Network name (SSID)', type: 'text', placeholder: 'Office-WiFi', required: true },
      { key: 'password', label: 'Password', type: 'text', placeholder: 'Leave empty for open networks' },
      { key: 'security', label: 'Security', type: 'select', options: [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'No password']], default: 'WPA' },
      { key: 'hidden', label: 'Hidden network', type: 'checkbox' },
    ],
    build: (v) => {
      const ssid = trim(v.ssid);
      if (!ssid) return '';
      const sec = v.security || 'WPA';
      const pass = sec === 'nopass' ? '' : trim(v.password);
      return `WIFI:T:${sec};S:${wifiEsc(ssid)};${pass ? `P:${wifiEsc(pass)};` : ''}${v.hidden ? 'H:true;' : ''};`;
    },
  },
  {
    id: 'upi', label: 'UPI payment', icon: 'rupee',
    hint: 'Opens any UPI app with the payee filled in. Leave the amount empty to let the payer choose.',
    fields: [
      { key: 'pa', label: 'UPI ID', type: 'text', placeholder: 'name@bank', required: true },
      { key: 'pn', label: 'Payee name', type: 'text', placeholder: 'Shop or person name' },
      { key: 'am', label: 'Amount (₹)', type: 'number', placeholder: 'Optional', inputmode: 'decimal' },
      { key: 'tn', label: 'Note', type: 'text', placeholder: 'Optional' },
    ],
    build: (v) => {
      const pa = trim(v.pa);
      if (!pa) return '';
      const q = [`pa=${enc(pa).replace(/%40/g, '@')}`];
      if (trim(v.pn)) q.push(`pn=${enc(trim(v.pn))}`);
      if (trim(v.am) && Number(v.am) > 0) q.push(`am=${Number(v.am)}`);
      q.push('cu=INR');
      if (trim(v.tn)) q.push(`tn=${enc(trim(v.tn))}`);
      return `upi://pay?${q.join('&')}`;
    },
  },
  {
    id: 'vcard', label: 'Contact card', icon: 'contact',
    hint: 'Saves a full contact to the phone with one tap.',
    fields: [
      { key: 'first', label: 'First name', type: 'text', placeholder: 'Salman' },
      { key: 'last', label: 'Last name', type: 'text', placeholder: '' },
      { key: 'org', label: 'Company', type: 'text' },
      { key: 'title', label: 'Job title', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'website', label: 'Website', type: 'text', full: true },
      { key: 'address', label: 'Address', type: 'textarea', full: true },
    ],
    build: (v) => {
      const first = trim(v.first), last = trim(v.last);
      if (!first && !last) return '';
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEsc(last)};${vEsc(first)};;;`, `FN:${vEsc(`${first} ${last}`.trim())}`];
      if (trim(v.org)) lines.push(`ORG:${vEsc(trim(v.org))}`);
      if (trim(v.title)) lines.push(`TITLE:${vEsc(trim(v.title))}`);
      if (trim(v.phone)) lines.push(`TEL;TYPE=CELL:${trim(v.phone)}`);
      if (trim(v.email)) lines.push(`EMAIL:${trim(v.email)}`);
      if (trim(v.website)) lines.push(`URL:${trim(v.website)}`);
      if (trim(v.address)) lines.push(`ADR;TYPE=WORK:;;${vEsc(trim(v.address))};;;;`);
      lines.push('END:VCARD');
      return lines.join('\n');
    },
  },
  {
    id: 'whatsapp', label: 'WhatsApp', icon: 'chat',
    hint: 'Starts a chat with your number. Use the country code, digits only.',
    fields: [
      { key: 'phone', label: 'Number with country code', type: 'tel', placeholder: '919876543210', required: true, full: true },
      { key: 'message', label: 'Pre-filled message', type: 'textarea', placeholder: 'Hi! I found you through your QR code.', full: true },
    ],
    build: (v) => {
      const digits = trim(v.phone).replace(/\D/g, '');
      if (!digits) return '';
      return `https://wa.me/${digits}${trim(v.message) ? `?text=${enc(trim(v.message))}` : ''}`;
    },
  },
  {
    id: 'email', label: 'Email', icon: 'mail',
    hint: 'Opens a new email with the recipient and subject filled in.',
    fields: [
      { key: 'to', label: 'To', type: 'email', placeholder: 'hello@example.com', required: true, full: true },
      { key: 'subject', label: 'Subject', type: 'text', full: true },
      { key: 'body', label: 'Message', type: 'textarea', full: true },
    ],
    build: (v) => {
      const to = trim(v.to);
      if (!to) return '';
      const q = [];
      if (trim(v.subject)) q.push(`subject=${enc(trim(v.subject))}`);
      if (trim(v.body)) q.push(`body=${enc(trim(v.body))}`);
      return `mailto:${to}${q.length ? `?${q.join('&')}` : ''}`;
    },
  },
  {
    id: 'phone', label: 'Phone call', icon: 'phone',
    hint: 'Dials the number when scanned.',
    fields: [{ key: 'number', label: 'Phone number', type: 'tel', placeholder: '+91 98765 43210', required: true, full: true }],
    build: (v) => { const n = trim(v.number).replace(/[^\d+]/g, ''); return n ? `tel:${n}` : ''; },
  },
  {
    id: 'sms', label: 'SMS', icon: 'sms',
    hint: 'Opens a text message with the number and message ready to send.',
    fields: [
      { key: 'number', label: 'Phone number', type: 'tel', placeholder: '+91 98765 43210', required: true, full: true },
      { key: 'message', label: 'Message', type: 'textarea', full: true },
    ],
    build: (v) => { const n = trim(v.number).replace(/[^\d+]/g, ''); return n ? `SMSTO:${n}:${trim(v.message)}` : ''; },
  },
  {
    id: 'event', label: 'Calendar event', icon: 'calendar',
    hint: 'Adds the event to the scanner’s calendar.',
    fields: [
      { key: 'title', label: 'Event title', type: 'text', required: true, full: true },
      { key: 'start', label: 'Starts', type: 'datetime-local', required: true },
      { key: 'end', label: 'Ends', type: 'datetime-local' },
      { key: 'location', label: 'Location', type: 'text', full: true },
      { key: 'description', label: 'Details', type: 'textarea', full: true },
    ],
    build: (v) => {
      if (!trim(v.title) || !trim(v.start)) return '';
      const start = dtLocal(v.start);
      const end = trim(v.end) ? dtLocal(v.end) : addHour(v.start);
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `SUMMARY:${vEsc(trim(v.title))}`, `DTSTART:${start}`];
      if (end) lines.push(`DTEND:${end}`);
      if (trim(v.location)) lines.push(`LOCATION:${vEsc(trim(v.location))}`);
      if (trim(v.description)) lines.push(`DESCRIPTION:${vEsc(trim(v.description))}`);
      lines.push('END:VEVENT', 'END:VCALENDAR');
      return lines.join('\n');
    },
  },
  {
    id: 'crypto', label: 'Crypto', icon: 'bitcoin',
    hint: 'Pre-fills a wallet payment. Double-check the address before sharing.',
    fields: [
      { key: 'coin', label: 'Coin', type: 'select', options: Object.entries(COINS), default: 'bitcoin' },
      { key: 'amount', label: 'Amount', type: 'number', placeholder: 'Optional', inputmode: 'decimal' },
      { key: 'address', label: 'Wallet address', type: 'text', required: true, full: true },
    ],
    build: (v) => {
      const a = trim(v.address);
      if (!a) return '';
      const amount = trim(v.amount) && Number(v.amount) > 0 ? `?amount=${Number(v.amount)}` : '';
      return `${v.coin || 'bitcoin'}:${a}${amount}`;
    },
  },
  {
    id: 'social', label: 'Social profile', icon: 'share',
    hint: 'Links straight to your profile. Paste a full link to use it as-is.',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', options: Object.entries(SOCIAL).map(([k, p]) => [k, p.name]), default: 'instagram' },
      { key: 'username', label: 'Username or link', type: 'text', placeholder: '@yourname', required: true },
    ],
    build: (v) => {
      let u = trim(v.username);
      if (!u) return '';
      if (hasScheme(u) || /^[\w-]+(\.[\w-]+)+\//.test(u)) return hasScheme(u) ? u : `https://${u}`;
      u = u.replace(/^@/, '');
      return `${(SOCIAL[v.platform] || SOCIAL.instagram).url}${enc(u)}`;
    },
  },
];

export const typeById = (id) => CONTENT_TYPES.find((t) => t.id === id) || CONTENT_TYPES[0];

export function buildPayload(typeId, values = {}) {
  const t = typeById(typeId);
  const merged = { ...Object.fromEntries(t.fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default])), ...values };
  return t.build(merged);
}
