// Pure helpers shared by the browser and the build-time prerender (no DOM access here).
import { STRINGS, LANGS, DEFAULT_LANG } from '../data/i18n.js';
import { RESTAURANT, DISHES, WHATSAPP_NUMBER } from '../data/menu.js';

export { LANGS, DEFAULT_LANG };
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function t(key, lang = DEFAULT_LANG, vars) {
  let s = STRINGS[lang]?.[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}

export function plural(base, count, lang, vars = {}) {
  const one = lang === 'fr' ? count <= 1 : count === 1;
  return t(`${base}.${one ? 'one' : 'other'}`, lang, { count, ...vars });
}

const numberFormats = {};
export function formatNumber(n, lang) {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  numberFormats[locale] ??= new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  return numberFormats[locale].format(n);
}

export const formatPrice = (n, lang) => `${formatNumber(n, lang)} FCFA`;

export function formatTime(hhmm, lang) {
  const [h, m] = hhmm.split(':');
  return lang === 'fr' ? `${Number(h)}h${m}` : `${h.padStart(2, '0')}:${m}`;
}

export const dishById = (id) => DISHES.find((d) => d.id === id);
export const dishName = (id, lang) => dishById(id)?.name[lang] ?? id;

/** Groups consecutive days with identical hours: [{ days: 'Mon–Sat', time: '10:00–22:00', open }] */
export function hoursGroups(lang, hours = RESTAURANT.hours) {
  const groups = [];
  for (const key of DAY_KEYS) {
    const value = hours[key] ?? null;
    const sig = JSON.stringify(value);
    const last = groups[groups.length - 1];
    if (last && last.sig === sig) last.to = key;
    else groups.push({ sig, from: key, to: key, value });
  }
  return groups.map(({ from, to, value }) => ({
    days: from === to ? t(`day.${from}`, lang) : `${t(`day.${from}`, lang)}–${t(`day.${to}`, lang)}`,
    time: value ? `${formatTime(value[0], lang)}–${formatTime(value[1], lang)}` : t('hours.closed', lang),
    open: Boolean(value),
  }));
}

/** First opening time in the week, used for "Cooked fresh since 10:00". */
export function firstOpeningTime(hours = RESTAURANT.hours) {
  const times = DAY_KEYS.map((k) => hours[k]?.[0]).filter(Boolean).sort();
  return times[0] ?? '10:00';
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Live open/closed state in the restaurant's timezone. Handles closing times after midnight. */
export function openStatus(now = new Date(), hours = RESTAURANT.hours, timeZone = RESTAURANT.timezone) {
  let weekday;
  let minutes;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '0';
    weekday = get('weekday').slice(0, 3).toLowerCase();
    minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
  } catch {
    weekday = DAY_KEYS[(now.getDay() + 6) % 7];
    minutes = now.getHours() * 60 + now.getMinutes();
  }
  const idx = DAY_KEYS.indexOf(weekday);
  if (idx < 0) return { known: false };

  const yesterday = hours[DAY_KEYS[(idx + 6) % 7]];
  if (yesterday) {
    const [o, c] = yesterday.map(toMinutes);
    if (c <= o && minutes < c) return { known: true, open: true, until: yesterday[1] };
  }

  const today = hours[weekday];
  if (today) {
    const o = toMinutes(today[0]);
    let c = toMinutes(today[1]);
    if (c <= o) c += 24 * 60;
    if (minutes >= o && minutes < c) return { known: true, open: true, until: today[1] };
    if (minutes < o) return { known: true, open: false, opens: today[0], when: 'today' };
  }

  for (let i = 1; i <= 7; i++) {
    const key = DAY_KEYS[(idx + i) % 7];
    if (hours[key]) return { known: true, open: false, opens: hours[key][0], when: i === 1 ? 'tomorrow' : key };
  }
  return { known: false };
}

export function statusText(status, lang) {
  if (!status.known) return t('hours.unknown', lang);
  if (status.open) return t('hours.open', lang, { time: formatTime(status.until, lang) });
  const time = formatTime(status.opens, lang);
  if (status.when === 'today') return t('hours.opensToday', lang, { time });
  if (status.when === 'tomorrow') return t('hours.opensTomorrow', lang, { time });
  return t('hours.opensDay', lang, { time, day: t(`dayLong.${status.when}`, lang) });
}

export const waUrl = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const telUrl = (phone = RESTAURANT.phone) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export const minPrice = () => Math.min(...DISHES.map((d) => d.price));

/** Site base path: "/" normally, "/<repo>/" on GitHub Pages (set by BASE_PATH at build time). */
// In the browser Vite provides BASE_URL; in the build-time prerender this is "/" and Vite adds the base itself.
const BASE = (import.meta.env && import.meta.env.BASE_URL) || '/';

/** Dish photos live in public/images/dishes as <name>-240.webp and <name>-640.webp (npm run photos). */
export const photoSrc = (name, size = 640) => `${BASE}images/dishes/${name}-${size}.webp`;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
