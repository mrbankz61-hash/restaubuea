import {
  ACESFilmicToneMapping, PerspectiveCamera, Raycaster, SRGBColorSpace, Scene, Vector2, Vector3,
  WebGLRenderer,
} from 'three';
import { Atmosphere } from './Atmosphere.js';
import { CameraPath } from './CameraPath.js';
import { CHAPTER_BUILDERS } from './chapters/index.js';
import { Post } from './fx/Post.js';
import { createMaterials } from './materials.js';
import { disposeTree } from './util/geo.js';
import { damp } from './util/math.js';

/**
 * Quality tiers. `maxPixels` caps the drawing buffer so a 3x phone or a 4K monitor never
 * renders more pixels than the tier can fill at 60 fps.
 */
export const TIERS = {
  high: { maxDpr: 2, maxPixels: 3.7e6, post: true, bloomScale: 0.5, msaa: 4, particles: 1 },
  medium: { maxDpr: 1.5, maxPixels: 1.6e6, post: true, bloomScale: 0.35, msaa: 0, particles: 0.6 },
  low: { maxDpr: 1.5, maxPixels: 1.0e6, post: false, particles: 0.3 },
  minimal: { maxDpr: 1, maxPixels: 0.6e6, post: false, particles: 0.3 },
};
export const TIER_ORDER = ['high', 'medium', 'low', 'minimal'];

const DEG = Math.PI / 180;
const _v = new Vector3();

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function fontsReady(timeout) {
  if (!document.fonts?.load) return;
  await Promise.race([
    Promise.all([document.fonts.load('700 64px Fraunces'), document.fonts.load('600 32px Inter')]).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, timeout)),
  ]);
}

export class World {
  constructor(canvas, { tier = 'medium', dishes = [], adaptive = true, onTierChange } = {}) {
    this.canvas = canvas;
    this.adaptive = adaptive;
    this.dishes = dishes;
    this.onTierChange = onTierChange;
    this.tierName = TIERS[tier] ? tier : 'medium';
    this.tier = TIERS[this.tierName];

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: !this.tier.post,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor('#13120F', 1);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(50, 1, 0.1, 1700);
    this.scene.add(this.camera);
    this.raycaster = new Raycaster();

    this.shared = { time: { value: 0 }, pointScale: { value: 600 }, dpr: { value: 1 } };
    this.size = { w: 1, h: 1, dpr: 1 };
    this.baseFov = 50;
    this.progress = 0;
    this.target = 0;
    this.time = 0;
    this.exposure = 1;
    this.bloom = 0.6;
    this.pointer = new Vector2();
    this.parallax = new Vector2();
    this.hoverCard = -1;
    this.hoverCanvas = -1;
    this.camPos = new Vector3();
    this.camTarget = new Vector3();

    this.running = false;
    this.ready = false;
    this.t0 = performance.now();
    this.lastNow = 0;
    this.lastRender = 0;
    this.lastActive = 0;
    this.skip = false;
    this.perf = { phase: 'warmup', frames: 0, samples: [], ema: 16, slow: 0 };
    this.tick = this.tick.bind(this);
  }

  async init(onProgress = () => {}) {
    await fontsReady(700);
    onProgress(0.08);
    this.materials = createMaterials();
    this.atmosphere = new Atmosphere(this.scene, this.shared);
    this.path = new CameraPath(this.dishes.length);

    const ctx = {
      scene: this.scene,
      camera: this.camera,
      shared: this.shared,
      materials: this.materials,
      atmosphere: this.atmosphere,
      dishes: this.dishes,
    };
    this.chapters = [];
    for (let i = 0; i < CHAPTER_BUILDERS.length; i++) {
      this.chapters.push(new CHAPTER_BUILDERS[i](ctx));
      onProgress(0.1 + ((i + 1) / CHAPTER_BUILDERS.length) * 0.6);
      await nextFrame();
    }
    this.table = this.chapters.find((c) => typeof c.pick === 'function');
    this.portal = this.chapters.find((c) => 'flashAmount' in c);

    this.setupPost();
    this.resize();
    this.setDensity(this.tier.particles);

    // Compile every shader up front (all chapters visible) so scrolling never stalls on a compile.
    this.scene.traverse((o) => (o.visible = true));
    this.atmosphere.update(0, 0);
    if (this.renderer.compileAsync) await this.renderer.compileAsync(this.scene, this.camera);
    else this.renderer.compile(this.scene, this.camera);
    onProgress(0.92);

    this.progress = this.target;
    this.update(0);
    this.render();
    this.ready = true;
    onProgress(1);
  }

  setupPost() {
    this.post?.dispose();
    this.post = this.tier.post
      ? new Post(this.renderer, this.scene, this.camera, { bloomScale: this.tier.bloomScale, msaa: this.tier.msaa })
      : null;
    document.documentElement.dataset.quality = this.tierName;
  }

  setTier(name) {
    if (!TIERS[name] || name === this.tierName) return;
    const hadPost = Boolean(this.post);
    this.tierName = name;
    this.tier = TIERS[name];
    if (this.tier.post || hadPost) this.setupPost();
    document.documentElement.dataset.quality = name;
    this.resize();
    this.setDensity(this.tier.particles);
    this.onTierChange?.(name);
  }

  downgrade() {
    const next = TIER_ORDER[TIER_ORDER.indexOf(this.tierName) + 1];
    if (!next) return false;
    this.setTier(next);
    return true;
  }

  setDensity(f) {
    for (const ch of this.chapters ?? []) ch.setDensity?.(f);
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const dpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, this.tier.maxDpr, Math.sqrt(this.tier.maxPixels / (w * h))));
    this.size = { w, h, dpr };
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.post?.setSize(w, h, dpr);
    this.camera.aspect = w / h;
    // Keep at least ~46° horizontally so portrait phones still see the street and the plates.
    this.baseFov = Math.min(82, Math.max(50, (2 * Math.atan(Math.tan(23 * DEG) / this.camera.aspect)) / DEG));
    this.shared.dpr.value = dpr;
    if (this.ready && !this.running) {
      this.update(0);
      this.render();
    }
  }

  setProgress(p) {
    this.target = Math.min(1, Math.max(0, p));
  }

  /** Normalised pointer in [-1, 1]; drives the ±2° camera parallax and plate hover picking. */
  setPointer(x, y, pick = true) {
    this.pointer.set(x, y);
    this.lastActive = performance.now();
    if (!pick || !this.table) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.table.pick(this.raycaster.ray, this.progress);
    if (hit !== this.hoverCanvas) {
      this.hoverCanvas = hit;
      this.canvas.style.cursor = hit >= 0 ? 'grab' : '';
      this.applyHover();
    }
  }

  setHover(index) {
    this.hoverCard = index ?? -1;
    this.applyHover();
  }

  applyHover() {
    this.table?.setHover(this.hoverCard >= 0 ? this.hoverCard : this.hoverCanvas);
  }

  /** Screen position (CSS px) of a dish's 3D plate, or null when it is not on screen. */
  dishScreenPosition(index) {
    if (!this.ready || !this.table) return null;
    const p = this.table.dishWorldPosition(index, _v, this.progress);
    if (!p) return null;
    p.project(this.camera);
    if (p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) return null;
    return { x: ((p.x + 1) / 2) * this.size.w, y: ((1 - p.y) / 2) * this.size.h };
  }

  start() {
    if (this.running || !this.ready) return;
    this.running = true;
    this.lastNow = performance.now();
    this.lastRender = this.lastNow;
    this.renderer.setAnimationLoop(this.tick);
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  tick(now) {
    const dt = Math.min(0.1, Math.max(0, (now - this.lastNow) / 1000));
    this.lastNow = now;
    this.measure(dt);

    if (Math.abs(this.target - this.progress) > 1e-5) this.lastActive = now;
    // Nothing moving for a while: drop to 30 fps to save battery. Steam and embers still drift.
    const idle = now - this.lastActive > 2500 && (this.perf.phase === 'watch' || !this.adaptive);
    this.skip = idle ? !this.skip : false;
    if (this.skip) return;

    const step = Math.min(0.1, (now - this.lastRender) / 1000);
    this.lastRender = now;
    this.time = (now - this.t0) / 1000;
    this.progress = damp(this.progress, this.target, 6.5, step);
    if (Math.abs(this.target - this.progress) < 1e-5) this.progress = this.target;
    this.update(step);
    this.render();
  }

  update(dt) {
    const p = this.progress;
    const cam = this.camera;
    this.shared.time.value = this.time;

    this.path.evaluate(p, this.camPos, this.camTarget);
    cam.position.copy(this.camPos);
    cam.lookAt(this.camTarget);
    this.parallax.x = damp(this.parallax.x, this.pointer.x, 3, dt);
    this.parallax.y = damp(this.parallax.y, this.pointer.y, 3, dt);
    cam.rotateY(-this.parallax.x * 2 * DEG);
    cam.rotateX(this.parallax.y * 1.5 * DEG);

    const state = this.atmosphere.update(p, this.time);
    this.atmosphere.followCamera(cam);
    for (const ch of this.chapters) ch.update(p, this.time, dt, state);

    const flash = this.portal?.flashAmount ?? 0;
    cam.fov = this.baseFov + (this.portal?.fovKick ?? 0);

    // Shift the projection centre so the plate (or the map pin) sits beside the HTML card.
    const { w, h } = this.size;
    const landscape = w / h >= 0.9;
    const fx = landscape ? state.frameX : 0;
    const fy = landscape ? 0 : state.frameY;
    if (!cam.view) cam.setViewOffset(w, h, 0, 0, w, h);
    Object.assign(cam.view, {
      enabled: fx !== 0 || fy !== 0,
      fullWidth: w,
      fullHeight: h,
      offsetX: fx * w,
      offsetY: fy * h,
      width: w,
      height: h,
    });
    cam.updateProjectionMatrix();

    this.shared.pointScale.value = (h * this.size.dpr) / (2 * Math.tan((cam.fov * DEG) / 2));
    this.exposure = state.exposure + flash * 0.2;
    this.bloom = state.bloom + flash * 0.55;
    this.renderer.toneMappingExposure = this.exposure;
  }

  render() {
    if (this.post) this.post.render(this.time, this.bloom);
    else this.renderer.render(this.scene, this.camera);
  }

  /** Frame-time probe: the first second decides the tier, then a watchdog keeps 50+ fps. */
  measure(dt) {
    const perf = this.perf;
    if (!this.adaptive || dt <= 0 || dt > 0.25 || document.hidden) return;
    const ms = dt * 1000;
    if (perf.phase === 'warmup') {
      if (++perf.frames > 10) {
        perf.phase = 'probe';
        perf.samples.length = 0;
      }
      return;
    }
    if (perf.phase === 'probe') {
      perf.samples.push(ms);
      if (perf.samples.length >= 45) {
        const sorted = [...perf.samples].sort((a, b) => a - b);
        const median = sorted[sorted.length >> 1];
        perf.phase = 'watch';
        perf.ema = median;
        if (median > 21 && this.downgrade()) {
          perf.phase = 'warmup';
          perf.frames = 0;
        }
      }
      return;
    }
    perf.ema = perf.ema * 0.94 + ms * 0.06;
    if (perf.ema > 26) {
      perf.slow += dt;
      if (perf.slow > 2.5 && this.downgrade()) {
        perf.slow = 0;
        perf.ema = 16;
      }
    } else {
      perf.slow = Math.max(0, perf.slow - dt * 0.5);
    }
  }

  /** Renders one composed frame at `p` and returns it as an image (reduced-motion stills). */
  renderStill(p) {
    this.progress = this.target = p;
    this.time = 6;
    this.pointer.set(0, 0);
    this.parallax.set(0, 0);
    this.update(0);
    this.render();
    return this.canvas.toDataURL('image/jpeg', 0.86);
  }

  dispose() {
    this.stop();
    this.chapters?.forEach((c) => c.dispose?.());
    disposeTree(this.scene);
    this.post?.dispose();
    Object.values(this.materials ?? {}).forEach((m) => m.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.ready = false;
  }
}
