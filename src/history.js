// Saved designs (localStorage) + JSON import / export.
import { sanitizeStyle } from './state.js';
import { typeById } from './content.js';
import { uid } from './utils.js';

const KEY = 'qrstudio.designs.v2';
const LIMIT = 30;

export const SCHEMA_VERSION = 2;

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false; // quota exceeded / storage blocked
  }
}

export const listDesigns = () => read();
export const countDesigns = () => read().length;

export function normalizeDesign(raw, fallbackName = 'Imported design') {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw.design && typeof raw.design === 'object' ? raw.design : raw;
  const type = typeById(src.type).id;
  const content = src.content && typeof src.content === 'object' ? src.content : {};
  const cleanContent = {};
  for (const [t, vals] of Object.entries(content)) {
    if (vals && typeof vals === 'object') {
      cleanContent[t] = Object.fromEntries(Object.entries(vals).slice(0, 20).map(([k, v]) => [String(k).slice(0, 30), typeof v === 'boolean' ? v : String(v).slice(0, 2000)]));
    }
  }
  return {
    id: uid(),
    name: String(raw.name || src.name || fallbackName).slice(0, 60),
    savedAt: Number(raw.savedAt) || Date.now(),
    type,
    content: cleanContent,
    style: sanitizeStyle(src.style),
  };
}

export function saveDesign({ type, content, style }, name) {
  const list = read();
  const entry = {
    id: uid(),
    name: name || `Design ${list.length + 1}`,
    savedAt: Date.now(),
    type,
    content: JSON.parse(JSON.stringify(content)),
    style: JSON.parse(JSON.stringify(style)),
  };
  const next = [entry, ...list].slice(0, LIMIT);
  if (!write(next)) return { ok: false, reason: 'Browser storage is full or blocked. Export a JSON backup instead.' };
  return { ok: true, entry, trimmed: list.length + 1 > LIMIT };
}

export function removeDesign(id) {
  const list = read();
  const removed = list.find((d) => d.id === id);
  write(list.filter((d) => d.id !== id));
  return removed;
}

export function restoreDesign(entry) {
  const list = read();
  if (list.some((d) => d.id === entry.id)) return;
  write([entry, ...list].slice(0, LIMIT));
}

export function renameDesign(id, name) {
  write(read().map((d) => (d.id === id ? { ...d, name: String(name).trim().slice(0, 60) || d.name } : d)));
}

export function importJson(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  const items = Array.isArray(data) ? data : Array.isArray(data.designs) ? data.designs : [data];
  const designs = items.map((d, i) => normalizeDesign(d, `Imported ${i + 1}`)).filter(Boolean);
  if (!designs.length) throw new Error('No QR designs found in this file.');
  return designs;
}

export function addImported(designs) {
  const list = read();
  write([...designs, ...list].slice(0, LIMIT));
}

export const exportOne = ({ type, content, style }) =>
  JSON.stringify({ app: 'QR Studio Pro', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), design: { type, content, style } }, null, 2);

export const exportAll = () =>
  JSON.stringify({ app: 'QR Studio Pro', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), designs: read() }, null, 2);

export const SAMPLE_JSON = JSON.stringify(
  {
    app: 'QR Studio Pro',
    version: SCHEMA_VERSION,
    design: {
      type: 'url',
      content: { url: { url: 'example.com' } },
      style: {
        dotsType: 'rounded', cornerSquare: 'extra-rounded', cornerDot: 'dot', margin: 4, ec: 'H',
        dotsMode: 'gradient', dotsC1: '#087a72', dotsC2: '#0b4a8f', gradType: 'linear', gradAngle: 45,
        bg: '#ffffff', transparent: false,
        logo: null, logoSize: 0.3,
        frame: 'bottom-banner', frameText: 'SCAN ME', frameColor: '#0f2a2e', frameTextColor: '#ffffff',
      },
    },
  },
  null,
  2
);
