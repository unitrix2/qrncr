import './style.css';
import confetti from 'canvas-confetti';

import { hydrateIcons, icon } from './icons.js';
import { buildDesign, exportBlob, diagnose, EC_CAPACITY, FORMATS } from './qrEngine.js';
import { CONTENT_TYPES, typeById, buildPayload } from './content.js';
import { defaultStyle, sanitizeStyle, defaultExport } from './state.js';
import { LOGOS, logoThumb } from './logos.js';
import { PRESETS } from './presets.js';
import { qrShapeGlyph, dotGlyph, eyeFrameGlyph, eyeDotGlyph, frameGlyph } from './glyphs.js';
import * as history from './history.js';
import { createCameraScanner, scanImageFile } from './scanner.js';
import { parseLines, runBatch, BATCH_LIMIT } from './batch.js';
import { downloadBlob, downloadText, copyImage, copyText } from './downloadHelper.js';
import { initBackground } from './bgAnimation.js';
import { $, $$, getPath, setPath, toast, setupDialog } from './ui.js';
import { blobToDataUrl, byteLength, debounce, escHtml, isHex, loadImage, normHex, slug } from './utils.js';

/* ================================================================== */
/* State                                                               */
/* ================================================================== */

const SAMPLE = 'https://example.com';

const S = {
  type: 'url',
  content: {},
  style: defaultStyle(),
  export: defaultExport(),
  batch: { format: 'png', res: 1024 },
};

let backdrop = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
let backdropBeforeTransparent = backdrop;
let view = { payload: '', sample: true, ok: false }; // what the preview currently shows

const FORMAT_LABEL = { png: 'PNG', svg: 'SVG', pdf: 'PDF', jpeg: 'JPG', webp: 'WebP' };
const FMT = {
  margin: (v) => `${v}%`,
  gradAngle: (v) => `${v}°`,
  logoSize: (v) => `${Math.round(v * 100)}%`,
  logoMargin: (v) => `${v}`,
};
const SHOW = {
  gradient: (s) => s.dotsMode === 'gradient',
  linear: (s) => s.dotsMode === 'gradient' && s.gradType === 'linear',
  customEyes: (s) => s.customEyes,
  transparent: (s) => s.transparent,
  logo: (s) => Boolean(s.logo),
  frame: (s) => s.frame !== 'none',
};
const EC_HINT = {
  L: 'L recovers 7% of damage. Smallest, densest code.',
  M: 'M recovers 15% of damage. A good everyday default.',
  Q: 'Q recovers 25% of damage. Good for printed material.',
  H: 'H recovers 30% of damage. Best with a logo.',
};

const currentPayload = () => buildPayload(S.type, S.content[S.type] || {});

/* ================================================================== */
/* Static UI builders                                                  */
/* ================================================================== */

const TILES = {
  qrShape: {
    glyph: qrShapeGlyph,
    opts: [
      ['square', 'Classic Grid'],
      ['circle', 'Radial Circle'],
    ],
  },
  dotsType: {
    glyph: dotGlyph,
    opts: [
      ['rounded', 'Rounded'],
      ['dots', 'Dots'],
      ['classy', 'Classy'],
      ['classy-rounded', 'Soft classy'],
      ['extra-rounded', 'Squircle'],
      ['square', 'Square'],
    ],
  },
  cornerSquare: {
    glyph: eyeFrameGlyph,
    opts: [
      ['extra-rounded', 'Rounded'],
      ['dot', 'Circle'],
      ['square', 'Square'],
      ['leaf', 'Organic leaf'],
      ['chamfer', 'Chamfer tech'],
      ['rounded-box', 'Soft square'],
      ['diamond', 'Diamond'],
      ['shield', 'Badge shield'],
      ['hexagon', 'Tech hex'],
    ],
  },
  cornerDot: {
    glyph: eyeDotGlyph,
    opts: [
      ['dot', 'Circle'],
      ['square', 'Square'],
      ['rounded', 'Squircle'],
      ['diamond', 'Diamond'],
      ['leaf', 'Leaf dot'],
      ['star', 'Sparkle'],
      ['ring', 'Bullseye'],
      ['cross', 'Tech plus'],
      ['hexagon', 'Hex core'],
    ],
  },
  frame: {
    glyph: frameGlyph,
    opts: [
      ['none', 'None'],
      ['bottom-banner', 'Bottom banner'],
      ['top-banner', 'Top banner'],
      ['bubble', 'Bubble'],
      ['polaroid', 'Polaroid'],
      ['phone', 'Phone'],
      ['badge', 'Pill badge'],
      ['minimal', 'Minimal frame'],
      ['card', 'Studio card'],
    ],
  },
};

const PALETTES = [
  { name: 'Cyber Emerald', c1: '#062b22', c2: '#024b68', mode: 'gradient' },
  { name: 'Cyber Indigo', c1: '#1e1b4b', c2: '#083344', mode: 'gradient' },
  { name: 'Electric Violet', c1: '#3b0764', c2: '#1e1b4b', mode: 'gradient' },
  { name: 'Sunset Glow', c1: '#881337', c2: '#b45309', mode: 'gradient' },
  { name: 'Emerald Wave', c1: '#064e3b', c2: '#0369a1', mode: 'gradient' },
  { name: 'Deep Ocean', c1: '#075985', c2: '#1e3a8a', mode: 'gradient' },
  { name: 'Obsidian Black', c1: '#0a0d14', c2: '#0a0d14', mode: 'single' },
  { name: 'Carbon Ink', c1: '#18181b', c2: '#18181b', mode: 'single' },
];

const FRAME_TEXTS = ['SCAN ME', 'SCAN TO PAY', 'CONNECT', 'VISIT US', 'FOLLOW US', 'MENU'];

function buildTypeGrid() {
  $('#type-grid').innerHTML = CONTENT_TYPES.map(
    (t) => `<button type="button" class="type" data-type="${t.id}" aria-pressed="false"><span class="type-ico">${icon(t.icon, 20)}</span><span class="type-name">${t.label}</span></button>`
  ).join('');
}

function buildTiles() {
  $$('[data-tiles]').forEach((host) => {
    const def = TILES[host.dataset.tiles];
    host.innerHTML = def.opts
      .map(([val, label]) => `<button type="button" class="tile" data-val="${val}" aria-pressed="false">${def.glyph(val)}<span>${label}</span></button>`)
      .join('');
  });
}

function buildColors() {
  $$('[data-color]').forEach((host) => {
    const key = host.dataset.color;
    const label = host.dataset.label;
    host.classList.add('color-field');
    host.innerHTML = `<label class="field-label" for="c-${key}">${label}</label><div class="color-input"><input type="color" id="c-${key}" data-ckey="${key}" aria-label="${label}"><input type="text" class="hex" data-hkey="${key}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="${label} as hex"></div>`;
  });
}

function buildSwatches() {
  $('#swatches').innerHTML = PALETTES.map(
    (p, i) => `<button type="button" class="swatch" data-i="${i}" title="${p.name}" aria-label="${p.name} palette" style="--a:${p.c1};--b:${p.c2}"></button>`
  ).join('');
}

function buildLogoGrid() {
  $('#logo-grid').innerHTML =
    `<button type="button" class="logo-opt" data-logo="" aria-pressed="false" title="No logo"><span class="logo-none">${icon('x', 18)}</span><small>None</small></button>` +
    LOGOS.map(
      (l) => `<button type="button" class="logo-opt" data-logo="${l.id}" aria-pressed="false" title="${l.name}"><img src="${logoThumb(l)}" alt="" width="40" height="40"><small>${l.name}</small></button>`
    ).join('');
}

function buildFrameChips() {
  $('#frame-text-chips').innerHTML = FRAME_TEXTS.map((t) => `<button type="button" class="chip" data-text="${t}">${t}</button>`).join('');
}

/* ---------- Content form ---------- */

function fieldHtml(f, vals) {
  const id = `f-${f.key}`;
  const v = vals[f.key] ?? f.default ?? '';
  const full = f.full ? ' field-full' : '';
  const req = f.required ? '<span class="req" title="Required">*</span>' : '';
  const label = `<label class="field-label" for="${id}">${f.label}${req}</label>`;
  const ph = f.placeholder ? ` placeholder="${escHtml(f.placeholder)}"` : '';
  if (f.type === 'textarea') {
    return `<div class="field${full}">${label}<textarea class="input" id="${id}" data-field="${f.key}" rows="3"${ph}>${escHtml(v)}</textarea></div>`;
  }
  if (f.type === 'select') {
    return `<div class="field${full}">${label}<select class="input" id="${id}" data-field="${f.key}">${f.options
      .map(([val, text]) => `<option value="${escHtml(val)}"${val === v ? ' selected' : ''}>${escHtml(text)}</option>`)
      .join('')}</select></div>`;
  }
  if (f.type === 'checkbox') {
    return `<label class="switch-inline field-full" for="${id}"><span>${f.label}</span><span class="switch"><input type="checkbox" id="${id}" data-field="${f.key}"${v ? ' checked' : ''}><i></i></span></label>`;
  }
  const mode = f.inputmode ? ` inputmode="${f.inputmode}"` : '';
  const step = f.type === 'number' ? ' step="any" min="0"' : '';
  return `<div class="field${full}">${label}<input class="input" type="${f.type}" id="${id}" data-field="${f.key}" value="${escHtml(v)}"${ph}${mode}${step} autocomplete="off"></div>`;
}

function renderForm() {
  const t = typeById(S.type);
  const vals = (S.content[S.type] ||= {});
  $('#content-form').innerHTML =
    `<div class="form-grid">${t.fields.map((f) => fieldHtml(f, vals)).join('')}</div>` +
    `<p class="hint form-hint">${icon('info', 15)}<span>${escHtml(t.hint)}</span></p>`;
}

/* ================================================================== */
/* UI sync (state → DOM)                                               */
/* ================================================================== */

function paintRange(r) {
  const min = Number(r.min), max = Number(r.max);
  r.style.setProperty('--pct', `${((Number(r.value) - min) / (max - min)) * 100}%`);
}

const EXPORT_HINTS = {
  png: () => (S.style.transparent ? 'Transparent background is kept.' : 'Sharp raster image. Best all-round choice.'),
  svg: () => 'Vector file. Scales to any size without blur.',
  pdf: () => (S.style.transparent ? 'A4 page, ready to print. The page is white, so the background is filled white.' : 'A4 page with the code centered, ready to print.'),
  jpeg: () => (S.style.transparent ? 'JPG cannot store transparency. The background is filled white.' : 'Small file size. No transparency.'),
  webp: () => (S.style.transparent ? 'Transparent background is kept.' : 'Modern, compact web format.'),
};

function syncUI({ form = false } = {}) {
  const st = S.style;

  $$('#type-grid .type').forEach((b) => {
    const on = b.dataset.type === S.type;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  if (form) renderForm();

  $$('[data-tiles]').forEach((host) => {
    const key = host.dataset.tiles;
    $$('.tile', host).forEach((b) => {
      const on = st[key] === b.dataset.val;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  });

  $$('[data-chips]').forEach((host) => {
    const cur = String(getPath(S, host.dataset.chips));
    $$('button', host).forEach((b) => {
      const on = b.dataset.val === cur;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  });

  $$('#backdrop-seg button').forEach((b) => {
    const on = b.dataset.val === backdrop;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $('#stage').dataset.backdrop = backdrop;
  $('#stage').dataset.clear = String(st.transparent);

  $$('[data-range]').forEach((r) => {
    const k = r.dataset.range;
    r.value = st[k];
    paintRange(r);
    const out = $(`[data-out="${k}"]`);
    if (out) out.textContent = FMT[k](st[k]);
  });

  $$('[data-switch]').forEach((c) => { c.checked = Boolean(st[c.dataset.switch]); });
  $('#quick-transparent').checked = st.transparent;

  $$('[data-ckey]').forEach((i) => { i.value = st[i.dataset.ckey]; });
  $$('[data-hkey]').forEach((i) => { if (i !== document.activeElement) i.value = st[i.dataset.hkey]; });

  $$('.swatch').forEach((b) => {
    const p = PALETTES[b.dataset.i];
    const on = st.dotsMode === p.mode && st.dotsC1 === p.c1 && (p.mode === 'single' || st.dotsC2 === p.c2);
    b.classList.toggle('is-on', on);
  });

  // logo
  $$('#logo-grid .logo-opt').forEach((b) => {
    const id = b.dataset.logo;
    const on = id === '' ? !st.logo : st.logo?.kind === 'preset' && st.logo.id === id;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  const custom = st.logo?.kind === 'custom';
  $('#logo-active').hidden = !custom;
  if (custom) {
    $('#logo-thumb').src = st.logo.src;
    $('#logo-name').textContent = st.logo.name;
  }

  // frame
  const ft = $('#input-frame-text');
  if (ft !== document.activeElement) ft.value = st.frameText;

  // conditional visibility
  $$('[data-show]').forEach((el) => { el.hidden = !SHOW[el.dataset.show](st); });
  $$('[data-hide]').forEach((el) => { el.hidden = SHOW[el.dataset.hide](st); });

  $('#ec-hint').textContent = EC_HINT[st.ec];
  $('#download-label').textContent = `Download ${FORMAT_LABEL[S.export.format]}`;
  $('#export-hint').textContent = EXPORT_HINTS[S.export.format]();
  const aura = $('#stage-aura');
  if (aura) {
    const c1 = st.dotsC1 || '#6366f1';
    const c2 = (st.dotsMode === 'gradient' ? st.dotsC2 : st.dotsC1) || '#06b6d4';
    aura.style.background = `radial-gradient(circle, ${c1}3d 0%, ${c2}22 45%, transparent 72%)`;
  }

  positionIndicator();
}

/* ---------- Step indicator ---------- */

function positionIndicator() {
  const nav = $('#step-nav');
  const active = $('.step.is-active', nav);
  const ind = $('.step-ind', nav);
  if (!active || !ind) return;
  ind.style.width = `${active.offsetWidth}px`;
  ind.style.transform = `translateX(${active.offsetLeft}px)`;
}

function setTab(id, { focus = false } = {}) {
  $$('.step').forEach((b) => {
    const on = b.dataset.tab === id;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
    if (on) b.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
  $$('.pane').forEach((p) => {
    const on = p.id === id;
    p.hidden = !on;
    p.classList.toggle('is-active', on);
  });
  positionIndicator();
}

/* ================================================================== */
/* Preview rendering                                                   */
/* ================================================================== */

const img = $('#qr-img');
let renderToken = 0;
let imgUrl = null;

function showMessage(text, kind = 'info') {
  const box = $('#stage-msg');
  box.innerHTML = `${icon(kind === 'error' ? 'risk' : 'info', 22)}<p>${escHtml(text)}</p>`;
  box.hidden = false;
  img.hidden = true;
}

function setActions(canExport) {
  $('#btn-download').disabled = !canExport;
  $('#btn-copy').disabled = !canExport;
}

function updateHealth() {
  const d = diagnose(S.style, view.payload || SAMPLE);
  const el = $('#health');
  el.dataset.level = d.level;
  $('#health-title').textContent = ['Scan-safe', 'Test before printing', 'May not scan'][d.level];
  $('#health-ico').innerHTML = icon(['shield', 'warn', 'risk'][d.level], 16);
  $('#diag-contrast').textContent = `${d.contrastLabel} · ${d.grade}`;
  $('#diag-ec').textContent = d.ecLabel;
  $('#diag-note').textContent = d.note;
}

function updateMeta() {
  const t = typeById(S.type);
  $('#preview-meta').textContent = view.payload ? `${t.label} · ${byteLength(view.payload)} characters` : `${t.label} · waiting for your content`;
}

async function renderPreview() {
  const token = ++renderToken;
  const payload = currentPayload();
  const data = payload || SAMPLE;
  view = { payload, sample: !payload, ok: false };
  updateMeta();
  updateHealth();

  if (byteLength(data) > EC_CAPACITY[S.style.ec]) {
    $('#stage').classList.remove('is-sample');
    $('#sample-chip').hidden = true;
    showMessage(`This content is too long for error correction ${S.style.ec}. Shorten it, or choose a lower correction level.`, 'error');
    setActions(false);
    return;
  }

  try {
    const design = await buildDesign(data, S.style);
    if (token !== renderToken) return;
    const url = URL.createObjectURL(new Blob([design.svg()], { type: 'image/svg+xml' }));
    const prev = imgUrl;
    imgUrl = url;
    img.src = url;
    img.hidden = false;
    $('#stage-msg').hidden = true;
    if (prev) setTimeout(() => URL.revokeObjectURL(prev), 1500);
    view.ok = true;
    $('#stage').classList.toggle('is-sample', view.sample);
    $('#sample-chip').hidden = !view.sample;
    setActions(view.ok);
  } catch (err) {
    if (token !== renderToken) return;
    console.error(err);
    showMessage('This design could not be rendered. Try a shorter text or a smaller logo.', 'error');
    setActions(false);
  }
}

const scheduleRender = debounce(renderPreview, 45);

function changed({ form = false } = {}) {
  syncUI({ form });
  scheduleRender();
}

/* ================================================================== */
/* Event wiring                                                        */
/* ================================================================== */

function setTransparent(v) {
  S.style.transparent = v;
  if (v) {
    if (backdrop !== 'checker') { backdropBeforeTransparent = backdrop; backdrop = 'checker'; }
  } else if (backdrop === 'checker' && backdropBeforeTransparent !== 'checker') {
    backdrop = backdropBeforeTransparent;
  }
  changed();
}

function wireEditor() {
  // type grid
  $('#type-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.type');
    if (!b) return;
    S.type = b.dataset.type;
    changed({ form: true });
  });

  // dynamic content form
  $('#content-form').addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset.field) return;
    (S.content[S.type] ||= {})[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
    scheduleRender();
  });

  // tiles
  $$('[data-tiles]').forEach((host) =>
    host.addEventListener('click', (e) => {
      const b = e.target.closest('.tile');
      if (!b) return;
      S.style[host.dataset.tiles] = b.dataset.val;
      changed();
    })
  );

  // chips (segmented controls bound to a state path)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-chips] button');
    if (!b) return;
    const path = b.closest('[data-chips]').dataset.chips;
    setPath(S, path, path.endsWith('.res') ? Number(b.dataset.val) : b.dataset.val);
    if (path.startsWith('batch.')) syncUI();
    else changed();
  });

  // inputs: colours, ranges, switches
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-ckey]')) {
      S.style[t.dataset.ckey] = t.value;
      changed();
    } else if (t.matches('[data-hkey]')) {
      if (isHex(t.value)) { S.style[t.dataset.hkey] = normHex(t.value); changed(); }
    } else if (t.matches('[data-range]')) {
      S.style[t.dataset.range] = Number(t.value);
      changed();
    } else if (t.id === 'input-frame-text') {
      S.style.frameText = t.value;
      changed();
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-hkey]')) { t.value = S.style[t.dataset.hkey]; }
    else if (t.matches('[data-switch]')) {
      if (t.dataset.switch === 'transparent') setTransparent(t.checked);
      else { S.style[t.dataset.switch] = t.checked; changed(); }
    } else if (t.id === 'quick-transparent') setTransparent(t.checked);
  });

  // palettes
  $('#swatches').addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    const p = PALETTES[b.dataset.i];
    Object.assign(S.style, { dotsMode: p.mode, dotsC1: p.c1, dotsC2: p.c2 });
    changed();
  });

  // frame label chips
  $('#frame-text-chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    S.style.frameText = b.dataset.text;
    changed();
  });

  // backdrop
  $('#backdrop-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    backdrop = b.dataset.val;
    syncUI();
  });

  // tabs
  const nav = $('#step-nav');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('.step');
    if (b) setTab(b.dataset.tab);
  });
  nav.addEventListener('keydown', (e) => {
    const steps = $$('.step', nav);
    const i = steps.findIndex((s) => s.classList.contains('is-active'));
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % steps.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + steps.length) % steps.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = steps.length - 1;
    if (n >= 0) { e.preventDefault(); setTab(steps[n].dataset.tab, { focus: true }); }
  });
  addEventListener('resize', debounce(positionIndicator, 80));
  document.fonts?.ready.then(positionIndicator);

  wireLogo();
}

/* ---------- Logo ---------- */

function wireDropzone(zone, input, onFile) {
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
  zone.addEventListener('drop', (e) => { const f = e.dataTransfer?.files?.[0]; if (f) onFile(f); });
  input.addEventListener('change', () => { const f = input.files?.[0]; if (f) onFile(f); input.value = ''; });
}

async function fileToLogo(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('That image is larger than 10 MB.');
  const raw = await blobToDataUrl(file);
  try {
    const im = await loadImage(raw);
    const max = 360;
    const nw = im.naturalWidth || max, nh = im.naturalHeight || max;
    const k = Math.min(1, max / Math.max(nw, nh));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(nw * k));
    c.height = Math.max(1, Math.round(nh * k));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return { kind: 'custom', src: c.toDataURL('image/png'), name: file.name };
  } catch {
    return { kind: 'custom', src: raw, name: file.name };
  }
}

function applyLogo(logo) {
  S.style.logo = logo;
  if (logo && S.style.ec !== 'H') {
    S.style.ec = 'H';
    toast('Error correction set to H so the logo stays scannable.', { kind: 'info' });
  }
  changed();
}

function wireLogo() {
  $('#logo-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.logo-opt');
    if (!b) return;
    applyLogo(b.dataset.logo ? { kind: 'preset', id: b.dataset.logo } : null);
  });
  wireDropzone($('#logo-dropzone'), $('#input-logo-file'), async (file) => {
    try { applyLogo(await fileToLogo(file)); }
    catch (err) { toast(err.message, { kind: 'error' }); }
  });
  $('#btn-remove-logo').addEventListener('click', () => applyLogo(null));
}

/* ================================================================== */
/* Export actions                                                      */
/* ================================================================== */

const busy = (btn, on) => { btn.disabled = on; btn.classList.toggle('is-busy', on); };

async function currentExport(format, res, payloadOverride) {
  const p = payloadOverride || view.payload || currentPayload() || SAMPLE;
  const design = await buildDesign(p, S.style);
  return exportBlob(design, format, res, p);
}

async function doDownload() {
  if (!view.ok) return;
  const btn = $('#btn-download');
  busy(btn, true);
  try {
    const { format, res } = S.export;
    const payload = view.payload || currentPayload() || SAMPLE;
    const blob = await currentExport(format, res, payload);
    const ext = FORMATS[format]?.ext || format || 'png';
    const base = slug(payload, 32) || 'code';
    const filename = `qr-${base}.${ext}`;
    downloadBlob(blob, filename);
    toast(`${FORMAT_LABEL[format] || format.toUpperCase()} downloaded.`);
    confetti({ particleCount: 56, spread: 70, startVelocity: 30, ticks: 130, scalar: 0.9, origin: { x: 0.5, y: 0.85 }, colors: ['#18c4b4', '#087a72', '#ffc45c', '#ffffff'], disableForReducedMotion: true });
  } catch (err) {
    console.error(err);
    toast('Export failed. Try a smaller size or another format.', { kind: 'error' });
  } finally {
    busy(btn, false);
    setActions(view.ok);
  }
}

async function doCopy() {
  if (!view.ok) return;
  const btn = $('#btn-copy');
  busy(btn, true);
  try {
    const payload = view.payload || currentPayload() || SAMPLE;
    await copyImage(await currentExport('png', 1024, payload));
    toast('Image copied to the clipboard.');
  } catch (err) {
    toast(err.message || 'Copying images is not supported here. Download instead.', { kind: 'error' });
  } finally {
    busy(btn, false);
    setActions(view.ok);
  }
}

const snapshot = () => ({ type: S.type, content: S.content, style: S.style });

function refreshSavedCount() {
  const n = history.countDesigns();
  const el = $('#saved-count');
  el.textContent = n;
  el.hidden = n === 0;
}

function doSave() {
  const res = history.saveDesign(snapshot());
  if (!res.ok) return toast(res.reason, { kind: 'error' });
  refreshSavedCount();
  toast(`Saved as “${res.entry.name}”.`, { action: 'View', onAction: () => modals.saved.open() });
}

function loadDesign(d) {
  S.type = d.type;
  S.content = JSON.parse(JSON.stringify(d.content || {}));
  S.style = sanitizeStyle(d.style);
  backdrop = S.style.transparent ? 'checker' : 'light';
  changed({ form: true });
}

/* ================================================================== */
/* Dialogs                                                             */
/* ================================================================== */

const modals = {};

/* ---------- Presets ---------- */
const presetThumbs = new Map();
let presetActiveCategory = 'all';
let presetSearchQuery = '';

const presetLook = (p) => sanitizeStyle({ ...defaultStyle(), ...p.style });

function renderPresets() {
  const grid = $('#preset-grid');
  if (!grid) return;
  const q = presetSearchQuery.toLowerCase().trim();
  const filtered = PRESETS.filter((p) => {
    const matchCat = presetActiveCategory === 'all' || p.category === presetActiveCategory;
    const matchQ = !q || p.name.toLowerCase().includes(q) || (p.tag && p.tag.toLowerCase().includes(q)) || (p.desc && p.desc.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="preset-empty">
        <div class="preset-empty-ico"><i data-i="search" data-size="28"></i></div>
        <h4>No matching templates</h4>
        <p>No looks found matching "${escHtml(q)}". Try another keyword or category.</p>
      </div>
    `;
    hydrateIcons(grid);
    return;
  }

  grid.innerHTML = filtered.map((p) => {
    const pips = (p.dots || ['#000', '#000']).map((c) => `<span class="preset-pip" style="background:${c}"></span>`).join('');
    return `
      <article class="preset-card" data-id="${p.id}" tabindex="0" role="button" aria-label="Apply preset ${escHtml(p.name)}">
        <div class="preset-card-head">
          <span class="preset-tag">${escHtml(p.tag || 'Style')}</span>
          <div class="preset-pips" title="Colors: ${p.dots?.join(', ')}">${pips}</div>
        </div>
        <div class="preset-stage${p.style.transparent ? ' is-checker' : ''}">
          <img class="preset-img" alt="${escHtml(p.name)}" hidden>
          <div class="preset-hover-action">
            <span class="preset-apply-chip"><i data-i="sparkles" data-size="13"></i>Apply Look</span>
          </div>
        </div>
        <div class="preset-card-footer">
          <div class="preset-info">
            <h4 class="preset-name">${escHtml(p.name)}</h4>
            <p class="preset-desc">${escHtml(p.desc || '')}</p>
          </div>
        </div>
      </article>
    `;
  }).join('');

  hydrateIcons(grid);

  for (const p of filtered) {
    const imgEl = grid.querySelector(`[data-id="${p.id}"] .preset-img`);
    if (!imgEl) continue;
    if (presetThumbs.has(p.id)) {
      imgEl.src = presetThumbs.get(p.id);
      imgEl.hidden = false;
    } else {
      buildDesign(SAMPLE, presetLook(p)).then((d) => {
        const url = URL.createObjectURL(new Blob([d.svg(260)], { type: 'image/svg+xml' }));
        presetThumbs.set(p.id, url);
        if (imgEl.isConnected) {
          imgEl.src = url;
          imgEl.hidden = false;
        }
      }).catch(() => {});
    }
  }
}

async function openPresets() {
  presetActiveCategory = 'all';
  presetSearchQuery = '';
  $$('#preset-filter-pills .filter-pill').forEach((b) => b.classList.toggle('is-active', b.dataset.cat === 'all'));
  const searchInput = $('#preset-search-input');
  if (searchInput) searchInput.value = '';
  renderPresets();
}

const KEEP_ON_PRESET = ['ec', 'margin', 'logo', 'logoSize', 'logoMargin', 'hideLogoDots', 'frame', 'frameText', 'frameColor', 'frameTextColor'];

function applyPreset(p) {
  const kept = {};
  KEEP_ON_PRESET.forEach((k) => { if (!(k in p.style)) kept[k] = S.style[k]; });
  S.style = sanitizeStyle({ ...defaultStyle(), ...kept, ...p.style });
  backdrop = S.style.transparent ? 'checker' : backdrop === 'checker' ? 'light' : backdrop;
  changed();
  modals.presets.close();
  toast(`${p.name} preset applied!`);
  confetti({ particleCount: 40, spread: 65, startVelocity: 25, ticks: 100, origin: { x: 0.5, y: 0.7 }, colors: ['#00f5a0', '#00d8f6', '#ffffff'] });
}

function wirePresets() {
  const grid = $('#preset-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.preset-card');
      if (!card) return;
      const p = PRESETS.find((x) => x.id === card.dataset.id);
      if (p) applyPreset(p);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.preset-card');
        if (!card) return;
        e.preventDefault();
        const p = PRESETS.find((x) => x.id === card.dataset.id);
        if (p) applyPreset(p);
      }
    });
  }

  const pills = $('#preset-filter-pills');
  if (pills) {
    pills.addEventListener('click', (e) => {
      const b = e.target.closest('.filter-pill');
      if (!b) return;
      $$('.filter-pill', pills).forEach((btn) => btn.classList.toggle('is-active', btn === b));
      presetActiveCategory = b.dataset.cat || 'all';
      renderPresets();
    });
  }

  const searchInput = $('#preset-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      presetSearchQuery = e.target.value;
      renderPresets();
    });
  }
}

/* ---------- Saved designs ---------- */

async function renderSaved() {
  const list = history.listDesigns();
  const host = $('#saved-list');
  if (!list.length) {
    host.innerHTML = `<div class="empty">${icon('folder', 28)}<b>No saved designs yet</b><span>Press Save in the preview to keep the current design here.</span></div>`;
    return;
  }
  host.innerHTML = list
    .map((d) => {
      const date = new Date(d.savedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      return `<article class="saved" data-id="${d.id}">
        <button type="button" class="saved-thumb${d.style.transparent ? ' is-checker' : ''}" data-act="load" aria-label="Open ${escHtml(d.name)}"><img alt="" hidden></button>
        <div class="saved-info"><button type="button" class="saved-name" data-act="load">${escHtml(d.name)}</button><small>${escHtml(typeById(d.type).label)} · ${date}</small></div>
        <div class="saved-actions">
          <button type="button" class="icon-btn icon-btn-sm" data-act="rename" aria-label="Rename" title="Rename">${icon('pencil', 15)}</button>
          <button type="button" class="icon-btn icon-btn-sm" data-act="delete" aria-label="Delete" title="Delete">${icon('trash', 15)}</button>
        </div></article>`;
    })
    .join('');
  for (const d of list) {
    const imgEl = host.querySelector(`[data-id="${d.id}"] img`);
    try {
      const payload = buildPayload(d.type, d.content[d.type] || {}) || SAMPLE;
      const design = await buildDesign(payload, d.style);
      if (imgEl?.isConnected) { imgEl.src = URL.createObjectURL(new Blob([design.svg(240)], { type: 'image/svg+xml' })); imgEl.hidden = false; }
    } catch { /* ignore */ }
  }
}

function wireSaved() {
  $('#saved-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const card = b.closest('.saved');
    const id = card.dataset.id;
    const d = history.listDesigns().find((x) => x.id === id);
    if (!d) return;
    if (b.dataset.act === 'load') {
      loadDesign(d);
      modals.saved.close();
      toast(`Opened “${d.name}”.`);
    } else if (b.dataset.act === 'delete') {
      history.removeDesign(id);
      refreshSavedCount();
      renderSaved();
      toast(`Deleted “${d.name}”.`, { action: 'Undo', onAction: () => { history.restoreDesign(d); refreshSavedCount(); renderSaved(); } });
    } else if (b.dataset.act === 'rename') {
      const nameBtn = $('.saved-name', card);
      const input = document.createElement('input');
      input.className = 'input rename-input';
      input.value = d.name;
      input.maxLength = 60;
      nameBtn.replaceWith(input);
      input.focus();
      input.select();
      let done = false;
      const commit = (save) => {
        if (done) return;
        done = true;
        if (save) history.renameDesign(id, input.value);
        renderSaved();
      };
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commit(true); if (ev.key === 'Escape') commit(false); });
      input.addEventListener('blur', () => commit(true));
    }
  });

  $('#btn-export-current').addEventListener('click', () => { downloadText(history.exportOne(snapshot()), 'qr-studio-design.json'); toast('Current design exported.'); });
  $('#btn-export-all').addEventListener('click', () => {
    if (!history.countDesigns()) return toast('Nothing to back up yet. Save a design first.', { kind: 'warn' });
    downloadText(history.exportAll(), 'qr-studio-backup.json');
    toast('Backup downloaded.');
  });
  $('#btn-import').addEventListener('click', () => $('#input-import').click());
  $('#input-import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const designs = history.importJson(await file.text());
      history.addImported(designs);
      refreshSavedCount();
      renderSaved();
      toast(`${designs.length} design${designs.length > 1 ? 's' : ''} imported.`);
    } catch (err) {
      toast(err.message, { kind: 'error' });
    }
  });
  $('#json-sample').textContent = history.SAMPLE_JSON;
  $('#btn-copy-sample').addEventListener('click', async () => { await copyText(history.SAMPLE_JSON); toast('Template copied.'); });
}

/* ---------- Scanner ---------- */
let scanned = '';

function showScanResult(text) {
  scanned = text;
  $('#scan-error').hidden = true;
  $('#scan-payload').textContent = text;
  const link = $('#btn-open-scanned');
  const isUrl = /^https?:\/\//i.test(text);
  link.hidden = !isUrl;
  if (isUrl) link.href = text;
  $('#scan-result').hidden = false;
  setCameraUi(false);
}

function showScanError(msg) {
  $('#scan-result').hidden = true;
  const el = $('#scan-error');
  el.textContent = msg;
  el.hidden = false;
  setCameraUi(false);
}

function setCameraUi(on) {
  $('#btn-start-camera').hidden = on;
  $('#btn-stop-camera').hidden = !on;
  $('#camera-idle').hidden = on;
  $('.camera').classList.toggle('is-live', on);
}

const camera = createCameraScanner({
  video: $('#scanner-video'),
  canvas: $('#scanner-canvas'),
  onResult: showScanResult,
  onError: showScanError,
});

function setScanMode(mode) {
  $$('#scan-mode button').forEach((b) => {
    const on = b.dataset.val === mode;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $('#scan-camera').hidden = mode !== 'camera';
  $('#scan-upload').hidden = mode !== 'upload';
  if (mode !== 'camera') { camera.stop(); setCameraUi(false); }
}

async function scanFile(file) {
  $('#scan-error').hidden = true;
  $('#scan-result').hidden = true;
  try {
    const text = await scanImageFile(file);
    if (text) showScanResult(text);
    else showScanError('No QR code was found in this image. Try a sharper, closer picture.');
  } catch (err) {
    showScanError(err.message);
  }
}

function wireScanner() {
  $('#scan-mode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setScanMode(b.dataset.val); });
  $('#btn-start-camera').addEventListener('click', async () => {
    $('#scan-error').hidden = true;
    $('#scan-result').hidden = true;
    await camera.start();
    setCameraUi(camera.active);
  });
  $('#btn-stop-camera').addEventListener('click', () => { camera.stop(); setCameraUi(false); });
  wireDropzone($('#scan-dropzone'), $('#input-scan-file'), scanFile);

  $('#btn-test-current').addEventListener('click', async () => {
    const btn = $('#btn-test-current');
    if (!view.payload) return toast('Add your content first, then test the code.', { kind: 'warn' });
    busy(btn, true);
    try {
      const blob = await currentExport('jpeg', 900);
      const text = await scanImageFile(blob);
      if (text === view.payload) { toast('This design reads correctly.'); showScanResult(text); }
      else if (text) { toast('The code reads, but the content differs. Check the settings.', { kind: 'warn' }); showScanResult(text); }
      else showScanError('This design could not be read. Increase contrast, shrink the logo, or raise error correction.');
    } catch (err) {
      showScanError('The test could not run for this design.');
    } finally {
      busy(btn, false);
    }
  });

  $('#btn-copy-scanned').addEventListener('click', async () => { await copyText(scanned); toast('Copied.'); });
  $('#btn-load-scanned').addEventListener('click', () => {
    const isUrl = /^https?:\/\//i.test(scanned);
    S.type = isUrl ? 'url' : 'text';
    (S.content[S.type] ||= {})[isUrl ? 'url' : 'text'] = scanned;
    changed({ form: true });
    setTab('tab-content');
    modals.scanner.close();
    toast('Loaded into the editor.');
  });
}

/* ---------- Batch ---------- */
function updateBatchCount() {
  const n = parseLines($('#batch-text').value).length;
  $('#batch-count').textContent = n === 0 ? '0 lines' : n > BATCH_LIMIT ? `${n} lines. The limit is ${BATCH_LIMIT} per batch.` : `${n} line${n > 1 ? 's' : ''}`;
}

function wireBatch() {
  $('#batch-text').addEventListener('input', updateBatchCount);
  $('#btn-run-batch').addEventListener('click', async () => {
    const lines = parseLines($('#batch-text').value);
    if (!lines.length) return toast('Add at least one line first.', { kind: 'warn' });
    if (lines.length > BATCH_LIMIT) return toast(`Please keep a batch under ${BATCH_LIMIT} lines.`, { kind: 'warn' });
    const btn = $('#btn-run-batch');
    const box = $('#batch-progress');
    busy(btn, true);
    box.hidden = false;
    try {
      const zip = await runBatch(lines, S.style, {
        format: S.batch.format,
        res: S.batch.res,
        onProgress: (done, total) => {
          $('#batch-bar').style.width = `${(done / total) * 100}%`;
          $('#batch-status').textContent = `${done} / ${total}`;
        },
      });
      downloadBlob(zip, `qr-batch-${lines.length}.zip`);
      toast(`${lines.length} codes packed into a ZIP.`);
      confetti({ particleCount: 56, spread: 70, startVelocity: 30, ticks: 130, scalar: 0.9, origin: { x: 0.5, y: 0.8 }, colors: ['#18c4b4', '#087a72', '#ffc45c', '#ffffff'], disableForReducedMotion: true });
    } catch (err) {
      console.error(err);
      toast('Batch failed. A line may be too long for the current error correction.', { kind: 'error' });
    } finally {
      busy(btn, false);
      setTimeout(() => { box.hidden = true; }, 1200);
    }
  });
}

/* ================================================================== */
/* Header controls                                                     */
/* ================================================================== */

function wireHeader(bg) {
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('qrs.theme', next); } catch { /* storage blocked */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#07090e' : '#f4f6fa');
    backdrop = next;
    backdropBeforeTransparent = next;
    changed();
  });

  const motionBtn = $('#motion-toggle');
  const setMotion = (on) => {
    motionBtn.setAttribute('aria-pressed', String(on));
    motionBtn.classList.toggle('is-off', !on);
    if (on) delete document.documentElement.dataset.motion;
    else document.documentElement.dataset.motion = 'off';
    try { localStorage.setItem('qrs.motion', on ? 'on' : 'off'); } catch { /* ignore */ }
    bg.setEnabled(on);
  };
  motionBtn.addEventListener('click', () => setMotion(motionBtn.getAttribute('aria-pressed') !== 'true'));
  setMotion(document.documentElement.dataset.motion !== 'off');

  // Multicolor Accent Switcher
  const accentBtn = $('#accent-toggle');
  const accentMenu = $('#accent-menu');
  let currentAccent = 'emerald';
  try {
    currentAccent = localStorage.getItem('qrs.accent') || 'emerald';
  } catch { /* storage blocked */ }

  const setAccent = (accentKey, showToast = false) => {
    currentAccent = accentKey;
    document.documentElement.dataset.accent = accentKey;
    try { localStorage.setItem('qrs.accent', accentKey); } catch { /* ignore */ }

    $$('.accent-opt', accentMenu).forEach((b) => {
      b.classList.toggle('is-active', b.dataset.accent === accentKey);
    });

    const dot = $('.accent-current-dot', accentBtn);
    if (dot) {
      if (accentKey === 'aurora') {
        dot.style.background = 'linear-gradient(135deg, #00f5a0, #00d8f6, #a855f7, #ec4899, #f97316)';
      } else {
        dot.style.background = '';
      }
    }

    if (showToast) {
      const names = { emerald: 'Emerald', violet: 'Electric Violet', sunset: 'Sunset Flame', sapphire: 'Ocean Sapphire', rose: 'Rose Gold', aurora: 'Chroma Multicolor' };
      toast(`${names[accentKey] || accentKey} accent theme active!`);
    }
  };

  if (accentBtn && accentMenu) {
    accentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !accentMenu.hidden;
      accentMenu.hidden = open;
      accentBtn.setAttribute('aria-expanded', String(!open));
    });

    accentMenu.addEventListener('click', (e) => {
      const b = e.target.closest('.accent-opt');
      if (!b) return;
      const acc = b.dataset.accent;
      if (acc) {
        setAccent(acc, true);
        accentMenu.hidden = true;
        accentBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', (e) => {
      if (!accentMenu.hidden && !e.target.closest('.accent-picker-wrapper')) {
        accentMenu.hidden = true;
        accentBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  setAccent(currentAccent);

  $('#btn-open-presets').addEventListener('click', () => modals.presets.open());
  $('#btn-open-scanner').addEventListener('click', () => modals.scanner.open());
  $('#btn-open-batch').addEventListener('click', () => modals.batch.open());
  $('#btn-open-saved').addEventListener('click', () => modals.saved.open());
}

/* ================================================================== */
/* Boot                                                                */
/* ================================================================== */

function boot() {
  hydrateIcons();
  buildTypeGrid();
  buildTiles();
  buildColors();
  buildSwatches();
  buildLogoGrid();
  buildFrameChips();

  modals.presets = setupDialog($('#modal-presets'), { onOpen: openPresets });
  modals.scanner = setupDialog($('#modal-scanner'), {
    onOpen: () => { $('#scan-error').hidden = true; $('#scan-result').hidden = true; setScanMode('camera'); },
    onClose: () => { camera.stop(); setCameraUi(false); },
  });
  modals.batch = setupDialog($('#modal-batch'), { onOpen: () => { updateBatchCount(); syncUI(); } });
  modals.saved = setupDialog($('#modal-saved'), { onOpen: renderSaved });

  wireEditor();
  wirePresets();
  wireSaved();
  wireScanner();
  wireBatch();

  $('#btn-download').addEventListener('click', doDownload);
  $('#btn-copy').addEventListener('click', doCopy);
  $('#btn-save').addEventListener('click', doSave);
  $('#btn-json').addEventListener('click', () => { downloadText(history.exportOne(snapshot()), 'qr-studio-design.json'); toast('Design exported as JSON.'); });

  const bg = initBackground($('#bg-canvas'));
  wireHeader(bg);

  // 3D perspective kinetic tilt on QR preview stage
  const viewport = $('.canvas-viewport');
  const stageEl = $('#stage');
  if (viewport && stageEl) {
    viewport.addEventListener('mousemove', (e) => {
      const rect = viewport.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      stageEl.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-2px)`;
    });
    viewport.addEventListener('mouseleave', () => {
      stageEl.style.transform = '';
    });
  }

  refreshSavedCount();
  setTab('tab-content');
  syncUI({ form: true });
  renderPreview();
}

boot();
