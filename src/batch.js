// Batch generator: one QR per line, packed into a ZIP.
import { buildDesign, exportBlob, FORMATS } from './qrEngine.js';
import { slug } from './utils.js';

export const BATCH_LIMIT = 300;

export const parseLines = (text) =>
  String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const csvCell = (s) => `"${String(s).replace(/"/g, '""')}"`;

export async function runBatch(lines, style, { format = 'png', res = 1024, onProgress } = {}) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const pad = String(lines.length).length;
  const used = new Set();
  const rows = ['file,content'];
  const ext = FORMATS[format].ext;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    onProgress?.(i, lines.length);
    const design = await buildDesign(text, style);
    const blob = await exportBlob(design, format, res, text);
    let name = `${String(i + 1).padStart(pad, '0')}-${slug(text, 32)}`;
    while (used.has(name)) name += '-x';
    used.add(name);
    zip.file(`${name}.${ext}`, blob);
    rows.push(`${csvCell(`${name}.${ext}`)},${csvCell(text)}`);
    // give the UI a breath so the progress bar can paint
    await new Promise((r) => setTimeout(r, 0));
  }
  zip.file('_index.csv', rows.join('\n'));
  onProgress?.(lines.length, lines.length);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
