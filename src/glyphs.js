// Tiny inline-SVG glyphs for the option tiles (shapes + frames).

function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/** Rect path with an individual radius per corner. */
function rr4(x, y, s, tl, tr, br, bl) {
  return `M${x + tl} ${y}H${x + s - tr}${tr ? `A${tr} ${tr} 0 0 1 ${x + s} ${y + tr}` : ''}V${y + s - br}${br ? `A${br} ${br} 0 0 1 ${x + s - br} ${y + s}` : ''}H${x + bl}${bl ? `A${bl} ${bl} 0 0 1 ${x} ${y + s - bl}` : ''}V${y + tl}${tl ? `A${tl} ${tl} 0 0 1 ${x + tl} ${y}` : ''}Z`;
}

const svg = (inner, vb = 40) =>
  `<svg viewBox="0 0 ${vb} ${vb}" width="38" height="38" fill="currentColor" aria-hidden="true">${inner}</svg>`;

const UNITS = [[4, 4], [22, 4], [4, 22], [22, 22]];
const S = 14;

export function qrShapeGlyph(id) {
  if (id === 'circle') {
    return svg(
      `<circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".4"/>` +
      `<circle cx="20" cy="20" r="9" fill="currentColor" opacity=".8"/>` +
      `<circle cx="20" cy="7" r="2.5"/><circle cx="20" cy="33" r="2.5"/><circle cx="7" cy="20" r="2.5"/><circle cx="33" cy="20" r="2.5"/>`
    );
  }
  return svg(
    `<rect x="4" y="4" width="32" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".4"/>` +
    `<rect x="9" y="9" width="8" height="8" rx="1.5"/><rect x="23" y="9" width="8" height="8" rx="1.5"/>` +
    `<rect x="9" y="23" width="8" height="8" rx="1.5"/><rect x="23" y="23" width="8" height="8" rx="1.5"/>`
  );
}

export function dotGlyph(id) {
  const shapes = {
    square: (x, y) => `<rect x="${x}" y="${y}" width="${S}" height="${S}"/>`,
    rounded: (x, y) => `<path d="${rr4(x, y, S, 3, 3, 3, 3)}"/>`,
    dots: (x, y) => `<circle cx="${x + S / 2}" cy="${y + S / 2}" r="${S / 2}"/>`,
    classy: (x, y) => `<path d="${rr4(x, y, S, 7, 0, 7, 0)}"/>`,
    'classy-rounded': (x, y) => `<path d="${rr4(x, y, S, 7, 3, 7, 3)}"/>`,
    'extra-rounded': (x, y) => `<path d="${rr4(x, y, S, 5.5, 5.5, 5.5, 5.5)}"/>`,
  };
  return svg(UNITS.map(([x, y]) => (shapes[id] || shapes.square)(x, y)).join(''));
}

export function eyeFrameGlyph(id) {
  const ring = {
    'extra-rounded': `<rect x="7.5" y="7.5" width="25" height="25" rx="9"/>`,
    dot: `<circle cx="20" cy="20" r="12.5"/>`,
    square: `<rect x="7.5" y="7.5" width="25" height="25" rx="0.5"/>`,
    leaf: `<path d="${rr4(7.5, 7.5, 25, 12.5, 0, 12.5, 0)}"/>`,
    chamfer: `<path d="M14 7.5H26L32.5 14V26L26 32.5H14L7.5 26V14Z"/>`,
    'rounded-box': `<rect x="7.5" y="7.5" width="25" height="25" rx="4"/>`,
    diamond: `<polygon points="20,7.5 32.5,20 20,32.5 7.5,20"/>`,
    shield: `<path d="M11 7.5H29V22Q29 32.5 20 32.5Q11 32.5 11 22Z"/>`,
    hexagon: `<polygon points="14,7.5 26,7.5 32.5,20 26,32.5 14,32.5 7.5,20"/>`,
  }[id] || `<rect x="7.5" y="7.5" width="25" height="25" rx="9"/>`;
  return svg(`<g fill="none" stroke="currentColor" stroke-width="5">${ring}</g><circle cx="20" cy="20" r="4.4"/>`);
}

export function eyeDotGlyph(id) {
  const pupil = {
    dot: `<circle cx="20" cy="20" r="8"/>`,
    square: `<rect x="12.5" y="12.5" width="15" height="15" rx="0.5"/>`,
    rounded: `<rect x="12.5" y="12.5" width="15" height="15" rx="4.5"/>`,
    diamond: `<path d="M20 10.5L29.5 20L20 29.5L10.5 20Z"/>`,
    leaf: `<path d="${rr4(12.5, 12.5, 15, 7.5, 0, 7.5, 0)}"/>`,
    star: `<path d="M20 10.5Q20 20 29.5 20Q20 20 20 29.5Q20 20 10.5 20Q20 20 20 10.5Z"/>`,
    ring: `<circle cx="20" cy="20" r="7.5" fill="none" stroke="currentColor" stroke-width="3.5"/>`,
    cross: `<path d="M17 12H23V17H28V23H23V28H17V23H12V17H17Z"/>`,
    hexagon: `<polygon points="16,12 24,12 28,20 24,28 16,28 12,20"/>`,
  }[id] || `<circle cx="20" cy="20" r="8"/>`;
  return svg(`<rect x="5" y="5" width="30" height="30" rx="9" fill="none" stroke="currentColor" stroke-width="3" opacity=".3"/>${pupil}`);
}

const miniQr = (x, y, s, op = 0.62) => {
  const u = s / 7;
  const eye = (ex, ey) =>
    `<rect x="${ex + u * 0.3}" y="${ey + u * 0.3}" width="${u * 2.4}" height="${u * 2.4}" rx="${u * 0.6}" fill="none" stroke="currentColor" stroke-width="${u * 0.6}"/><rect x="${ex + u * 1.15}" y="${ey + u * 1.15}" width="${u * 0.7}" height="${u * 0.7}"/>`;
  return `<g opacity="${op}">${eye(x, y)}${eye(x + u * 4, y)}${eye(x, y + u * 4)}<rect x="${x + u * 4.3}" y="${y + u * 4.3}" width="${u * 0.9}" height="${u * 0.9}"/><rect x="${x + u * 5.7}" y="${y + u * 5.7}" width="${u * 0.9}" height="${u * 0.9}"/></g>`;
};
const textLine = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="3.2" rx="1.6" fill="var(--tile-bg, #fff)"/>`;
const ring = (outer, hole) => `<path fill-rule="evenodd" d="${outer}${hole}"/>`;

export function frameGlyph(id) {
  switch (id) {
    case 'bottom-banner':
      return svg(ring(rr(5, 3, 38, 42, 8), rr(9, 7, 30, 26, 4)) + miniQr(13, 9.5, 22) + textLine(15, 36.6, 18), 48);
    case 'top-banner':
      return svg(ring(rr(5, 3, 38, 42, 8), rr(9, 15, 30, 26, 4)) + miniQr(13, 17.5, 22) + textLine(15, 7.6, 18), 48);
    case 'bubble':
      return svg(`<path d="${rr(9, 2, 30, 11, 5.5)}"/><path d="M20 12.5L24 17L28 12.5Z"/>` + ring(rr(6, 18, 36, 27, 8), rr(10, 22, 28, 19, 4)) + miniQr(15, 23.5, 18), 48);
    case 'polaroid':
      return svg(ring(rr(5, 3, 38, 42, 5), rr(9, 7, 30, 27, 2)) + miniQr(13, 10, 22) + textLine(16, 37.8, 16), 48);
    case 'phone':
      return svg(ring(rr(9, 2, 30, 44, 7), rr(12, 9, 24, 24, 3)) + miniQr(14, 11, 20) + `<rect x="20" y="4.4" width="8" height="2" rx="1" fill="var(--tile-bg, #fff)"/>` + textLine(16, 37.6, 16), 48);
    case 'badge':
      return svg(ring(rr(5, 2, 38, 44, 12), rr(9, 8, 30, 26, 4)) + `<path d="${rr(14, 4, 20, 2, 1)}"/>` + miniQr(13, 10, 22) + textLine(15, 37.6, 18), 48);
    case 'minimal':
      return svg(`<rect x="4" y="3" width="40" height="42" rx="8" fill="none" stroke="currentColor" stroke-width="2.2" opacity=".4"/>` + miniQr(11, 9, 26) + `<rect x="12" y="37" width="24" height="4" rx="2" fill="currentColor"/>`, 48);
    case 'card':
      return svg(ring(rr(4, 2, 40, 44, 6), rr(8, 9, 32, 26, 3)) + `<rect x="10" y="5" width="28" height="2" rx="1" opacity=".6"/>` + miniQr(13, 11, 22) + textLine(14, 38, 20), 48);
    default:
      return svg(`<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3" opacity=".5"><rect x="5" y="5" width="38" height="38" rx="8"/></g>` + miniQr(12, 12, 24, 0.9), 48);
  }
}
