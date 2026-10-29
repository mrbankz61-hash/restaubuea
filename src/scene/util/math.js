export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const remap = (v, a, b) => clamp((v - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoothstep = (a, b, v) => smooth(remap(v, a, b));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const bell = (v, center, width) => Math.exp(-(((v - center) / width) ** 2));
export const inRanges = (p, ranges) => ranges.some(([a, b]) => p >= a && p <= b);

/** Deterministic PRNG so the town looks the same on every visit. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

/** Hash of a 3D point, stable across duplicated vertices. Returns [0, 1). */
export function hash3(x, y, z, seed = 0) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = smooth(xf);
  const v = smooth(yf);
  const a = hash3(xi, yi, 0);
  const b = hash3(xi + 1, yi, 0);
  const c = hash3(xi, yi + 1, 0);
  const d = hash3(xi + 1, yi + 1, 0);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

/** Fractal value noise in [0, 1]. */
export function fbm(x, y, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, y) * amp;
    norm += amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 - 9.7;
    amp *= 0.5;
  }
  return sum / norm;
}

/**
 * Monotone cubic interpolation (Fritsch–Carlson). Maps scroll progress to curve parameter
 * with continuous velocity, so the camera never jolts when chapters have different lengths.
 */
export class MonotoneCubic {
  constructor(xs, ys) {
    const n = xs.length;
    const dx = [];
    const m = [];
    for (let i = 0; i < n - 1; i++) {
      dx.push(xs[i + 1] - xs[i]);
      m.push((ys[i + 1] - ys[i]) / dx[i]);
    }
    const c1 = [m[0]];
    for (let i = 1; i < n - 1; i++) {
      const a = m[i - 1];
      const b = m[i];
      if (a * b <= 0) c1.push(0);
      else {
        const common = dx[i - 1] + dx[i];
        c1.push((3 * common) / ((common + dx[i]) / a + (common + dx[i - 1]) / b));
      }
    }
    c1.push(m[n - 2]);
    const c2 = [];
    const c3 = [];
    for (let i = 0; i < n - 1; i++) {
      const inv = 1 / dx[i];
      const common = c1[i] + c1[i + 1] - 2 * m[i];
      c2.push((m[i] - c1[i] - common) * inv);
      c3.push(common * inv * inv);
    }
    Object.assign(this, { xs, ys, c1, c2, c3 });
  }

  at(x) {
    const { xs, ys, c1, c2, c3 } = this;
    const last = xs.length - 1;
    if (x <= xs[0]) return ys[0];
    if (x >= xs[last]) return ys[last];
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    const d = x - xs[lo];
    return ys[lo] + c1[lo] * d + c2[lo] * d * d + c3[lo] * d * d * d;
  }
}
