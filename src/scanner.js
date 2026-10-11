// QR scanner: live camera + image upload (jsQR is loaded on demand).
let jsQRPromise;
const loadJsQR = () => (jsQRPromise ??= import('jsqr').then((m) => m.default || m));

const MAX_SIDE = 1400;

function decodeCanvas(jsQR, ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h);
  return jsQR(data.data, w, h, { inversionAttempts: 'attemptBoth' });
}

export async function scanImageFile(file) {
  const jsQR = await loadJsQR();
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('This image could not be opened.'));
      i.src = url;
    });
    const natW = img.naturalWidth || 800;
    const natH = img.naturalHeight || 800;
    // Try a few scales: very large or very small images decode differently.
    for (const target of [MAX_SIDE, 900, 500]) {
      const scale = Math.min(1, target / Math.max(natW, natH)) || 1;
      const w = Math.max(1, Math.round(natW * scale));
      const h = Math.max(1, Math.round(natH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const code = decodeCanvas(jsQR, ctx, w, h);
      if (code) return code.data;
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createCameraScanner({ video, canvas, onResult, onError }) {
  let stream = null;
  let raf = 0;
  let running = false;
  let last = 0;

  async function tick(jsQR) {
    if (!running) return;
    raf = requestAnimationFrame(() => tick(jsQR));
    const now = performance.now();
    if (now - last < 90 || video.readyState < 2) return;
    last = now;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;
    const scale = Math.min(1, 640 / Math.max(vw, vh));
    const w = Math.round(vw * scale), h = Math.round(vh * scale);
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    const code = decodeCanvas(jsQR, ctx, w, h);
    if (code && code.data) {
      stop();
      onResult(code.data);
    }
  }

  async function start() {
    if (running) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.('Camera access needs a secure page (https or localhost) and a supported browser.');
      return;
    }
    try {
      const jsQR = await loadJsQR();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      video.srcObject = stream;
      await video.play();
      running = true;
      tick(jsQR);
    } catch (err) {
      stop();
      const name = err?.name;
      onError?.(
        name === 'NotAllowedError' ? 'Camera permission was blocked. Allow it in the address bar, then try again.'
        : name === 'NotFoundError' ? 'No camera was found on this device. Upload an image instead.'
        : 'The camera could not be started. Upload an image instead.'
      );
    }
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  }

  return { start, stop, get active() { return running; } };
}
