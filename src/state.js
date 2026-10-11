// Design state: defaults + defensive sanitising (used for presets, saved
// designs and imported JSON so a bad file can never break the editor).
import { normHex, clamp } from './utils.js';
import { FRAME_IDS } from './qrEngine.js';
import { LOGOS } from './logos.js';

export const QR_SHAPES = ['square', 'circle'];
export const DOTS_TYPES = ['rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded', 'square'];
export const CORNER_SQUARE_TYPES = ['extra-rounded', 'dot', 'square', 'leaf', 'chamfer', 'rounded-box', 'diamond', 'shield', 'hexagon'];
export const CORNER_DOT_TYPES = ['dot', 'square', 'rounded', 'diamond', 'leaf', 'star', 'ring', 'cross', 'hexagon'];
export const EC_LEVELS = ['L', 'M', 'Q', 'H'];

export const defaultStyle = () => ({
  qrShape: 'square',
  dotsType: 'extra-rounded',
  cornerSquare: 'extra-rounded',
  cornerDot: 'dot',
  margin: 4, // % of QR width
  ec: 'H',

  dotsMode: 'gradient', // single | gradient
  dotsC1: '#062b22',
  dotsC2: '#024b68',
  gradType: 'linear', // linear | radial
  gradAngle: 45,

  customEyes: true,
  eyeFrameC: '#062b22',
  eyeDotC: '#024b68',

  bg: '#ffffff',
  transparent: false,

  logo: null, // {kind:'preset', id} | {kind:'custom', src, name}
  logoSize: 0.3,
  logoMargin: 6,
  hideLogoDots: true,

  frame: 'none',
  frameText: 'SCAN ME',
  frameColor: '#0a0d14',
  frameTextColor: '#ffffff',
});

const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const num = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
};

export function sanitizeStyle(input = {}) {
  const d = defaultStyle();
  const s = input && typeof input === 'object' ? input : {};

  let logo = null;
  if (s.logo && typeof s.logo === 'object') {
    if (s.logo.kind === 'preset' && LOGOS.some((l) => l.id === s.logo.id)) {
      logo = { kind: 'preset', id: s.logo.id };
    } else if (s.logo.kind === 'custom' && typeof s.logo.src === 'string' && s.logo.src.startsWith('data:image/')) {
      logo = { kind: 'custom', src: s.logo.src, name: String(s.logo.name || 'logo').slice(0, 60) };
    }
  }

  return {
    qrShape: pick(s.qrShape, QR_SHAPES, d.qrShape),
    dotsType: pick(s.dotsType, DOTS_TYPES, d.dotsType),
    cornerSquare: pick(s.cornerSquare, CORNER_SQUARE_TYPES, d.cornerSquare),
    cornerDot: pick(s.cornerDot, CORNER_DOT_TYPES, d.cornerDot),
    margin: num(s.margin, 0, 14, d.margin),
    ec: pick(s.ec, EC_LEVELS, d.ec),

    dotsMode: pick(s.dotsMode, ['single', 'gradient'], d.dotsMode),
    dotsC1: normHex(s.dotsC1, d.dotsC1),
    dotsC2: normHex(s.dotsC2, d.dotsC2),
    gradType: pick(s.gradType, ['linear', 'radial'], d.gradType),
    gradAngle: Math.round(num(s.gradAngle, 0, 360, d.gradAngle)),

    customEyes: Boolean(s.customEyes),
    eyeFrameC: normHex(s.eyeFrameC, d.eyeFrameC),
    eyeDotC: normHex(s.eyeDotC, d.eyeDotC),

    bg: normHex(s.bg, d.bg),
    transparent: Boolean(s.transparent),

    logo,
    logoSize: num(s.logoSize, 0.15, 0.45, d.logoSize),
    logoMargin: Math.round(num(s.logoMargin, 0, 25, d.logoMargin)),
    hideLogoDots: s.hideLogoDots === undefined ? d.hideLogoDots : Boolean(s.hideLogoDots),

    frame: pick(s.frame, FRAME_IDS, d.frame),
    frameText: String(s.frameText ?? d.frameText).slice(0, 28),
    frameColor: normHex(s.frameColor, d.frameColor),
    frameTextColor: normHex(s.frameTextColor, d.frameTextColor),
  };
}

export const defaultExport = () => ({ format: 'png', res: 2048 });
