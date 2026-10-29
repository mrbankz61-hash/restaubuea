import {
  BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group,
  IcosahedronGeometry, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial,
  PlaneGeometry, Quaternion, SphereGeometry, Vector3,
} from 'three';
import { Embers } from '../fx/Embers.js';
import { GlowPoints } from '../fx/GlowPoints.js';
import { glowMaterial, PALETTE } from '../materials.js';
import { atlasQuad, canvasTexture, freeze, hdr, merge, part, T } from '../util/geo.js';
import { inRanges, rng } from '../util/math.js';
import { OUTSIDE } from './Mountain.js';

const Z_START = 14;
const Z_END = -59.5; // the cross road in front of the restaurant starts here
const FACADE = 6.6;

const SIGNS = [
  { text: 'CALL BOX', bg: '#e8b04b', fg: '#1d1a14' },
  { text: 'PHARMACIE', bg: '#2f6b3a', fg: '#f4ead5', cross: true },
  { text: 'SOYA ★ GRILL', bg: '#c2410c', fg: '#fff3dc' },
  { text: 'BOUTIQUE', bg: '#2c6e78', fg: '#f4ead5' },
  { text: 'COIFFURE', bg: '#6a3a7a', fg: '#f7e3ff' },
  { text: 'BOULANGERIE', bg: '#f4ead5', fg: '#6b2a10' },
  { text: 'QUINCAILLERIE', bg: '#2b4a8a', fg: '#ffffff' },
  { text: 'SNACK BAR', bg: '#e0571d', fg: '#13120f' },
];

function signAtlas() {
  return canvasTexture(1024, 512, (ctx) => {
    SIGNS.forEach((s, i) => {
      const x = (i % 2) * 512;
      const y = Math.floor(i / 2) * 128;
      ctx.fillStyle = s.bg;
      ctx.fillRect(x, y, 512, 128);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 8;
      ctx.strokeRect(x + 6, y + 6, 500, 116);
      let cx = x + 256;
      if (s.cross) {
        ctx.fillStyle = '#f4ead5';
        ctx.fillRect(x + 40, y + 50, 56, 28);
        ctx.fillRect(x + 54, y + 36, 28, 56);
        cx += 40;
      }
      let size = 64;
      const font = () => `700 ${size}px Inter, "Helvetica Neue", Arial, sans-serif`;
      ctx.font = font();
      while (ctx.measureText(s.text).width > (s.cross ? 360 : 440) && size > 28) {
        size -= 2;
        ctx.font = font();
      }
      ctx.fillStyle = s.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, cx, y + 68);
    });
  });
}

const slotUV = (i) => {
  const u0 = (i % 2) * 0.5;
  const v1 = 1 - Math.floor(i / 2) * 0.25;
  return [u0 + 0.01, v1 - 0.25 + 0.01, u0 + 0.49, v1 - 0.01];
};

/** Moto-taxi + rider, facing +Z, wheels on y = 0. */
function motoGeometry() {
  const p = [];
  const wheel = new CylinderGeometry(0.32, 0.32, 0.1, 10);
  p.push(part(wheel, '#141312', T(0, 0.32, -0.56, 0, 0, Math.PI / 2)));
  p.push(part(wheel, '#141312', T(0, 0.32, 0.6, 0, 0, Math.PI / 2)));
  p.push(part(new BoxGeometry(0.3, 0.32, 0.95), '#9a2e16', T(0, 0.64, 0.02)));
  p.push(part(new BoxGeometry(0.34, 0.1, 0.62), '#1b1918', T(0, 0.84, -0.22)));
  p.push(part(new BoxGeometry(0.06, 0.62, 0.06), '#2a2826', T(0, 0.62, 0.56, -0.25)));
  p.push(part(new BoxGeometry(0.72, 0.05, 0.05), '#2a2826', T(0, 1.06, 0.46)));
  p.push(part(new BoxGeometry(0.18, 0.15, 0.1), '#d8d0c0', T(0, 0.92, 0.66)));
  // Rider
  p.push(part(new BoxGeometry(0.44, 0.62, 0.3), '#3a5f8a', T(0, 1.28, -0.16, 0.22)));
  p.push(part(new IcosahedronGeometry(0.15, 0), '#3b2416', T(0, 1.72, -0.04)));
  p.push(part(new BoxGeometry(0.1, 0.1, 0.62), '#3a5f8a', T(0.2, 1.3, 0.16, 0.3)));
  p.push(part(new BoxGeometry(0.1, 0.1, 0.62), '#3a5f8a', T(-0.2, 1.3, 0.16, 0.3)));
  p.push(part(new BoxGeometry(0.14, 0.5, 0.16), '#23201e', T(0.2, 0.78, 0.0, 0.5)));
  p.push(part(new BoxGeometry(0.14, 0.5, 0.16), '#23201e', T(-0.2, 0.78, 0.0, 0.5)));
  // Passenger
  p.push(part(new BoxGeometry(0.42, 0.58, 0.28), '#b8862e', T(0, 1.24, -0.52, 0.08)));
  p.push(part(new IcosahedronGeometry(0.14, 0), '#2e1c12', T(0, 1.66, -0.5)));
  return merge(p);
}

function palm(parts, x, z, h, seed) {
  const r = rng(seed);
  let y = 0;
  let ox = 0;
  const lean = r.range(-0.08, 0.08);
  for (let i = 0; i < 6; i++) {
    const seg = h / 6;
    parts.push(part(new CylinderGeometry(0.13 - i * 0.008, 0.17 - i * 0.008, seg, 6), i % 2 ? '#5a4a3a' : '#4d3f31', T(x + ox, y + seg / 2, z, 0, 0, -lean)));
    y += seg;
    ox += lean * seg;
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.3;
    const leaf = new ConeGeometry(0.32, 2.6, 4);
    leaf.translate(0, 1.3, 0);
    parts.push(part(leaf, i % 2 ? '#2f6b3a' : '#24552d', T(x + ox, y, z, 0, a, 1.15 + r() * 0.35, 0.18, 1, 1)));
  }
  for (let i = 0; i < 3; i++) parts.push(part(new SphereGeometry(0.11, 5, 4), '#5b4a22', T(x + ox + Math.cos(i * 2.1) * 0.18, y - 0.15, z + Math.sin(i * 2.1) * 0.18)));
}

/** Piecewise-linear route sampled by distance, so motos glide in from the cross street. */
class Route {
  constructor(points) {
    this.points = points.map(([x, z]) => new Vector3(x, 0, z));
    this.lengths = [0];
    for (let i = 1; i < this.points.length; i++) this.lengths.push(this.lengths[i - 1] + this.points[i].distanceTo(this.points[i - 1]));
    this.total = this.lengths[this.lengths.length - 1];
  }

  sample(d, outPos) {
    d = ((d % this.total) + this.total) % this.total;
    let i = 1;
    while (i < this.lengths.length - 1 && this.lengths[i] < d) i++;
    const a = this.points[i - 1];
    const b = this.points[i];
    const t = (d - this.lengths[i - 1]) / (this.lengths[i] - this.lengths[i - 1]);
    outPos.lerpVectors(a, b, t);
    return Math.atan2(b.x - a.x, b.z - a.z);
  }
}

/** Molyko after dark: shops, signs, street lamps, palms, a soya stand and moto-taxis. */
export class Street {
  constructor({ scene, shared, materials }) {
    this.group = new Group();
    this.group.name = 'street';
    scene.add(this.group);
    const rand = rng(42);
    const solid = [];
    const lit = [];

    // Road, centre dashes, sidewalks and curbs.
    const len = Z_START - Z_END;
    const midZ = (Z_START + Z_END) / 2;
    solid.push(part(new BoxGeometry(8, 0.04, len), (x, y, z) => (Math.sin(z * 1.7 + x * 0.6) > 0.82 ? '#332e2a' : PALETTE.asphalt), T(0, -0.02, midZ)));
    for (let z = Z_START - 2; z > Z_END + 1; z -= 4) solid.push(part(new BoxGeometry(0.14, 0.02, 1.7), '#8f8574', T(0, 0.01, z)));
    for (const s of [-1, 1]) {
      solid.push(part(new BoxGeometry(2.5, 0.14, len), (x, y, z) => (Math.floor(z / 1.5) % 2 ? '#574c42' : '#5f5348'), T(s * 5.25, 0.07, midZ)));
      solid.push(part(new BoxGeometry(0.12, 0.16, len), '#8a7d6e', T(s * 4.06, 0.08, midZ)));
    }

    // Buildings: painted concrete blocks with corrugated roofs, shopfronts and windows.
    const signSpots = [];
    for (const side of [-1, 1]) {
      let z = 12;
      while (z > -57.5) {
        const width = Math.min(rand.range(5, 8.5), z + 57.5);
        if (width < 3) break;
        const zc = z - width / 2;
        const floors = rand() < 0.3 ? 1 : rand() < 0.7 ? 2 : 3;
        const h = floors * 2.9 + 0.5 + rand.range(0, 0.5);
        const depth = rand.range(6, 8);
        const xc = side * (FACADE + depth / 2);
        const wall = rand.pick(PALETTE.walls);
        solid.push(part(new BoxGeometry(depth, h, width), wall, T(xc, h / 2, zc)));
        solid.push(part(new BoxGeometry(depth + 0.1, 0.5, width + 0.1), '#3b322b', T(xc, 0.25, zc)));
        // Mono-pitch corrugated roof sloping away from the street.
        const roof = rand.pick(PALETTE.roofs);
        const roofGeo = new BoxGeometry(depth + 0.8, 0.12, width + 0.5, 1, 1, 8);
        solid.push(part(roofGeo, (x, y, zz) => (Math.round(zz * 3) % 2 ? roof : '#5a4a40'), T(xc, h + 0.25, zc, 0, 0, side * 0.08)));
        // Shopfront: lit, or a rolled-down shutter.
        const shopW = width * rand.range(0.55, 0.75);
        const shopLit = rand() < 0.68;
        const face = T(side * (FACADE - 0.03), 1.35, zc, 0, -side * Math.PI / 2);
        if (shopLit) {
          const warm = rand.pick(['#ffb46b', '#ffd59a', '#ff9f5a', '#fff0d0']);
          lit.push(part(new PlaneGeometry(shopW, 2.2), hdr(warm, rand.range(0.95, 1.6)), face));
        } else {
          solid.push(part(new PlaneGeometry(shopW, 2.2, 1, 10), (x, y) => (Math.round(y * 9) % 2 ? '#4a4642' : '#3c3936'), face));
        }
        // Coloured sunshade over the shop.
        const shade = rand.pick(['#c2410c', '#2f6b3a', '#e8b04b', '#2c6e78', '#7a2f5a']);
        solid.push(part(new BoxGeometry(1.1, 0.06, shopW + 0.3), shade, T(side * (FACADE - 0.5), 2.62, zc, 0, 0, side * 0.32)));
        // Upper-floor windows.
        for (let f = 1; f < floors; f++) {
          const n = Math.max(1, Math.floor(width / 2.3));
          for (let k = 0; k < n; k++) {
            const wz = zc - width / 2 + ((k + 0.5) * width) / n;
            const roll = rand();
            const color = roll < 0.42 ? hdr(rand.pick(['#ffcf8a', '#ffb870', '#ffe2b0']), rand.range(0.7, 1.3)) : roll < 0.48 ? hdr('#86b4ff', 1.2) : '#1d1b22';
            const g = part(new PlaneGeometry(0.95, 1.15), color, T(side * (FACADE - 0.03), f * 2.9 + 1.45, wz, 0, -side * Math.PI / 2));
            (roll < 0.48 ? lit : solid).push(g);
          }
        }
        if (rand() < 0.62) signSpots.push({ side, z: zc + width * 0.32 * (rand() < 0.5 ? -1 : 1) });
        z -= width + rand.range(0.4, 1.4);
      }
    }

    // Blade signs, perpendicular to the façades so they read from the middle of the road.
    this.atlas = signAtlas();
    const signs = [];
    signSpots.forEach((s, i) => {
      const slot = (i * 3 + 1) % SIGNS.length;
      const x = s.side * (FACADE - 0.9);
      signs.push(part(atlasQuad(1.55, 0.4, slotUV(slot)), '#ffffff', T(x, 3.25, s.z + 0.031)));
      solid.push(part(new BoxGeometry(1.68, 0.52, 0.05), '#1b1814', T(x, 3.25, s.z)));
      solid.push(part(new BoxGeometry(0.06, 0.06, 0.06), '#1b1814', T(s.side * (FACADE - 0.05), 3.25, s.z, 0, 0, 0, 1, 1, 1)));
    });
    this.signs = new Mesh(merge(signs, { uv: true }), new MeshBasicMaterial({ map: this.atlas, color: hdr('#ffffff', 1.15) }));

    // Street lamps (poles are solid geometry; heads are emissive; light is faked with halos and pools).
    const lamps = [[5.7, 8], [-5.7, -4], [5.7, -16], [-5.7, -28], [5.7, -40], [-5.7, -52], [7.4, -58.6], [-7.4, -58.6]];
    const heads = [];
    const pools = [];
    for (const [x, z] of lamps) {
      const s = Math.sign(x);
      solid.push(part(new CylinderGeometry(0.07, 0.1, 5.4, 6), '#24211f', T(x, 2.7, z)));
      solid.push(part(new BoxGeometry(0.22, 0.4, 0.22), '#24211f', T(x, 0.2, z)));
      solid.push(part(new BoxGeometry(1.25, 0.07, 0.07), '#24211f', T(x - s * 0.6, 5.32, z)));
      solid.push(part(new BoxGeometry(0.5, 0.1, 0.28), '#2f2b28', T(x - s * 1.15, 5.27, z)));
      lit.push(part(new BoxGeometry(0.42, 0.04, 0.22), hdr('#ffb15e', 4), T(x - s * 1.15, 5.2, z)));
      heads.push({ x: x - s * 1.15, y: 5.1, z });
      pools.push(part(new PlaneGeometry(7, 7), '#ffffff', T(x - s * 1.6, 0.03, z, -Math.PI / 2)));
    }
    this.lampGlow = new GlowPoints({ shared, points: heads, size: 2.6, color: '#ffb15e', intensity: 2.4 });
    this.pools = new Mesh(merge(pools, { uv: true }), glowMaterial({ color: '#ff9a3c', intensity: 1, opacity: 0.5, power: 1.6 }));
    this.pools.renderOrder = 3;

    // Palms and plantain plants on the sidewalks.
    [[5.5, 2, 6.5], [-5.6, -14, 7.2], [5.4, -30, 6], [-5.5, -45, 6.8], [5.6, -54, 5.6]].forEach(([x, z, h], i) => palm(solid, x, z, h, i + 3));
    for (const [x, z] of [[-5.4, 4], [5.5, -22], [-5.3, -36]]) {
      for (let i = 0; i < 6; i++) {
        const leaf = new SphereGeometry(0.5, 6, 4).translate(0, 0.5, 0);
        solid.push(part(leaf, i % 2 ? '#3c7a3c' : '#2f6b3a', T(x, 1.05, z, 0, (i / 6) * Math.PI * 2 + 0.3, 0.75 + (i % 3) * 0.2, 0.12, 1.5, 0.55)));
      }
      solid.push(part(new CylinderGeometry(0.1, 0.14, 1.1, 6), '#4f6b2f', T(x, 0.55, z)));
    }

    // Call-box umbrellas with plastic chairs.
    for (const [x, z, a, b] of [[5.6, -9, '#e8b04b', '#c2410c'], [-5.6, -33, '#2c6e78', '#f4ead5']]) {
      solid.push(part(new ConeGeometry(1.25, 0.5, 8), (px, py, pz, f) => (f % 2 ? a : b), T(x, 2.3, z)));
      solid.push(part(new CylinderGeometry(0.03, 0.03, 2.2, 5), '#d8d0c0', T(x, 1.1, z)));
      solid.push(part(new BoxGeometry(0.8, 0.06, 0.6), '#f4ead5', T(x, 0.8, z)));
      solid.push(part(new BoxGeometry(0.06, 0.78, 0.5), '#cfc6b4', T(x, 0.4, z)));
      solid.push(part(new BoxGeometry(0.42, 0.06, 0.42), '#c2410c', T(x - Math.sign(x) * 0.7, 0.45, z + 0.4)));
      solid.push(part(new BoxGeometry(0.42, 0.45, 0.06), '#c2410c', T(x - Math.sign(x) * 0.7, 0.68, z + 0.6)));
    }

    // Soya stand: table, grill and glowing coals.
    const sx = -5.25;
    const sz = -20;
    solid.push(part(new BoxGeometry(1.4, 0.06, 0.8), '#7a4a2a', T(sx, 0.85, sz)));
    for (const [dx, dz] of [[-0.6, -0.32], [0.6, -0.32], [-0.6, 0.32], [0.6, 0.32]]) solid.push(part(new BoxGeometry(0.06, 0.85, 0.06), '#4a2c19', T(sx + dx, 0.42, sz + dz)));
    solid.push(part(new BoxGeometry(1.1, 0.16, 0.45), '#1d1b19', T(sx, 0.96, sz)));
    lit.push(part(new BoxGeometry(1.0, 0.03, 0.36), (x, y, z) => hdr(Math.sin(x * 23 + z * 17) > 0 ? '#ff5a1a' : '#ff9a2a', 3.2), T(sx, 1.05, sz)));
    for (let i = 0; i < 5; i++) solid.push(part(new BoxGeometry(0.9, 0.04, 0.04), '#5a2a12', T(sx, 1.08, sz - 0.16 + i * 0.08)));
    this.embers = new Embers({ shared, count: 40, area: [0.9, 0.3], height: 1.8, size: 0.03, seed: 5 });
    this.embers.points.position.set(sx, 1.06, sz);

    // Wooden utility poles and sagging power lines.
    const linePts = [];
    const polesAt = [];
    for (let z = 10; z > -58; z -= 17) polesAt.push(z);
    for (const s of [-1, 1]) {
      for (const z of polesAt) {
        solid.push(part(new CylinderGeometry(0.08, 0.11, 7.6, 5), '#3f3127', T(s * 6.3, 3.8, z)));
        solid.push(part(new BoxGeometry(0.06, 0.06, 1.2), '#3f3127', T(s * 6.3, 7.3, z)));
      }
    }
    const sag = (a, b, drop) => {
      for (let i = 0; i < 8; i++) {
        const t0 = i / 8;
        const t1 = (i + 1) / 8;
        const pt = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - drop * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
        linePts.push(...pt(t0), ...pt(t1));
      }
    };
    for (const s of [-1, 1]) {
      for (let i = 0; i < polesAt.length - 1; i++) {
        for (const dz of [-0.5, 0.5]) sag([s * 6.3, 7.3, polesAt[i] + dz], [s * 6.3, 7.3, polesAt[i + 1] + dz], 0.7);
      }
    }
    polesAt.forEach((z, i) => i % 2 === 0 && sag([-6.3, 7.3, z], [6.3, 7.3, z - 8], 0.9));
    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute('position', new Float32BufferAttribute(linePts, 3));
    this.lines = new LineSegments(lineGeo, new LineBasicMaterial({ color: '#0e0c0b' }));

    this.solid = new Mesh(merge(solid), materials.lambert);
    this.lit = new Mesh(merge(lit), materials.lit);
    this.solid.name = 'street-solid';
    this.lit.name = 'street-lit';

    // Moto-taxis: four parked, three riding in from the cross street and back out.
    this.routes = [
      { route: new Route([[-90, -61], [2.2, -61], [2.2, 44]]), speed: 8.5, offset: 30 },
      { route: new Route([[-2.2, 44], [-2.2, -63.5], [90, -63.5]]), speed: 7.2, offset: 50 },
      { route: new Route([[90, -61.6], [3.0, -61.6], [3.0, 44]]), speed: 6.4, offset: 95 },
    ];
    const parked = [[3.4, -6, 2.6], [-3.5, -23, -0.5], [3.3, -44, 2.8], [-3.4, -50, 0.4]];
    this.motos = new InstancedMesh(motoGeometry(), materials.lambert, parked.length + this.routes.length);
    this.motos.frustumCulled = false;
    const m = new Matrix4();
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    parked.forEach(([x, z, a], i) => {
      this.motos.setMatrixAt(i, m.compose(new Vector3(x, 0, z), q.setFromAxisAngle(up, a), new Vector3(1, 1, 1)));
      this.motos.setColorAt(i, hdr(['#ffffff', '#c9d6ff', '#ffe0c0', '#d0ffd8'][i], 0.9));
    });
    this.routes.forEach((r, k) => this.motos.setColorAt(parked.length + k, hdr(['#ffd6c0', '#ffffff', '#cfe0ff'][k], 1)));
    this.parkedCount = parked.length;
    this.motoLights = new GlowPoints({
      shared,
      points: this.routes.flatMap(() => [
        { x: 0, y: -50, z: 0, color: '#fff2d6', intensity: 3, size: 1.1 },
        { x: 0, y: -50, z: 0, color: '#ff2a1a', intensity: 2.2, size: 0.5 },
      ]),
    });
    this.motoLights.points.frustumCulled = false;
    this._m = m;
    this._q = q;
    this._up = up;
    this._p = new Vector3();
    this._s = new Vector3(1, 1, 1);

    this.group.add(this.solid, this.lit, this.signs, this.pools, this.lampGlow.points, this.lines, this.embers.points, this.motos, this.motoLights.points);
    freeze(this.solid);
    freeze(this.lit);
    freeze(this.signs);
    freeze(this.pools);
  }

  setDensity(f) {
    this.embers.setDensity(f);
  }

  update(p, time) {
    const visible = inRanges(p, OUTSIDE);
    this.group.visible = visible;
    if (!visible) return;
    this.embers.opacity = p < 0.32 ? 1 : 0;

    const { _m: m, _q: q, _up: up, _p: pos, _s: scale } = this;
    this.routes.forEach((r, k) => {
      const heading = r.route.sample(r.offset + time * r.speed, pos);
      const x = pos.x;
      const z = pos.z;
      this.motos.setMatrixAt(this.parkedCount + k, m.compose(pos, q.setFromAxisAngle(up, heading), scale));
      const fx = Math.sin(heading);
      const fz = Math.cos(heading);
      this.motoLights.setPosition(k * 2, x + fx * 0.72, 0.92, z + fz * 0.72);
      this.motoLights.setPosition(k * 2 + 1, x - fx * 0.78, 0.78, z - fz * 0.78);
    });
    this.motos.instanceMatrix.needsUpdate = true;
    this.motoLights.commit();
  }
}
