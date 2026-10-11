// QR generation, frame composition and export.
// Every output (preview, PNG, JPEG, WebP, PDF, SVG, batch) comes from ONE
// composed SVG, so what you see in the preview is exactly what you download.
import QRCodeStyling from 'qr-code-styling';
import { logoSrc } from './logos.js';
import { blobToDataUrl, byteLength, contrastRatio, escHtml, loadImage, luminance } from './utils.js';

// Guard qr-code-styling's circular shape generator against out-of-bounds module queries
const origSetupSvg = QRCodeStyling.prototype._setupSvg;
if (origSetupSvg) {
  QRCodeStyling.prototype._setupSvg = function () {
    if (this._qr && !this._qr.__safePatched) {
      const rawIsDark = this._qr.isDark.bind(this._qr);
      const modCount = this._qr.getModuleCount();
      this._qr.isDark = (row, col) => {
        if (row < 0 || row >= modCount || col < 0 || col >= modCount) return false;
        try {
          return rawIsDark(row, col);
        } catch {
          return false;
        }
      };
      this._qr.__safePatched = true;
    }
    return origSetupSvg.call(this);
  };
}

export const BASE = 1000; // internal QR size in SVG user units
const K = BASE / 300;

/** Max payload bytes per error-correction level (QR version 40, byte mode). */
export const EC_CAPACITY = { L: 2953, M: 2331, Q: 1663, H: 1273 };

export const FRAME_IDS = ['none', 'bottom-banner', 'top-banner', 'bubble', 'polaroid', 'phone', 'badge', 'minimal', 'card'];

/* ------------------------------------------------------------------ */
/* QR options                                                          */
/* ------------------------------------------------------------------ */

const fillOptions = (mode, c1, c2, type, angle) =>
  mode === 'gradient'
    ? {
        gradient: {
          type,
          rotation: (angle * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: c1 },
            { offset: 1, color: c2 },
          ],
        },
      }
    : { color: c1 };

/**
 * qr-code-styling truncates every character to 8 bits, which corrupts anything
 * outside Latin-1 (Hindi, emoji, curly quotes). Feeding it the UTF-8 bytes as a
 * "binary string" makes the code decode correctly everywhere. ASCII is unchanged.
 */
const toUtf8Binary = (str) => String.fromCharCode(...new TextEncoder().encode(str));

export function qrOptions(style, data) {
  const logo = logoSrc(style.logo);
  const csCustom = ['leaf', 'chamfer', 'rounded-box', 'diamond', 'shield', 'hexagon'];
  const cdCustom = ['rounded', 'diamond', 'leaf', 'star', 'ring', 'cross', 'hexagon'];
  const csType = csCustom.includes(style.cornerSquare) ? 'square' : style.cornerSquare;
  const cdType = cdCustom.includes(style.cornerDot) ? 'square' : style.cornerDot;
  const eyeFrameColor = style.customEyes ? style.eyeFrameC : (style.dotsC1 || '#000000');
  const eyeDotColor = style.customEyes ? style.eyeDotC : (style.dotsC1 || '#000000');

  const options = {
    type: 'svg',
    shape: style.qrShape || 'square',
    width: BASE,
    height: BASE,
    data: toUtf8Binary(data),
    margin: Math.round((style.margin / 100) * BASE),
    qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: style.ec },
    dotsOptions: {
      type: style.dotsType,
      roundSize: false,
      ...fillOptions(style.dotsMode, style.dotsC1, style.dotsC2, style.gradType, style.gradAngle),
    },
    backgroundOptions: { color: style.transparent ? 'rgba(0,0,0,0)' : style.bg },
    cornersSquareOptions: { type: csType, color: eyeFrameColor },
    cornersDotOptions: { type: cdType, color: eyeDotColor },
  };
  if (logo) {
    options.image = logo;
    options.imageOptions = {
      hideBackgroundDots: style.hideLogoDots,
      imageSize: style.logoSize,
      margin: Math.round(style.logoMargin * K),
      crossOrigin: 'anonymous',
      saveAsBlob: true,
    };
  }
  return options;
}

function getCornerSquarePath(type, x, y, size) {
  const u = size / 7;
  const cx = x + size / 2, cy = y + size / 2;
  if (type === 'leaf') {
    const ro = 3.5 * u, ri = 2.5 * u;
    const outer = `M${x + ro} ${y}H${x + size}V${y + size - ro}A${ro} ${ro} 0 0 1 ${x + size - ro} ${y + size}H${x}V${y + ro}A${ro} ${ro} 0 0 1 ${x + ro} ${y}Z`;
    const inner = `M${x + u + ri} ${y + u}H${x + 6 * u}V${y + 6 * u - ri}A${ri} ${ri} 0 0 1 ${x + 6 * u - ri} ${y + 6 * u}H${x + u}V${y + u + ri}A${ri} ${ri} 0 0 1 ${x + u + ri} ${y + u}Z`;
    return `${outer} ${inner}`;
  }
  if (type === 'chamfer') {
    const c = 1.75 * u, ci = 1.25 * u;
    const outer = `M${x + c} ${y}L${x + size - c} ${y}L${x + size} ${y + c}L${x + size} ${y + size - c}L${x + size - c} ${y + size}L${x + c} ${y + size}L${x} ${y + size - c}L${x} ${y + c}Z`;
    const inner = `M${x + u + ci} ${y + u}L${x + 6 * u - ci} ${y + u}L${x + 6 * u} ${y + u + ci}L${x + 6 * u} ${y + 6 * u - ci}L${x + 6 * u - ci} ${y + 6 * u}L${x + u + ci} ${y + 6 * u}L${x + u} ${y + 6 * u - ci}L${x + u} ${y + u + ci}Z`;
    return `${outer} ${inner}`;
  }
  if (type === 'rounded-box') {
    const ro = 1.6 * u, ri = 0.8 * u;
    const outer = `M${x + ro} ${y}H${x + size - ro}A${ro} ${ro} 0 0 1 ${x + size} ${y + ro}V${y + size - ro}A${ro} ${ro} 0 0 1 ${x + size - ro} ${y + size}H${x + ro}A${ro} ${ro} 0 0 1 ${x} ${y + size - ro}V${y + ro}A${ro} ${ro} 0 0 1 ${x + ro} ${y}Z`;
    const inner = `M${x + u + ri} ${y + u}H${x + 6 * u - ri}A${ri} ${ri} 0 0 1 ${x + 6 * u} ${y + u + ri}V${y + 6 * u - ri}A${ri} ${ri} 0 0 1 ${x + 6 * u - ri} ${y + 6 * u}H${x + u + ri}A${ri} ${ri} 0 0 1 ${x + u} ${y + 6 * u - ri}V${y + u + ri}A${ri} ${ri} 0 0 1 ${x + u + ri} ${y + u}Z`;
    return `${outer} ${inner}`;
  }
  if (type === 'diamond') {
    const outer = `M${cx} ${y}L${x + size} ${cy}L${cx} ${y + size}L${x} ${cy}Z`;
    const inner = `M${cx} ${y + 1.4 * u}L${x + size - 1.4 * u} ${cy}L${cx} ${y + size - 1.4 * u}L${x + 1.4 * u} ${cy}Z`;
    return `${outer} ${inner}`;
  }
  if (type === 'shield') {
    const outer = `M${x + 1.8 * u} ${y}H${x + size - 1.8 * u}A${1.8 * u} ${1.8 * u} 0 0 1 ${x + size} ${y + 1.8 * u}V${y + 4.5 * u}Q${x + size} ${y + size} ${cx} ${y + size}Q${x} ${y + size} ${x} ${y + 4.5 * u}V${y + 1.8 * u}A${1.8 * u} ${1.8 * u} 0 0 1 ${x + 1.8 * u} ${y}Z`;
    const inner = `M${x + u + 1.2 * u} ${y + u}H${x + 6 * u - 1.2 * u}A${1.2 * u} ${1.2 * u} 0 0 1 ${x + 6 * u} ${y + u + 1.2 * u}V${y + 4.2 * u}Q${x + 6 * u} ${y + 6 * u} ${cx} ${y + 6 * u}Q${x + u} ${y + 6 * u} ${x + u} ${y + 4.2 * u}V${y + u + 1.2 * u}A${1.2 * u} ${1.2 * u} 0 0 1 ${x + u + 1.2 * u} ${y + u}Z`;
    return `${outer} ${inner}`;
  }
  if (type === 'hexagon') {
    const outer = `M${x + 2 * u} ${y}L${x + size - 2 * u} ${y}L${x + size} ${cy}L${x + size - 2 * u} ${y + size}L${x + 2 * u} ${y + size}L${x} ${cy}Z`;
    const inner = `M${x + u + 1.4 * u} ${y + u}L${x + 6 * u - 1.4 * u} ${y + u}L${x + 6 * u} ${cy}L${x + 6 * u - 1.4 * u} ${y + 6 * u}L${x + u + 1.4 * u} ${y + 6 * u}L${x + u} ${cy}Z`;
    return `${outer} ${inner}`;
  }
  return null;
}

function getCornerDotPath(type, x, y, size) {
  const cx = x + size / 2, cy = y + size / 2;
  if (type === 'rounded') {
    const rx = size * 0.3;
    return `M${x + rx} ${y}H${x + size - rx}A${rx} ${rx} 0 0 1 ${x + size} ${y + rx}V${y + size - rx}A${rx} ${rx} 0 0 1 ${x + size - rx} ${y + size}H${x + rx}A${rx} ${rx} 0 0 1 ${x} ${y + size - rx}V${y + rx}A${rx} ${rx} 0 0 1 ${x + rx} ${y}Z`;
  }
  if (type === 'diamond') {
    return `M${cx} ${y}L${x + size} ${cy}L${cx} ${y + size}L${x} ${cy}Z`;
  }
  if (type === 'leaf') {
    const rx = size * 0.5;
    return `M${x + rx} ${y}H${x + size}V${y + size - rx}A${rx} ${rx} 0 0 1 ${x + size - rx} ${y + size}H${x}V${y + rx}A${rx} ${rx} 0 0 1 ${x + rx} ${y}Z`;
  }
  if (type === 'star') {
    return `M${cx} ${y}Q${cx} ${cy} ${x + size} ${cy}Q${cx} ${cy} ${cx} ${y + size}Q${cx} ${cy} ${x} ${cy}Q${cx} ${cy} ${cx} ${y}Z`;
  }
  if (type === 'ring') {
    return `M${cx} ${y}A${size / 2} ${size / 2} 0 1 1 ${cx - 0.01} ${y}Z M${cx} ${y + size * 0.28}A${size * 0.22} ${size * 0.22} 0 1 0 ${cx - 0.01} ${y + size * 0.28}Z`;
  }
  if (type === 'cross') {
    const w3 = size / 3;
    return `M${x + w3} ${y}H${x + 2 * w3}V${y + w3}H${x + size}V${y + 2 * w3}H${x + 2 * w3}V${y + size}H${x + w3}V${y + 2 * w3}H${x}V${y + w3}H${x + w3}Z`;
  }
  if (type === 'hexagon') {
    const w4 = size / 4;
    return `M${x + w4} ${y}L${x + size - w4} ${y}L${x + size} ${cy}L${x + size - w4} ${y + size}L${x + w4} ${y + size}L${x} ${cy}Z`;
  }
  return null;
}

function cleanQrSvg(svgText, style) {
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.querySelector('parsererror')) return svgText;

    if (style && style.dotsType === 'square') {
      root.setAttribute('shape-rendering', 'crispEdges');
    } else {
      root.setAttribute('shape-rendering', 'geometricPrecision');
    }

    // Expand module rects by a tiny subpixel bleed so adjacent cells overlap with zero white gridline gaps.
    const clipPaths = root.querySelectorAll('clipPath');
    clipPaths.forEach((cp) => {
      const rects = cp.querySelectorAll('rect');
      rects.forEach((rect) => {
        const w = parseFloat(rect.getAttribute('width'));
        const h = parseFloat(rect.getAttribute('height'));
        if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
          rect.setAttribute('width', (w + 0.4).toFixed(3));
          rect.setAttribute('height', (h + 0.4).toFixed(3));
        }
      });
    });

    // Custom Corner Eye Frames
    const customCornerSquares = ['leaf', 'chamfer', 'rounded-box', 'diamond', 'shield', 'hexagon'];
    if (style && customCornerSquares.includes(style.cornerSquare)) {
      const csClips = root.querySelectorAll('clipPath[id*="corners-square"]');
      csClips.forEach((cp) => {
        const p = cp.querySelector('path');
        if (!p) return;
        const d = p.getAttribute('d') || '';
        const m = d.match(/M\s*([\d.]+)\s+([\d.]+)/i);
        if (m) {
          const x = parseFloat(m[1]);
          const y = parseFloat(m[2]);
          const mV = d.match(/v\s*([\d.]+)/i);
          const mH = d.match(/h\s*([\d.]+)/i);
          const size = mV ? parseFloat(mV[1]) : (mH ? parseFloat(mH[1]) : 210);
          if (size > 0) {
            const newD = getCornerSquarePath(style.cornerSquare, x, y, size);
            if (newD) {
              p.setAttribute('d', newD);
              p.setAttribute('clip-rule', 'evenodd');
              p.setAttribute('fill-rule', 'evenodd');
            }
          }
        }
      });
    }

    // Custom Corner Eye Centers
    const customCornerDots = ['rounded', 'diamond', 'leaf', 'star', 'ring', 'cross', 'hexagon'];
    if (style && customCornerDots.includes(style.cornerDot)) {
      const cdClips = root.querySelectorAll('clipPath[id*="corners-dot"]');
      cdClips.forEach((cp) => {
        const el = cp.firstElementChild;
        if (!el) return;
        let x, y, size;
        if (el.tagName.toLowerCase() === 'rect') {
          x = parseFloat(el.getAttribute('x'));
          y = parseFloat(el.getAttribute('y'));
          size = parseFloat(el.getAttribute('width'));
        } else if (el.tagName.toLowerCase() === 'circle') {
          const cx = parseFloat(el.getAttribute('cx'));
          const cy = parseFloat(el.getAttribute('cy'));
          const r = parseFloat(el.getAttribute('r'));
          x = cx - r;
          y = cy - r;
          size = 2 * r;
        } else if (el.tagName.toLowerCase() === 'path') {
          const d = el.getAttribute('d') || '';
          const m = d.match(/M\s*([\d.]+)\s+([\d.]+)/i);
          if (m) {
            x = parseFloat(m[1]);
            y = parseFloat(m[2]);
            const mV = d.match(/v\s*([\d.]+)/i);
            const mH = d.match(/h\s*([\d.]+)/i);
            size = mV ? parseFloat(mV[1]) : (mH ? parseFloat(mH[1]) : 90);
          }
        }

        if (x !== undefined && y !== undefined && size && size > 0) {
          const newD = getCornerDotPath(style.cornerDot, x, y, size);
          if (newD) {
            const p = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', newD);
            p.setAttribute('clip-rule', 'evenodd');
            p.setAttribute('fill-rule', 'evenodd');
            if (el.hasAttribute('transform')) {
              p.setAttribute('transform', el.getAttribute('transform'));
            }
            cp.replaceChild(p, el);
          }
        }
      });
    }

    return new XMLSerializer().serializeToString(root);
  } catch (err) {
    console.warn('cleanQrSvg error:', err);
    return svgText;
  }
}

async function renderQrSvg(style, data) {
  const qr = new QRCodeStyling(qrOptions(style, data));
  const blob = await qr.getRawData('svg');
  const text = await blob.text();
  return cleanQrSvg(text, style);
}

/* ------------------------------------------------------------------ */
/* Frame composition                                                   */
/* ------------------------------------------------------------------ */

const FONT = "'Segoe UI','Helvetica Neue',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

/** Rounded-rectangle path (used for rings, clip paths and bubbles). */
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

function nestQr(qrSvg) {
  const doc = new DOMParser().parseFromString(qrSvg, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.nodeName.toLowerCase() === 'parsererror' || doc.querySelector('parsererror')) {
    throw new Error('QR SVG could not be parsed');
  }
  const ser = new XMLSerializer();
  return (x, y) => {
    const clone = root.cloneNode(true);
    clone.setAttribute('x', x);
    clone.setAttribute('y', y);
    clone.setAttribute('width', BASE);
    clone.setAttribute('height', BASE);
    return ser.serializeToString(clone);
  };
}

function buildFrame(qrSvg, style) {
  const S = BASE;
  const qr = nestQr(qrSvg);
  const col = style.frameColor;
  const tcol = style.frameTextColor;
  const text = (style.frameText || '').trim();

  const label = (cx, cy, maxW, maxFs, serif = false) => {
    if (!text) return '';
    const fs = Math.min(maxFs, maxW / (Math.max(1, text.length) * 0.7));
    return `<text x="${cx}" y="${cy}" fill="${tcol}" font-family="${serif ? SERIF : FONT}" font-weight="800"${serif ? ' font-style="italic"' : ''} font-size="${fs.toFixed(1)}" text-anchor="middle" dominant-baseline="central" letter-spacing="${(fs * 0.04).toFixed(1)}">${escHtml(text)}</text>`;
  };

  // A frame is a ring (outer shape with the QR window cut out), so a
  // transparent QR background stays truly see-through inside the window.
  const ring = (outer, hole) => `<path d="${outer}${hole}" fill="${col}" fill-rule="evenodd"/>`;
  const clip = (hole) => `<clipPath id="qs-window"><path d="${hole}"/></clipPath>`;

  switch (style.frame) {
    case 'bottom-banner': {
      const b = 40, bh = 200, W = S + 2 * b, H = b + S + bh;
      const hole = rr(b, b, S, S, 54);
      return {
        W, H, defs: clip(hole),
        body: ring(rr(0, 0, W, H, 92), hole) + `<g clip-path="url(#qs-window)">${qr(b, b)}</g>` + label(W / 2, b + S + bh / 2 + 2, W * 0.8, 118),
      };
    }
    case 'top-banner': {
      const b = 40, bh = 200, W = S + 2 * b, H = bh + S + b;
      const hole = rr(b, bh, S, S, 54);
      return {
        W, H, defs: clip(hole),
        body: ring(rr(0, 0, W, H, 92), hole) + `<g clip-path="url(#qs-window)">${qr(b, bh)}</g>` + label(W / 2, bh / 2 - 2, W * 0.8, 118),
      };
    }
    case 'bubble': {
      const b = 30, ph = 160, tail = 48;
      const W = S + 2 * b;
      const chars = Math.max(6, text.length);
      const pw = Math.min(W, Math.max(460, chars * 82 + 190));
      const y0 = ph + tail + 6;
      const H = y0 + S + 2 * b;
      const hole = rr(b, y0 + b, S, S, 46);
      const pill = `<path d="${rr((W - pw) / 2, 0, pw, ph, ph / 2)}" fill="${col}"/><path d="M${W / 2 - 36} ${ph - 4}L${W / 2} ${ph + tail}L${W / 2 + 36} ${ph - 4}Z" fill="${col}"/>`;
      return {
        W, H, defs: clip(hole),
        body: pill + label(W / 2, ph / 2 + 2, pw * 0.78, 84) + ring(rr(0, y0, W, S + 2 * b, 72), hole) + `<g clip-path="url(#qs-window)">${qr(b, y0 + b)}</g>`,
      };
    }
    case 'polaroid': {
      const pad = 66, cap = 250, W = S + 2 * pad, H = pad + S + cap;
      const hole = rr(pad, pad, S, S, 14);
      return {
        W, H, defs: clip(hole),
        body: ring(rr(0, 0, W, H, 40), hole) + `<g clip-path="url(#qs-window)">${qr(pad, pad)}</g>` +
          label(W / 2, pad + S + cap / 2 + 4, W * 0.8, 112, true),
      };
    }
    case 'phone': {
      const side = 66, top = 150, bottom = 240, W = S + 2 * side, H = top + S + bottom;
      const hole = rr(side, top, S, S, 38);
      const notch = `<path d="${rr(W / 2 - 74, top / 2 - 15, 148, 30, 15)}" fill="${tcol}" opacity=".32"/>`;
      return {
        W, H, defs: clip(hole),
        body: ring(rr(0, 0, W, H, 150), hole) + notch + `<g clip-path="url(#qs-window)">${qr(side, top)}</g>` + label(W / 2, top + S + bottom / 2 + 2, W * 0.8, 112),
      };
    }
    case 'badge': {
      const b = 38, topH = 100, botH = 175, W = S + 2 * b, H = topH + S + botH;
      const hole = rr(b, topH, S, S, 48);
      const topBadge = `<path d="${rr(W / 2 - 120, 24, 240, 56, 28)}" fill="${col}" opacity=".25"/>`;
      return {
        W, H, defs: clip(hole),
        body: ring(rr(0, 0, W, H, 100), hole) + topBadge + `<g clip-path="url(#qs-window)">${qr(b, topH)}</g>` + label(W / 2, topH + S + botH / 2 + 2, W * 0.8, 108),
      };
    }
    case 'minimal': {
      const pad = 44, bot = 140, W = S + 2 * pad, H = pad + S + bot;
      const hole = rr(pad, pad, S, S, 24);
      const border = `<rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="36" fill="none" stroke="${col}" stroke-width="12"/>`;
      const pill = `<path d="${rr(W / 2 - 200, pad + S + 22, 400, 84, 42)}" fill="${col}"/>`;
      return {
        W, H, defs: clip(hole),
        body: border + pill + `<g clip-path="url(#qs-window)">${qr(pad, pad)}</g>` + label(W / 2, pad + S + 64, 360, 68),
      };
    }
    case 'card': {
      const pad = 48, topH = 130, botH = 170, W = S + 2 * pad, H = topH + S + botH;
      const hole = rr(pad, topH, S, S, 32);
      const headerPill = `<path d="${rr(pad, 34, W - 2 * pad, 62, 18)}" fill="${col}" opacity=".15"/>`;
      return {
        W, H, defs: clip(hole),
        body: ring(rr(0, 0, W, H, 60), hole) + headerPill + `<g clip-path="url(#qs-window)">${qr(pad, topH)}</g>` + label(W / 2, topH + S + botH / 2 + 2, W * 0.78, 98),
      };
    }
    default:
      return { W: S, H: S, defs: '', body: qr(0, 0) };
  }
}

/** Build the final composed design. Returns {W, H, svg(widthPx)}. */
export async function buildDesign(payload, style) {
  const qrSvg = await renderQrSvg(style, payload);
  const { W, H, defs, body } = buildFrame(qrSvg, style);
  const svg = (widthPx = W) => {
    const w = Math.round(widthPx);
    const h = Math.round((widthPx * H) / W);
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${W} ${H}" shape-rendering="geometricPrecision">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
  };
  return { W, H, svg };
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export const FORMATS = {
  png: { mime: 'image/png', ext: 'png' },
  jpeg: { mime: 'image/jpeg', ext: 'jpg' },
  webp: { mime: 'image/webp', ext: 'webp' },
  svg: { mime: 'image/svg+xml', ext: 'svg' },
  pdf: { mime: 'application/pdf', ext: 'pdf' },
};

async function rasterize(design, res, mime, flatten) {
  const scale = res / Math.max(design.W, design.H);
  const pw = Math.max(1, Math.round(design.W * scale));
  const ph = Math.max(1, Math.round(design.H * scale));
  const svgText = design.svg(pw);
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (flatten) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pw, ph);
    }
    ctx.drawImage(img, 0, 0, pw, ph);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), mime, 0.95)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function toPdf(design, res, caption) {
  const { jsPDF } = await import('jspdf');
  // A4 paper is white, so flatten onto white and embed a compact JPEG
  // (an alpha PNG would balloon the PDF to many MB).
  const jpg = await rasterize(design, Math.min(res, 2400), 'image/jpeg', true);
  const dataUrl = await blobToDataUrl(jpg);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const maxW = 150, maxH = 190;
  const ratio = design.W / design.H;
  let w = maxW, h = maxW / ratio;
  if (h > maxH) { h = maxH; w = maxH * ratio; }
  doc.setProperties({ title: 'QR code', creator: 'QR Studio Pro' });
  doc.addImage(dataUrl, 'JPEG', (210 - w) / 2, 40, w, h);
  if (caption) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(caption.length > 90 ? caption.slice(0, 87) + '…' : caption, 105, 40 + h + 12, { align: 'center' });
  }
  return doc.output('blob');
}

/**
 * Produce a downloadable Blob for a design.
 * JPEG and PDF cannot hold transparency, so they are flattened onto white.
 */
export async function exportBlob(design, format, res, caption = '') {
  switch (format) {
    case 'svg':
      return new Blob([design.svg(res)], { type: FORMATS.svg.mime });
    case 'pdf':
      return toPdf(design, Math.max(res, 1024), caption);
    case 'jpeg':
      return rasterize(design, res, FORMATS.jpeg.mime, true);
    case 'webp':
      return rasterize(design, res, FORMATS.webp.mime, false);
    default:
      return rasterize(design, res, FORMATS.png.mime, false);
  }
}

/* ------------------------------------------------------------------ */
/* Scan-safety diagnostics                                             */
/* ------------------------------------------------------------------ */

export function diagnose(style, payload) {
  const fg = style.dotsMode === 'gradient' ? [style.dotsC1, style.dotsC2] : [style.dotsC1];
  if (style.customEyes) fg.push(style.eyeFrameC, style.eyeDotC);

  const notes = [];
  let level = 0; // 0 safe, 1 warn, 2 risk
  const bump = (l, msg) => { level = Math.max(level, l); notes.push(msg); };

  let ratio;
  let contrastLabel;
  if (style.transparent) {
    // Unknown surface: judge against white for dark dots, black for light dots.
    const surface = fg.reduce((s, c) => s + luminance(c), 0) / fg.length > 0.4 ? '#000000' : '#ffffff';
    ratio = Math.min(...fg.map((c) => contrastRatio(c, surface)));
    contrastLabel = `${ratio.toFixed(1)} : 1 on ${surface === '#ffffff' ? 'white' : 'black'}`;
    notes.push('Transparent background: place the code on a plain, high-contrast surface.');
  } else {
    ratio = Math.min(...fg.map((c) => contrastRatio(c, style.bg)));
    contrastLabel = `${ratio.toFixed(1)} : 1`;
    const inverted = fg.every((c) => luminance(c) > luminance(style.bg));
    if (inverted) bump(1, 'Light dots on a dark background (inverted). Some older scanners cannot read this.');
  }

  let grade;
  if (ratio >= 7) grade = 'Excellent';
  else if (ratio >= 4.5) grade = 'Good';
  else if (ratio >= 3) { grade = 'Low'; bump(1, 'Contrast is low. Test with a phone before printing.'); }
  else { grade = 'Too low'; bump(2, 'Contrast is too low. Most scanners will fail to read this.'); }

  if (style.logo && style.logoSize > 0.3 && style.ec !== 'H') {
    bump(1, 'A large logo needs error correction H to stay scannable.');
  }
  if (style.logo && style.logoSize > 0.4) bump(1, 'The logo covers a lot of the code. Try a smaller scale.');
  if (style.margin < 2 && !style.transparent) bump(1, 'Very small quiet zone. Some scanners need more empty space around the code.');
  if (byteLength(payload) > 600) notes.push('Large amount of data: print the code bigger so each dot stays readable.');

  return {
    level, // 0 | 1 | 2
    ratio,
    contrastLabel,
    grade,
    note: notes[0] || 'High contrast and strong error correction. Ready to print.',
    ecLabel: { L: 'L · 7% recovery', M: 'M · 15% recovery', Q: 'Q · 25% recovery', H: 'H · 30% recovery' }[style.ec],
  };
}
