// Build-time HTML. vite.config.js injects this into index.html so the menu, prices and hours
// ship as real, crawlable text in both languages before any JavaScript runs.
import { DISHES, RESTAURANT, SITE_CREDIT } from '../data/menu.js';
import { CHAPTERS } from '../scene/timeline.js';
import {
  LANGS, DEFAULT_LANG, t, esc, formatPrice, formatTime, hoursGroups, firstOpeningTime,
  minPrice, waUrl, telUrl, photoSrc,
} from './format.js';
import { icon } from './icons.js';

const span = (lang, text) => `<span class="l" lang="${lang}">${esc(text)}</span>`;
/** Bilingual text from an i18n key. `vars` may be an object or a function of the language. */
const bi = (key, vars) =>
  LANGS.map((l) => span(l, t(key, l, typeof vars === 'function' ? vars(l) : vars))).join('');
/** Bilingual text from a { en, fr } object (dish names, address). */
const biObj = (obj) => LANGS.map((l) => span(l, obj[l] ?? obj[DEFAULT_LANG])).join('');
const biFn = (fn) => LANGS.map((l) => span(l, fn(l))).join('');
const pad = (n) => String(n).padStart(2, '0');

const hoursSummary = () => biFn((l) => hoursGroups(l).map((g) => `${g.days} ${g.time}`).join(' · '));

const hoursList = (cls = 'hours') =>
  `<dl class="${cls}">${LANGS.map((l) =>
    hoursGroups(l)
      .map((g) => `<div class="hours__row l${g.open ? '' : ' is-closed'}" lang="${l}"><dt>${esc(g.days)}</dt><dd>${esc(g.time)}</dd></div>`)
      .join(''),
  ).join('')}</dl>`;

const status = (cls = 'status') =>
  `<p class="${cls}" data-open-state><span class="dot" aria-hidden="true"></span><span data-hours-status>${hoursSummary()}</span></p>`;

const ariaAttrs = (key, dish) =>
  `data-aria-key="${key}"${dish ? ` data-aria-dish="${dish.id}"` : ''} aria-label="${esc(
    t(key, DEFAULT_LANG, dish ? { name: dish.name[DEFAULT_LANG] } : undefined),
  )}"`;

const qty = (d) => `
<div class="qty" data-qty-for="${d.id}">
  <button type="button" class="qty__add" data-add="${d.id}" ${ariaAttrs('menu.addAria', d)}>${icon.plus}<span>${bi('menu.add')}</span></button>
  <div class="qty__stepper">
    <button type="button" class="qty__btn" data-dec="${d.id}" ${ariaAttrs('menu.decAria', d)}>${icon.minus}</button>
    <output class="qty__n" data-qty="${d.id}">0</output>
    <button type="button" class="qty__btn" data-add="${d.id}" ${ariaAttrs('menu.addAria', d)}>${icon.plus}</button>
  </div>
</div>`;

const chilli = (d) =>
  d.spicy > 0
    ? `<span class="chilli">${icon.chilli.repeat(
        Math.min(3, d.spicy),
      )}<span class="sr-only">${bi(d.spicy > 1 ? 'menu.verySpicy' : 'menu.spicy')}</span></span>`
    : '';

const waButton = (cls, meta = true) =>
  `<a class="btn btn--wa ${cls}" data-wa href="${esc(waUrl(t('wa.empty')))}" target="_blank" rel="noopener">${icon.wa}<span class="btn__label">${bi(
    'cta.order',
  )}</span>${meta ? '<span class="btn__meta" data-basket-meta></span>' : ''}</a>`;

/** Lazy, responsive dish photo: phones get the 240 px file, large cards the 640 px one. */
const photo = (d, sizes, cls) =>
  d.photo
    ? `<figure class="${cls}"><img src="${photoSrc(d.photo, 640)}" srcset="${photoSrc(d.photo, 240)} 240w, ${photoSrc(d.photo, 640)} 640w" sizes="${sizes}" width="640" height="640" alt="" loading="lazy" decoding="async"></figure>`
    : '';

const dishCard = (d, i) => `
<li class="dish" id="dish-${d.id}" data-dish="${d.id}" data-index="${i}">
  <article class="dish__card${d.photo ? ' has-photo' : ''}" aria-labelledby="dish-${d.id}-name">
    ${photo(d, '(max-aspect-ratio: 9/10) 80px, 420px', 'dish__photo')}
    <div class="dish__head">
      <p class="dish__num" aria-hidden="true">${pad(i + 1)}</p>
      <h3 class="dish__name" id="dish-${d.id}-name">${biObj(d.name)}</h3>
    </div>
    <p class="dish__desc">${biObj(d.desc)}</p>
    <div class="dish__foot">
      <p class="dish__price">${biFn((l) => formatPrice(d.price, l))}${chilli(d)}</p>
      ${qty(d)}
    </div>
  </article>
</li>`;

const sheetRow = (d) => `
<li class="row${d.photo ? ' has-photo' : ''}">
  ${photo(d, '64px', 'row__photo')}
  <div class="row__text">
    <p class="row__name">${biObj(d.name)}${chilli(d)}</p>
    <p class="row__desc">${biObj(d.desc)}</p>
  </div>
  <p class="row__price">${biFn((l) => formatPrice(d.price, l))}</p>
  ${qty(d)}
</li>`;

const header = () => `
<header class="bar">
  <a class="bar__logo" href="#arrival" data-jump="arrival" ${ariaAttrs('nav.home')}>Ndolé<em>House</em></a>
  ${status('bar__status status')}
  <div class="bar__actions">
    <div class="lang" role="group" ${ariaAttrs('nav.lang')}>
      ${LANGS.map((l) => `<button type="button" class="lang__btn" data-set-lang="${l}" lang="${l}" aria-pressed="${l === DEFAULT_LANG}">${l.toUpperCase()}</button>`).join('')}
    </div>
    <button type="button" class="bar__btn" data-open="menu-sheet">${icon.menu}<span class="bar__btn-label">${bi('nav.menu')}</span></button>
    <button type="button" class="bar__basket" data-open="basket-sheet" data-basket-target ${ariaAttrs('nav.basketAria')}>${icon.bag}<span class="badge" data-basket-count hidden>0</span></button>
  </div>
</header>`;

const rail = () => `
<nav class="rail" ${ariaAttrs('nav.chapters')}>
  <ol class="rail__list">
    ${CHAPTERS.map((c) => `<li><a class="rail__link" href="#${c.id}" data-jump="${c.id}"><span class="rail__dot" aria-hidden="true"></span><span class="rail__label">${bi(`chapter.${c.id}`)}</span></a></li>`).join('')}
  </ol>
  <span class="rail__track" aria-hidden="true"><span class="rail__fill"></span></span>
</nav>`;

const len = (id) => {
  const c = CHAPTERS.find((ch) => ch.id === id);
  return Math.round((c.end - c.start) * 100);
};

const chapters = () => `
<main id="journey" class="journey">
  <section class="chapter chapter--arrival is-current" id="arrival" aria-labelledby="arrival-title" style="--len:${len('arrival')}">
    <div class="stage">
      <div class="stage__content hero" data-reveal>
        <p class="eyebrow">${bi('hero.eyebrow')}</p>
        <h1 class="hero__title" id="arrival-title"><span class="hero__word">Ndolé</span> <span class="hero__word hero__word--alt">House</span></h1>
        <p class="hero__lede">${bi('hero.lede')}</p>
        <ul class="facts">
          <li class="fact fact--status">${status('status')}</li>
          <li class="fact">${bi('hero.from', (l) => ({ price: formatPrice(minPrice(), l) }))}</li>
          <li class="fact">${icon.pin}${bi('hero.where')}</li>
        </ul>
        <div class="cta-row">
          <button type="button" class="btn btn--ghost" data-open="menu-sheet">${icon.menu}<span>${bi('cta.menu')}</span></button>
          ${waButton('', false)}
        </div>
      </div>
      <p class="scroll-cue" data-cue aria-hidden="true"><span class="scroll-cue__line"></span>${bi('hero.scroll')}</p>
    </div>
  </section>

  <section class="chapter chapter--street" id="street" aria-labelledby="street-title" style="--len:${len('street')}">
    <div class="stage">
      <div class="stage__content caption" data-reveal>
        <p class="kicker">${bi('street.kicker')}</p>
        <h2 class="title" id="street-title">${bi('street.title')}</h2>
        <p class="body">${bi('street.body')}</p>
      </div>
    </div>
  </section>

  <section class="chapter chapter--door" id="door" aria-labelledby="door-title" style="--len:${len('door')}">
    <div class="stage">
      <div class="stage__content welcome" data-reveal>
        <h2 class="welcome__title" id="door-title">${bi('door.title')}</h2>
        <p class="body">${bi('door.body')}</p>
      </div>
    </div>
  </section>

  <section class="chapter chapter--menu" id="menu" aria-labelledby="menu-title" style="--len:${len('menu')}">
    <div class="stage">
      <header class="menu-head" data-reveal>
        <p class="kicker">${bi('menu.kicker')}</p>
        <h2 class="title title--sm" id="menu-title">${bi('menu.title')}</h2>
        <p class="body body--sm">${bi('menu.sub')}</p>
        <p class="menu-count" aria-hidden="true"><span data-dish-current>01</span><span class="menu-count__sep">/</span><span>${pad(DISHES.length)}</span></p>
      </header>
      <ol class="dishes">${DISHES.map(dishCard).join('')}</ol>
    </div>
  </section>

  <section class="chapter chapter--kitchen" id="kitchen" aria-labelledby="kitchen-title" style="--len:${len('kitchen')}">
    <div class="stage">
      <div class="stage__content kitchen" data-reveal>
        <p class="kicker">${bi('kitchen.kicker')}</p>
        <h2 class="title" id="kitchen-title">${bi('kitchen.title', (l) => ({ time: formatTime(firstOpeningTime(), l) }))}</h2>
        <p class="body">${bi('kitchen.body')}</p>
        <div class="hours-card">
          <p class="hours-card__title">${icon.clock}${bi('hours.title')}</p>
          ${hoursList()}
          ${status()}
        </div>
      </div>
    </div>
  </section>

  <section class="chapter chapter--visit" id="visit" aria-labelledby="visit-title" style="--len:${len('visit')}">
    <div class="stage">
      <div class="stage__content visit" data-reveal>
        <div class="visit__panel" data-lenis-prevent>
          <p class="kicker">${bi('visit.kicker')}</p>
          <h2 class="title title--sm" id="visit-title">${bi('visit.title')}</h2>
          <ul class="info">
            <li class="info__row">${icon.pin}<div>
              <p class="info__label">${bi('visit.address')}</p>
              <address>${biObj(RESTAURANT.address)}</address>
              <a class="link" href="${esc(RESTAURANT.mapsUrl)}" target="_blank" rel="noopener">${bi('visit.directions')}${icon.arrow}</a>
            </div></li>
            <li class="info__row">${icon.clock}<div>
              <p class="info__label">${bi('hours.title')}</p>
              ${hoursList('hours hours--inline')}
              ${status()}
            </div></li>
            <li class="info__row">${icon.phone}<div>
              <p class="info__label">${bi('visit.phone')}</p>
              <a class="link link--strong" href="${telUrl()}">${esc(RESTAURANT.phone)}</a>
            </div></li>
          </ul>
          <div class="order">
            <div class="order__head">
              <h3 class="order__title">${bi('visit.order')}</h3>
              <button type="button" class="link" data-open="basket-sheet">${bi('visit.edit')}</button>
            </div>
            <ul class="lines" data-basket-lines></ul>
            <p class="lines-empty" data-basket-empty>${bi('basket.empty')}</p>
            <p class="total" data-basket-totalrow hidden><span>${bi('basket.total')}</span><strong data-basket-total></strong></p>
            ${waButton('btn--giant')}
          </div>
        </div>
      </div>
    </div>
  </section>
</main>`;

/** Attribution for photos by other people (required by their Creative Commons licences). */
const credits = () => {
  const items = DISHES.filter((d) => d.photo && d.credit);
  if (!items.length) return '';
  const link = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>`;
  return `<details class="credits">
    <summary>${bi('footer.credits')}</summary>
    <ul class="credits__list">${items
      .map((d) => `<li>${biObj(d.name)}: ${link(d.credit.source, d.credit.by)}, ${link(d.credit.licenseUrl, d.credit.license)}</li>`)
      .join('')}</ul>
    <p>${bi('footer.creditsNote')}</p>
  </details>`;
};

const footer = () => `
<footer class="foot">
  <p class="foot__brand">Ndolé House</p>
  <p>${bi('footer.line')} ${bi('footer.prices')}</p>
  <p><a href="${telUrl()}">${esc(RESTAURANT.phone)}</a> · <a data-wa href="${esc(waUrl(t('wa.empty')))}" target="_blank" rel="noopener">WhatsApp</a></p>
  <p class="foot__made">${bi('footer.builtBy')} <strong>${esc(SITE_CREDIT.studio)}</strong> (${esc(SITE_CREDIT.name)}) · <a href="mailto:${esc(SITE_CREDIT.email)}">${esc(SITE_CREDIT.email)}</a> · <a href="${esc(SITE_CREDIT.code)}" target="_blank" rel="noopener">${bi('footer.code')}</a></p>
  ${credits()}
</footer>`;

const sheets = () => `
<dialog class="sheet" id="menu-sheet" aria-labelledby="menu-sheet-title">
  <div class="sheet__inner">
    <header class="sheet__head">
      <h2 class="sheet__title" id="menu-sheet-title">${bi('sheet.menuTitle')}</h2>
      <button type="button" class="icon-btn" data-close ${ariaAttrs('sheet.close')}>${icon.close}</button>
    </header>
    <div class="sheet__body" data-lenis-prevent>
      <div class="sheet__hours">${status()}${hoursList('hours hours--inline')}</div>
      <ul class="rows">${DISHES.map(sheetRow).join('')}</ul>
      <p class="sheet__note">${bi('sheet.menuNote')}</p>
    </div>
    <footer class="sheet__foot">${waButton('btn--block')}</footer>
  </div>
</dialog>

<dialog class="sheet" id="basket-sheet" aria-labelledby="basket-sheet-title">
  <div class="sheet__inner">
    <header class="sheet__head">
      <h2 class="sheet__title" id="basket-sheet-title">${bi('basket.title')}</h2>
      <button type="button" class="icon-btn" data-close ${ariaAttrs('sheet.close')}>${icon.close}</button>
    </header>
    <div class="sheet__body" data-lenis-prevent>
      <ul class="lines" data-basket-lines></ul>
      <p class="lines-empty" data-basket-empty>${bi('basket.empty')}</p>
      <button type="button" class="link link--muted" data-basket-clear hidden>${bi('basket.clear')}</button>
    </div>
    <footer class="sheet__foot">
      <p class="total"><span>${bi('basket.total')}</span><strong data-basket-total>${biFn((l) => formatPrice(0, l))}</strong></p>
      ${waButton('btn--block')}
      <p class="sheet__note">${bi('basket.note')}</p>
    </footer>
  </div>
</dialog>`;

const loader = () => `
<div class="loader" id="loader" aria-hidden="true">
  <svg class="loader__svg" viewBox="0 0 120 120">
    <circle class="loader__track" cx="60" cy="60" r="52"/>
    <circle class="loader__ring" data-ring cx="60" cy="60" r="52"/>
    <g class="loader__steam"><path d="M50 47c-4-4 4-7 0-12"/><path d="M60 45c-4-4 4-7 0-12"/><path d="M70 47c-4-4 4-7 0-12"/></g>
    <path class="loader__bowl" d="M35 58h50c0 14-11 24-25 24S35 72 35 58Z"/>
    <path class="loader__foot" d="M50 85h20"/>
  </svg>
  <p class="loader__label">${bi('loader.label')}</p>
</div>`;

export function renderBody() {
  return [
    `<a class="skip" href="#menu" data-jump="menu">${bi('skip')}</a>`,
    loader(),
    header(),
    rail(),
    chapters(),
    footer(),
    sheets(),
    '<p class="sr-only" id="announcer" aria-live="polite"></p>',
  ].join('\n');
}

function jsonLd() {
  const groups = {};
  for (const [day, value] of Object.entries(RESTAURANT.hours)) {
    if (!value) continue;
    const k = value.join('-');
    (groups[k] ??= { opens: value[0], closes: value[1], days: [] }).days.push(day);
  }
  const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const prices = DISHES.map((d) => d.price);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: RESTAURANT.name,
    servesCuisine: ['Cameroonian', 'African'],
    telephone: RESTAURANT.phone,
    priceRange: `${Math.min(...prices)}–${Math.max(...prices)} XAF`,
    currenciesAccepted: 'XAF',
    address: {
      '@type': 'PostalAddress',
      streetAddress: RESTAURANT.district,
      addressLocality: RESTAURANT.locality,
      addressRegion: RESTAURANT.region,
      addressCountry: RESTAURANT.country,
    },
    hasMap: RESTAURANT.mapsUrl,
    openingHoursSpecification: Object.values(groups).map((g) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: g.days.map((d) => dayNames[d]),
      opens: g.opens,
      closes: g.closes,
    })),
    hasMenu: {
      '@type': 'Menu',
      inLanguage: ['en', 'fr'],
      hasMenuSection: {
        '@type': 'MenuSection',
        name: 'Menu',
        hasMenuItem: DISHES.map((d) => ({
          '@type': 'MenuItem',
          name: d.name.en,
          alternateName: d.name.fr,
          description: d.desc.en,
          offers: { '@type': 'Offer', price: d.price, priceCurrency: 'XAF' },
        })),
      },
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function renderHead() {
  const title = t('meta.title', DEFAULT_LANG);
  const description = t('meta.description', DEFAULT_LANG);
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<meta name="author" content="${esc(SITE_CREDIT.name)}, ${esc(SITE_CREDIT.studio)}">`,
    `<meta property="og:type" content="restaurant">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:locale" content="en_GB">`,
    `<meta property="og:locale:alternate" content="fr_FR">`,
    jsonLd(),
  ].join('\n    ');
}
