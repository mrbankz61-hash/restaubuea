// EN/FR switch. Static copy is prerendered in both languages and shown/hidden by CSS from
// <html lang>, so switching is instant. This module handles the rest: persistence,
// translated aria-labels, the document title, and notifying dynamic UI (basket, hours).
import { LANGS, DEFAULT_LANG, dishName, t } from './format.js';

const KEY = 'ndole.lang';
const listeners = new Set();
let current = LANGS.includes(document.documentElement.lang) ? document.documentElement.lang : DEFAULT_LANG;

export const getLang = () => current;

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function applyAttributes() {
  document.title = t('meta.title', current);
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description', current));
  for (const btn of document.querySelectorAll('[data-set-lang]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.setLang === current));
  }
  for (const el of document.querySelectorAll('[data-aria-key]')) {
    const name = el.dataset.ariaDish ? dishName(el.dataset.ariaDish, current) : undefined;
    el.setAttribute('aria-label', t(el.dataset.ariaKey, current, name ? { name } : undefined));
  }
}

export function setLang(lang) {
  if (!LANGS.includes(lang)) return;
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Private mode or blocked storage: the choice simply isn't remembered.
  }
  applyAttributes();
  listeners.forEach((fn) => fn(lang));
}

export function initLangToggle() {
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-set-lang]');
    if (btn) setLang(btn.dataset.setLang);
  });
  applyAttributes();
}
