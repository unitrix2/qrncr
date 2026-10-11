// Small DOM helpers: selectors, toasts, dialogs, path get/set.
import { icon } from './icons.js';
import { escHtml } from './utils.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}

/* ---------- Toasts ---------- */
const ICON = { ok: 'ok', warn: 'warn', error: 'risk', info: 'info' };

export function toast(message, { kind = 'ok', action, onAction, duration = 3400 } = {}) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `${icon(ICON[kind] || 'ok', 18)}<span>${escHtml(message)}</span>${action ? `<button type="button" class="toast-action">${escHtml(action)}</button>` : ''}`;
  host.appendChild(el);
  // Re-open as a top-layer popover so toasts stay visible above open dialogs.
  try { host.hidePopover?.(); host.showPopover?.(); } catch { /* popover unsupported */ }
  while (host.children.length > 3) host.firstElementChild.remove();
  const close = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 220);
  };
  if (action) el.querySelector('.toast-action').addEventListener('click', () => { onAction?.(); close(); });
  setTimeout(close, action ? duration + 2600 : duration);
}

/* ---------- Dialogs ---------- */
export function setupDialog(dlg, { onOpen, onClose } = {}) {
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('close', () => onClose?.());
  return {
    open() {
      if (!dlg.open) dlg.showModal();
      onOpen?.();
    },
    close: () => dlg.close(),
  };
}
