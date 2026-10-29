// Scroll orchestration: Lenis smooth scroll → ScrollTrigger → one progress value (0…1) that
// drives the camera, plus the chapter copy, dish cards, the chapter rail and keyboard focus.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { CHAPTERS, chapterAnchor, chapterAt, dishProgress } from '../scene/timeline.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/** When each chapter's copy fades in and out, as local progress through its section. */
const REVEAL = {
  arrival: { out: [0.45, 0.85] },
  street: { in: [0.06, 0.22], out: [0.74, 0.96] },
  door: { in: [0.55, 0.66], out: [0.88, 1.0] },
  menu: { in: [0.0, 0.04], out: [0.96, 1.0] },
  kitchen: { in: [0.08, 0.26], out: [0.82, 0.98] },
  visit: { in: [0.3, 0.55] },
};

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createJourney({ dishCount, onProgress }) {
  const root = document.getElementById('journey');
  const html = document.documentElement;
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // Rail: active chapter + progress line.
  const railLinks = [...document.querySelectorAll('.rail [data-jump]')];
  const sections = CHAPTERS.map((c) => document.getElementById(c.id));
  const railFill = document.querySelector('.rail__fill');
  let railActive = '';
  const updateRail = (p) => {
    railFill?.style.setProperty('--p', p.toFixed(4));
    const id = chapterAt(p).id;
    if (id === railActive) return;
    railActive = id;
    html.dataset.chapter = id;
    sections.forEach((s) => s?.classList.toggle('is-current', s.id === id));
    for (const a of railLinks) {
      if (a.dataset.jump === id) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    }
  };

  let progress = 0;
  const report = (self) => {
    progress = self.progress;
    onProgress(progress);
    updateRail(progress);
  };
  const master = ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', onUpdate: report, onRefresh: report });

  // Chapter copy fades with the scroll (opacity only, so screen readers still read it).
  const timelines = [];
  const contents = [];
  for (const ch of CHAPTERS) {
    const section = document.getElementById(ch.id);
    const content = section?.querySelector('[data-reveal]');
    const cfg = REVEAL[ch.id];
    if (!content || !cfg) continue;
    contents.push(content);
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: true },
    });
    if (cfg.in) tl.fromTo(content, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: cfg.in[1] - cfg.in[0] }, cfg.in[0]);
    if (cfg.out) tl.to(content, { opacity: 0, y: -36, duration: cfg.out[1] - cfg.out[0] }, cfg.out[0]);
    tl.set({}, {}, 1);
    // Faded-out copy must not catch clicks meant for whatever is visible underneath.
    tl.eventCallback('onUpdate', () => content.classList.toggle('is-faded', Number(gsap.getProperty(content, 'opacity')) < 0.05));
    timelines.push(tl);
  }
  const cue = document.querySelector('[data-cue]');
  if (cue) {
    timelines.push(
      gsap.to(cue, { opacity: 0, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: () => `+=${window.innerHeight * 0.5}`, scrub: true } }),
    );
  }

  // One dish card at a time, in step with the plate under the camera.
  const dishes = [...document.querySelectorAll('#menu .dish')];
  const counter = document.querySelector('[data-dish-current]');
  let active = -1;
  const setActive = (i) => {
    if (i === active) return;
    active = i;
    dishes.forEach((d, k) => {
      d.classList.toggle('is-active', k === i);
      d.classList.toggle('is-past', k < i);
    });
    if (counter) counter.textContent = String(i + 1).padStart(2, '0');
  };
  setActive(0);
  const menuTrigger = ScrollTrigger.create({
    trigger: '#menu',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => setActive(Math.min(dishCount - 1, Math.floor(self.progress * dishCount))),
  });

  const yFor = (p) => master.start + p * (master.end - master.start);
  const scrollToProgress = (p, { fast = false } = {}) => {
    const distance = Math.abs(p - progress);
    lenis.scrollTo(yFor(p), { duration: fast ? 0.9 : Math.min(4.2, 1.1 + distance * 4), easing: easeInOut });
  };
  const scrollToChapter = (id, opts) => scrollToProgress(chapterAnchor(id, dishCount), opts);
  const scrollToDish = (i) => scrollToProgress(dishProgress(i, dishCount), { fast: true });

  const onJump = (event) => {
    const link = event.target.closest('[data-jump]');
    if (!link) return;
    event.preventDefault();
    scrollToChapter(link.dataset.jump);
    if (link.dataset.jump === 'menu') document.querySelector('#menu .dish.is-active .qty button')?.focus({ preventScroll: true });
  };
  document.addEventListener('click', onJump);

  // Keyboard users tabbing through the page travel through the journey with their focus.
  let pointerFocus = false;
  const onPointerDown = () => {
    pointerFocus = true;
    setTimeout(() => (pointerFocus = false), 500);
  };
  const onFocusIn = (event) => {
    if (pointerFocus) return;
    const dish = event.target.closest('.dish');
    if (dish) {
      const i = Number(dish.dataset.index);
      if (i !== active || chapterAt(progress).id !== 'menu') scrollToDish(i);
      return;
    }
    const section = event.target.closest('.chapter');
    if (section && chapterAt(progress).id !== section.id) scrollToChapter(section.id, { fast: true });
  };
  window.addEventListener('pointerdown', onPointerDown, true);
  root.addEventListener('focusin', onFocusIn);

  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return {
    lenis,
    get progress() {
      return progress;
    },
    scrollToChapter,
    scrollToDish,
    pause: () => lenis.stop(),
    resume: () => lenis.start(),
    refresh: () => ScrollTrigger.refresh(),
    destroy() {
      document.removeEventListener('click', onJump);
      window.removeEventListener('pointerdown', onPointerDown, true);
      root.removeEventListener('focusin', onFocusIn);
      timelines.forEach((tl) => {
        tl.scrollTrigger?.kill();
        tl.kill();
      });
      master.kill();
      menuTrigger.kill();
      gsap.set(contents, { clearProps: 'all' });
      contents.forEach((c) => c.classList.remove('is-faded'));
      if (cue) gsap.set(cue, { clearProps: 'all' });
      gsap.ticker.remove(raf);
      lenis.destroy();
      sections.forEach((s) => s?.classList.remove('is-current'));
    },
  };
}
