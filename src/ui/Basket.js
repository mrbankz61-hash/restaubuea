// The basket and the one conversion that matters: a WhatsApp message listing the dishes.
// Every [data-wa] link on the page always carries the current basket in the current language.
import { DISHES } from '../data/menu.js';
import { dishById, esc, formatPrice, plural, t, waUrl } from './format.js';
import { icon } from './icons.js';
import { getLang, onLangChange } from './LangToggle.js';

const KEY = 'ndole.basket';
const MAX_QTY = 30;
const $$ = (sel) => document.querySelectorAll(sel);

export class Basket {
  constructor() {
    this.items = new Map();
    this.listeners = new Set();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      for (const [id, q] of Object.entries(saved)) {
        if (dishById(id) && Number(q) > 0) this.items.set(id, Math.min(MAX_QTY, Math.floor(q)));
      }
    } catch {
      // Unreadable or blocked storage: start with an empty basket.
    }
  }

  qty(id) {
    return this.items.get(id) ?? 0;
  }

  add(id, n = 1) {
    if (!dishById(id)) return;
    this.items.set(id, Math.min(MAX_QTY, this.qty(id) + n));
    this.changed();
  }

  remove(id, n = 1) {
    const q = this.qty(id) - n;
    if (q > 0) this.items.set(id, q);
    else this.items.delete(id);
    this.changed();
  }

  clear() {
    this.items.clear();
    this.changed();
  }

  get count() {
    let n = 0;
    for (const q of this.items.values()) n += q;
    return n;
  }

  get total() {
    let sum = 0;
    for (const [id, q] of this.items) sum += (dishById(id)?.price ?? 0) * q;
    return sum;
  }

  /** Lines in menu order, so the WhatsApp message reads like the menu. */
  lines() {
    return DISHES.filter((d) => this.items.has(d.id)).map((d) => ({ dish: d, qty: this.qty(d.id), sum: d.price * this.qty(d.id) }));
  }

  message(lang) {
    const lines = this.lines();
    if (!lines.length) return t('wa.empty', lang);
    return [
      t('wa.greeting', lang),
      ...lines.map((l) => `• ${l.qty} × ${l.dish.name[lang]} (${formatPrice(l.sum, lang)})`),
      '',
      t('wa.total', lang, { total: formatPrice(this.total, lang) }),
      '',
      t('wa.details', lang),
    ].join('\n');
  }

  onChange(fn) {
    this.listeners.add(fn);
  }

  changed() {
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(this.items)));
    } catch {
      // Storage full or blocked: the basket still works for this visit.
    }
    this.listeners.forEach((fn) => fn(this));
  }
}

const lineHTML = ({ dish, qty, sum }, lang) => {
  const name = dish.name[lang];
  return `<li class="line">
    <span class="line__name">${esc(name)}</span>
    <span class="qty qty--compact has-items" data-qty-for="${dish.id}">
      <span class="qty__stepper">
        <button type="button" class="qty__btn" data-dec="${dish.id}" aria-label="${esc(t('menu.decAria', lang, { name }))}">${icon.minus}</button>
        <output class="qty__n" data-qty="${dish.id}">${qty}</output>
        <button type="button" class="qty__btn" data-add="${dish.id}" aria-label="${esc(t('menu.addAria', lang, { name }))}">${icon.plus}</button>
      </span>
    </span>
    <span class="line__sum">${esc(formatPrice(sum, lang))}</span>
  </li>`;
};

function focusKey(el) {
  if (!el) return null;
  if (el.dataset.add) return `[data-add="${el.dataset.add}"]`;
  if (el.dataset.dec) return `[data-dec="${el.dataset.dec}"]`;
  return null;
}

export function initBasketUI(basket, { onAdd } = {}) {
  const announcer = document.getElementById('announcer');
  const announce = (msg) => {
    if (!announcer) return;
    announcer.textContent = '';
    requestAnimationFrame(() => (announcer.textContent = msg));
  };

  document.addEventListener('click', (event) => {
    const lang = getLang();
    const add = event.target.closest('[data-add]');
    if (add) {
      const id = add.dataset.add;
      basket.add(id);
      onAdd?.(id, add);
      announce(t('basket.added', lang, { name: dishById(id).name[lang], count: basket.count }));
      return;
    }
    const dec = event.target.closest('[data-dec]');
    if (dec) {
      const id = dec.dataset.dec;
      basket.remove(id);
      announce(t('basket.removed', lang, { name: dishById(id).name[lang] }));
      return;
    }
    if (event.target.closest('[data-basket-clear]')) basket.clear();
  });

  const render = () => {
    const lang = getLang();
    const count = basket.count;
    const active = document.activeElement;
    const activeKey = focusKey(active);
    const activeControl = active?.closest?.('[data-qty-for]');

    for (const el of $$('[data-qty-for]')) {
      const q = basket.qty(el.dataset.qtyFor);
      el.classList.toggle('has-items', q > 0);
      const out = el.querySelector('[data-qty]');
      if (out) out.textContent = String(q);
    }

    const totalText = formatPrice(basket.total, lang);
    const meta = count ? `${plural('basket.item', count, lang)} · ${totalText}` : '';
    for (const el of $$('[data-basket-count]')) {
      el.textContent = String(count);
      el.hidden = count === 0;
    }
    for (const el of $$('[data-basket-total]')) el.textContent = totalText;
    for (const el of $$('[data-basket-totalrow]')) el.hidden = count === 0;
    for (const el of $$('[data-basket-meta]')) {
      el.textContent = meta;
      el.hidden = !count;
    }
    for (const el of $$('[data-basket-empty]')) el.hidden = count > 0;
    for (const el of $$('[data-basket-clear]')) el.hidden = count === 0;

    const href = waUrl(basket.message(lang));
    for (const el of $$('[data-wa]')) el.href = href;

    const html = basket.lines().map((l) => lineHTML(l, lang)).join('');
    for (const list of $$('[data-basket-lines]')) {
      const hadFocus = list.contains(active);
      list.innerHTML = html;
      if (hadFocus) {
        const again = activeKey && list.querySelector(activeKey);
        (again ?? list.querySelector('button') ?? list.closest('dialog')?.querySelector('[data-close]'))?.focus();
      }
    }

    // "+ Add" swaps for a stepper (and back at zero): keep keyboard focus on the same control.
    if (activeControl && !activeControl.closest('[data-basket-lines]') && active.offsetParent === null) {
      const fallback = activeControl.classList.contains('has-items')
        ? activeControl.querySelector('.qty__stepper [data-add]')
        : activeControl.querySelector('.qty__add');
      fallback?.focus();
    }
  };

  basket.onChange(render);
  onLangChange(render);
  render();
}
