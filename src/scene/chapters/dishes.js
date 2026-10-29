// Procedural low-poly dishes. Each builder pushes vertex-coloured parts in plate space
// (plate base at y = 0, ~0.56 radius) so a whole dish merges into one draw call.
import {
  BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, LatheGeometry,
  SphereGeometry, TorusGeometry, Vector2,
} from 'three';
import { hdr, jitter, merge, part, T } from '../util/geo.js';
import { hash3, rng } from '../util/math.js';

const V = (pts) => pts.map(([x, y]) => new Vector2(x, y));
const pick = (arr, x, y, z, seed = 0) => arr[Math.floor(hash3(x * 53, y * 53, z * 53, seed) * arr.length * 0.9999)];

function plate(parts, { rim = '#2f6b3a', body = '#f1e9da', r = 0.56 } = {}) {
  const k = r / 0.56;
  const profile = [[0, 0], [0.3, 0], [0.34, 0.012], [0.47, 0.042], [0.55, 0.068], [0.565, 0.078], [0.548, 0.086], [0.46, 0.06], [0.33, 0.03], [0, 0.028]];
  const g = new LatheGeometry(V(profile.map(([x, y]) => [x * k, y])), 32);
  parts.push(part(g, (x, y, z) => (Math.hypot(x, z) > 0.5 * k ? rim : body), null, { flat: false, perFace: true }));
}

function mound(parts, { r, squash, x, z, colors, seed, y = 0.03, detail = 2 }) {
  const g = new IcosahedronGeometry(r, detail);
  jitter(g, r * 0.32, seed);
  parts.push(part(g, (cx, cy, cz) => pick(colors, cx, cy, cz, seed), T(x, y + r * squash * 0.55, z, 0, 0, 0, 1, squash, 1)));
}

const BUILDERS = {
  ndole(parts, rand) {
    plate(parts, { rim: '#2f6b3a' });
    mound(parts, { r: 0.27, squash: 0.42, x: -0.1, z: 0.02, seed: 3, colors: ['#1f4a24', '#2a5a2c', '#244f29', '#2f5a22', '#5a4a2a', '#1f4a24'] });
    for (let i = 0; i < 12; i++) {
      parts.push(part(new IcosahedronGeometry(0.018, 0), '#a07a42', T(-0.1 + (rand() - 0.5) * 0.36, 0.12 + rand() * 0.025, (rand() - 0.5) * 0.36)));
    }
    for (let i = 0; i < 3; i++) {
      parts.push(part(new TorusGeometry(0.045, 0.02, 5, 8, Math.PI * 1.3), hdr('#f07a48', 1.05), T(-0.17 + i * 0.08, 0.145, -0.06 + (i % 2) * 0.11, Math.PI / 2, 0, rand() * 6)));
    }
    for (let i = 0; i < 6; i++) {
      const a = -0.95 + i * 0.38;
      parts.push(part(new SphereGeometry(0.075, 7, 5), (x, y) => (Math.abs(y) > 0.03 ? '#e8b04b' : '#b8641c'), T(0.3 + Math.cos(a) * 0.06, 0.05 + i * 0.004, Math.sin(a) * 0.22, 0, -a, 0, 1.5, 0.42, 0.85)));
    }
    return { hot: true, top: 0.16 };
  },

  eru(parts, rand) {
    plate(parts, { rim: '#c2410c' });
    mound(parts, { r: 0.26, squash: 0.38, x: -0.1, z: 0.03, seed: 7, colors: ['#20401c', '#2b4a1a', '#3a5a1c', '#4a5a1a', '#1d3a1a'] });
    for (let i = 0; i < 7; i++) {
      parts.push(part(new CylinderGeometry(0.03, 0.03, 0.006, 6), hdr('#d9721c', 1.1), T(-0.1 + (rand() - 0.5) * 0.3, 0.118, 0.03 + (rand() - 0.5) * 0.3)));
    }
    for (let i = 0; i < 5; i++) {
      parts.push(part(new BoxGeometry(0.06, 0.022, 0.04), i % 2 ? '#7a4a2a' : '#9a6a44', T(-0.1 + (rand() - 0.5) * 0.3, 0.12, (rand() - 0.5) * 0.3, 0, rand() * 3, 0)));
    }
    parts.push(part(new BoxGeometry(0.09, 0.03, 0.05), '#5a3418', T(-0.02, 0.13, -0.1, 0, 0.6, 0.2)));
    parts.push(part(new SphereGeometry(0.15, 12, 9), '#efe6cf', T(0.25, 0.12, 0.05, 0, 0, 0, 1, 0.82, 1), { flat: false }));
    return { hot: true, top: 0.15 };
  },

  fish(parts, rand, { onPlate = true } = {}) {
    if (onPlate) plate(parts, { rim: '#e8b04b' });
    const yaw = 0.35;
    const ax = Math.cos(yaw);
    const az = -Math.sin(yaw);
    parts.push(part(new SphereGeometry(1, 14, 8), (x, y) => (Math.sin(x * 26) > 0.55 && y > 0 ? '#3a1d0c' : y > 0.3 ? '#a8622a' : '#8a4a1e'), T(-0.02, 0.085, 0, 0, yaw, 0, 0.36, 0.1, 0.15)));
    parts.push(part(new ConeGeometry(0.12, 0.2, 4), '#6e3614', T(-0.02 - ax * 0.42, 0.085, -az * 0.42, 0, yaw, -Math.PI / 2, 0.25, 1, 1)));
    parts.push(part(new SphereGeometry(0.024, 6, 4), '#f1e9da', T(-0.02 + ax * 0.26, 0.15, az * 0.26 - 0.035)));
    parts.push(part(new SphereGeometry(0.012, 5, 4), '#141210', T(-0.02 + ax * 0.265, 0.165, az * 0.265 - 0.035)));
    for (let i = 0; i < 3; i++) {
      parts.push(part(new TorusGeometry(0.045, 0.009, 4, 10), '#eedcee', T(-0.1 + i * 0.1, 0.19, -0.01 + (i % 2) * 0.03, Math.PI / 2 + 0.15, 0, 0)));
    }
    if (onPlate) {
      for (let i = 0; i < 3; i++) parts.push(part(new CylinderGeometry(0.05, 0.05, 0.015, 10), '#c8321c', T(0.28 + i * 0.05, 0.05, -0.26 + i * 0.03, 0.2, 0, 0)));
      for (let i = 0; i < 3; i++) parts.push(part(new CylinderGeometry(0.022, 0.022, 0.3, 6), i % 2 ? '#4a6a2a' : '#557a30', T(0.05 + i * 0.05, 0.05, 0.3, 0, 0.3, Math.PI / 2)));
      parts.push(part(new CylinderGeometry(0.03, 0.03, 0.01, 8), '#3c7a3c', T(-0.3, 0.05, -0.25)));
    }
    return { hot: true, top: 0.18 };
  },

  soya(parts, rand, { onPlate = true, sticks = 3 } = {}) {
    if (onPlate) {
      plate(parts, { rim: '#2f6b3a' });
      parts.push(part(new BoxGeometry(0.66, 0.006, 0.52), '#c8a274', T(0, 0.034, 0, 0, 0.2, 0)));
    }
    const meat = ['#6e2f14', '#8a3d18', '#a24d1f', '#5a2510'];
    for (let s = 0; s < sticks; s++) {
      const z = -0.15 + s * 0.15;
      const yaw = 0.12 * (s - 1) + 0.1;
      const c = Math.cos(yaw);
      const sn = Math.sin(yaw);
      parts.push(part(new CylinderGeometry(0.008, 0.008, 0.78, 5), '#d8b98a', T(0, 0.078, z, 0, yaw, Math.PI / 2)));
      for (let k = 0; k < 6; k++) {
        const dx = -0.26 + k * 0.1;
        const g = new DodecahedronGeometry(0.048, 0);
        jitter(g, 0.018, s * 10 + k);
        parts.push(part(g, (x, y, zz) => pick(meat, x, y, zz, k), T(dx * c, 0.08, z - dx * sn, rand(), rand(), rand())));
      }
    }
    if (onPlate) {
      for (let i = 0; i < 3; i++) parts.push(part(new TorusGeometry(0.04, 0.008, 4, 10), '#efe0f0', T(0.2 - i * 0.07, 0.11, 0.24, Math.PI / 2, 0, 0)));
      for (let i = 0; i < 3; i++) parts.push(part(new CylinderGeometry(0.012, 0.006, 0.1, 5), '#c8231c', T(-0.25 + i * 0.05, 0.11, 0.23, 0, i, Math.PI / 2)));
      parts.push(part(new ConeGeometry(0.07, 0.04, 7), '#b5651d', T(-0.3, 0.06, -0.24)));
    }
    return { hot: true, top: 0.14 };
  },

  achu(parts, rand) {
    plate(parts, { rim: '#c2410c' });
    parts.push(part(new SphereGeometry(0.5, 10, 4), (x, y, z) => (Math.abs(z) < 0.06 ? '#5a8a3a' : '#3d7a3a'), T(0, 0.032, 0, 0, 0.4, 0, 0.92, 0.012, 0.6)));
    const well = new LatheGeometry(V([[0, 0.075], [0.08, 0.08], [0.115, 0.145], [0.2, 0.13], [0.27, 0.075], [0.3, 0.02], [0.3, 0]]), 16);
    parts.push(part(well, (x, y, z) => pick(['#d8c07a', '#d0b56e', '#dcc788'], x, y, z, 2), T(-0.06, 0.035, 0)));
    parts.push(part(new CylinderGeometry(0.1, 0.1, 0.012, 16), hdr('#f0a01e', 1.15), T(-0.06, 0.145, 0)));
    parts.push(part(new CylinderGeometry(0.12, 0.12, 0.01, 14), hdr('#e89418', 1.05), T(0.28, 0.045, 0.14, 0, 0, 0, 1, 1, 0.7)));
    for (let i = 0; i < 6; i++) {
      parts.push(part(new BoxGeometry(0.07, 0.025, 0.035), i % 2 ? '#6a3a1e' : '#8a5a34', T(0.26 + (rand() - 0.5) * 0.14, 0.06, -0.13 + (rand() - 0.5) * 0.12, 0, rand() * 3, 0)));
    }
    return { hot: true, top: 0.17 };
  },

  puffpuff(parts) {
    plate(parts, { rim: '#2c6e78' });
    const spots = [[-0.19, -0.09], [-0.06, -0.17], [-0.21, 0.08], [-0.08, 0.05], [-0.14, -0.02], [-0.03, 0.17], [-0.12, -0.1]];
    spots.forEach(([x, z], i) => {
      const g = new IcosahedronGeometry(0.078, 1);
      jitter(g, 0.02, i + 1);
      parts.push(part(g, (cx, cy, cz) => (cy < -0.02 ? '#9a5a1e' : hash3(cx * 90, cy * 90, cz * 90) > 0.5 ? '#d89a3a' : '#c8862e'), T(x, i > 4 ? 0.165 : 0.1, z)));
    });
    const bowl = new LatheGeometry(V([[0, 0], [0.1, 0], [0.16, 0.05], [0.185, 0.105], [0.172, 0.108], [0.15, 0.06], [0, 0.048]]), 18);
    parts.push(part(bowl, (x, y, z) => (Math.hypot(x, z) > 0.17 ? '#2c6e78' : '#f1e9da'), T(0.22, 0.03, 0.05), { flat: false, perFace: true }));
    mound(parts, { r: 0.15, squash: 0.36, x: 0.22, z: 0.05, y: 0.075, seed: 9, detail: 1, colors: ['#6b2a16', '#7a3018', '#5a2212', '#8a3a1a', '#a8421a'] });
    return { hot: true, top: 0.2 };
  },

  juice(parts, rand, { tint = '#8d1634' } = {}) {
    parts.push(part(new CylinderGeometry(0.2, 0.2, 0.022, 18), '#8a5a34', T(0, 0.011, 0)));
    parts.push(part(new CylinderGeometry(0.108, 0.098, 0.27, 18), hdr(tint, 1.2), T(0, 0.17, 0), { flat: false }));
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1;
      parts.push(part(new BoxGeometry(0.06, 0.05, 0.06), hdr('#e8f4f6', 1.1), T(Math.cos(a) * 0.04, 0.3, Math.sin(a) * 0.04, rand(), rand(), rand())));
    }
    parts.push(part(new CylinderGeometry(0.009, 0.009, 0.46, 6, 8), (x, y) => (Math.floor(y * 20) % 2 ? '#c2410c' : '#f4ead5'), T(0.04, 0.34, 0.02, 0, 0, -0.25)));
    parts.push(part(new CylinderGeometry(0.048, 0.048, 0.012, 10), tint === '#8d1634' ? '#3c7a3c' : '#e8d84a', T(0.118, 0.33, 0, Math.PI / 2, 0, 0)));
    const glass = new LatheGeometry(V([[0, 0], [0.118, 0], [0.128, 0.02], [0.136, 0.33], [0.142, 0.345]]), 20);
    return { hot: false, top: 0.34, glass: merge([part(glass, '#e4f0f2', T(0, 0.022, 0), { flat: false })]) };
  },

  cloche(parts) {
    plate(parts, { rim: '#e8b04b' });
    const dome = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 9) * (Math.PI / 2);
      return [Math.cos(a) * 0.42, Math.sin(a) * 0.3];
    });
    parts.push(part(new LatheGeometry(V(dome), 24), '#c9c6bd', T(0, 0.03, 0), { flat: false }));
    parts.push(part(new SphereGeometry(0.04, 8, 6), '#e8b04b', T(0, 0.36, 0)));
    return { hot: true, top: 0.34 };
  },
};

const hashString = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** Builds the 3D dish for a menu entry. Unknown models get a covered plate. */
export function buildDish(dish) {
  const builder = BUILDERS[dish.model] ?? BUILDERS.cloche;
  const parts = [];
  const info = builder(parts, rng(hashString(dish.id)), { tint: dish.tint ?? '#8d1634' }) ?? {};
  return { geometry: merge(parts), glass: info.glass ?? null, hot: info.hot !== false, top: info.top ?? 0.15 };
}

/** Food without a plate, placed with `matrix` into an existing parts list (grill, counter). */
export function foodInto(parts, model, matrix, opts = {}) {
  const tmp = [];
  BUILDERS[model](tmp, rng(hashString(model) + (opts.seed ?? 0)), { ...opts, onPlate: false });
  for (const g of tmp) parts.push(g.applyMatrix4(matrix));
}
