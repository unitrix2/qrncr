// Cross-browser file download with proper filename preservation
export function downloadBlob(blob, filename) {
  const safeFilename = filename || 'qr-code.png';

  // Support for legacy Edge/IE if present
  if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.msSaveOrOpenBlob === 'function') {
    return window.navigator.msSaveOrOpenBlob(blob, safeFilename);
  }

  let url;
  try {
    const file = new File([blob], safeFilename, { type: blob.type || 'application/octet-stream' });
    url = URL.createObjectURL(file);
  } catch {
    url = URL.createObjectURL(blob);
  }

  const a = document.createElement('a');
  a.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
  a.href = url;
  a.download = safeFilename;
  a.setAttribute('download', safeFilename);
  // Do NOT add a.rel = 'noopener' or target='_blank' because Chromium/Edge isolates the link and strips the filename!
  document.body.appendChild(a);

  try {
    const evt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    a.dispatchEvent(evt);
  } catch {
    a.click();
  }

  // Defer removal and revoke so browser download manager has completed registering the file
  setTimeout(() => {
    try {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }, 30000);
}

export const downloadText = (text, filename, mime = 'application/json') =>
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);

export async function copyImage(blob) {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') throw new Error('Clipboard images are not supported in this browser.');
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}
