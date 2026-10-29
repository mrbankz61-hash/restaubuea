import './styles/main.css';
import { DISHES } from './data/menu.js';
import { STILLS, dishProgress } from './scene/timeline.js';
import { dishById, photoSrc } from './ui/format.js';
import { Basket, initBasketUI } from './ui/Basket.js';
import { initHours } from './ui/Hours.js';
import { initLangToggle } from './ui/LangToggle.js';
import { Loader } from './ui/Loader.js';
import { flyToBasket, initMenu } from './ui/Menu.js';

const html = document.documentElement;
const canvas = document.getElementById('gl');
const loader = new Loader(document.getElementById('loader'));
const params = new URLSearchParams(location.search);
const TIER_NAMES = ['high', 'medium', 'low', 'minimal'];

let world = null;
let journey = null;

// ---------------------------------------------------------------- UI (every mode)
initLangToggle();
initHours();
const basket = new Basket();
initBasketUI(basket, {
  onAdd: (id, button) => {
    const photo = dishById(id)?.photo;
    flyToBasket(flyOrigin(button), photo ? photoSrc(photo, 240) : null);
  },
});
initMenu({
  onHoverDish: (i) => world?.setHover(i),
  onDialog: (open) => (open ? journey?.pause() : journey?.resume()),
});
loader.set(0.12);

/** The flying plate starts at the 3D plate when it's on screen, otherwise at the button. */
function flyOrigin(button) {
  if (button.closest('dialog')) return null;
  const dish = button.closest('.dish');
  if (dish && world?.ready && html.classList.contains('mode-journey')) {
    const p = world.dishScreenPosition(Number(dish.dataset.index));
    if (p) return p;
  }
  const r = button.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// ---------------------------------------------------------------- Device capability
function probeGPU(allowSoftware) {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: !allowSoftware });
    if (!gl) return null;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String((info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { renderer };
  } catch {
    return null;
  }
}

const WEAK_GPU = /Mali-(4|T)|Mali-G(31|51|52|57|68)\b|Adreno \(TM\) ([3-5]\d\d|60\d|61[0-2])\b|PowerVR|SGX|Intel\(R\) HD Graphics [2-5]\d{2,3}\b|SwiftShader|llvmpipe|Software/i;

function detectTier(gpu) {
  const forced = params.get('quality');
  if (TIER_NAMES.includes(forced)) return forced;
  const memory = navigator.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const saveData = navigator.connection?.saveData === true;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = Math.min(screen.width, screen.height) < 600;
  if (saveData || memory <= 2 || cores <= 2 || WEAK_GPU.test(gpu.renderer)) return 'low';
  if (memory <= 4 || cores <= 4 || (coarse && smallScreen)) return 'medium';
  return 'high';
}

// ---------------------------------------------------------------- Modes
function teardown() {
  journey?.destroy();
  journey = null;
  world?.dispose();
  world = null;
}

/** Classic scrolling page (no WebGL, or after a failure). Still shows the full menu + WhatsApp. */
function runFlow({ noWebGL = false } = {}) {
  html.classList.remove('mode-journey', 'gl-ready');
  html.classList.add('mode-flow');
  if (noWebGL) html.classList.add('no-webgl');
  canvas.hidden = true;
  loader.done();
}

/** prefers-reduced-motion: render one composed still per chapter, then release the GPU. */
async function runStills() {
  runFlow();
  html.classList.add('mode-stills');
  try {
    const { World } = await import('./scene/World.js');
    const w = new World(canvas, { tier: 'high', dishes: DISHES });
    await w.init();
    for (const section of document.querySelectorAll('.chapter')) {
      const p = section.id === 'menu' ? dishProgress(0, DISHES.length) : STILLS[section.id];
      if (p == null) continue;
      section.style.setProperty('--still', `url("${w.renderStill(p)}")`);
      section.classList.add('has-still');
      await new Promise((r) => requestAnimationFrame(r));
    }
    w.dispose();
  } catch (err) {
    console.warn('[Ndolé House] Could not render scene stills.', err);
  }
}

async function runJourney(gpu) {
  html.classList.remove('mode-flow');
  html.classList.add('mode-journey');
  const cap = setTimeout(() => loader.done(), 1600);
  try {
    const [{ World }, { createJourney }] = await Promise.all([import('./scene/World.js'), import('./ui/Journey.js')]);
    loader.set(0.3);
    journey = createJourney({ dishCount: DISHES.length, onProgress: (p) => world?.setProgress(p) });
    world = new World(canvas, { tier: detectTier(gpu), dishes: DISHES, adaptive: !TIER_NAMES.includes(params.get('quality')) });
    world.setProgress(journey.progress);
    await world.init((f) => loader.set(0.3 + f * 0.68));
    world.start();
    html.classList.add('gl-ready');
    bindWorld();
    journey.refresh();
  } catch (err) {
    console.error('[Ndolé House] 3D journey unavailable, showing the classic page.', err);
    teardown();
    runFlow({ noWebGL: true });
  } finally {
    clearTimeout(cap);
    loader.done();
  }
}

function bindWorld() {
  let pending = false;
  window.addEventListener('resize', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      world?.resize();
    });
  });

  // Pause rendering entirely while the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (!world) return;
    if (document.hidden) world.stop();
    else world.start();
  });

  window.addEventListener(
    'pointermove',
    (e) => {
      if (!world || e.pointerType !== 'mouse') return;
      const overUI = Boolean(e.target.closest?.('a, button, .dish__card, dialog, .bar, .rail, .visit__panel, .hours-card'));
      world.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1), !overUI);
    },
    { passive: true },
  );
  document.addEventListener('mouseleave', () => world?.setPointer(0, 0, false));

  canvas.addEventListener('webglcontextlost', () => {
    setTimeout(() => {
      if (world?.renderer.getContext().isContextLost()) {
        teardown();
        runFlow({ noWebGL: true });
      }
    }, 3000);
  });
}

// ---------------------------------------------------------------- Boot
const forced = TIER_NAMES.includes(params.get('quality'));
const gpu = probeGPU(forced);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!gpu) runFlow({ noWebGL: true });
else if (reduceMotion) runStills();
else runJourney(gpu);
