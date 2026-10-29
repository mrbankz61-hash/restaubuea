import {
  BoxGeometry, CylinderGeometry, DodecahedronGeometry, Group, IcosahedronGeometry, LatheGeometry, Mesh,
  MeshBasicMaterial, SphereGeometry, TorusGeometry, Vector2,
} from 'three';
import { Embers } from '../fx/Embers.js';
import { GlowPoints } from '../fx/GlowPoints.js';
import { Steam } from '../fx/Steam.js';
import { freeze, hdr, jitter, merge, part, T } from '../util/geo.js';
import { hash3, inRanges, rng, smoothstep } from '../util/math.js';
import { foodInto } from './dishes.js';
import { HOUSE } from './Doorway.js';

const GRILL = { x: -3, z: -108.6 };
const POT = { x: 2.6, z: -108.6 };

/** Behind the counter: charcoal grill, a pot of ndolé on the fire, tiles, shelves and spice jars. */
export class Kitchen {
  constructor({ scene, shared, materials }) {
    this.group = new Group();
    this.group.name = 'kitchen';
    scene.add(this.group);
    const solid = [];
    const coals = [];
    const r = rng(77);
    const inner = HOUSE.x1 - 0.3;
    const backFace = HOUSE.back + 0.3;

    // Serving counter with a toghu-striped front facing the dining room.
    const cx0 = -inner;
    const cx1 = 3.0;
    const cw = cx1 - cx0;
    const cMid = (cx0 + cx1) / 2;
    solid.push(part(new BoxGeometry(cw, 1.0, 0.8), '#2a1a12', T(cMid, 0.5, -101.1)));
    solid.push(part(new BoxGeometry(cw + 0.1, 0.07, 1.0), '#8a5a34', T(cMid, 1.035, -101.1)));
    const bands = [['#141210', 0.12], ['#c2410c', 0.36], ['#e8b04b', 0.5], ['#141210', 0.62], ['#2f6b3a', 0.76], ['#e8b04b', 0.88]];
    for (const [c, y] of bands) solid.push(part(new BoxGeometry(cw, 0.07, 0.02), c, T(cMid, y, -100.69)));
    for (let x = cx0 + 0.25; x < cx1 - 0.1; x += 0.36) {
      solid.push(part(new BoxGeometry(0.13, 0.13, 0.02), (r() > 0.5 ? '#f4ead5' : '#e0571d'), T(x, 0.43, -100.68, 0, 0, Math.PI / 4)));
    }
    // Things on the counter: a bunch of plantains, stacked enamel bowls, a calabash.
    for (let i = 0; i < 7; i++) {
      solid.push(part(new TorusGeometry(0.22, 0.04, 5, 8, Math.PI * 0.55), i % 3 ? '#c9b23a' : '#7a9a2a', T(-4.6 + i * 0.05, 1.12 + (i % 2) * 0.05, -101.0 + (i - 3) * 0.06, Math.PI / 2, 0, 0.6 + i * 0.12)));
    }
    for (let i = 0; i < 4; i++) solid.push(part(new CylinderGeometry(0.2 - i * 0.012, 0.14, 0.07, 14), i % 2 ? '#f1e9da' : '#2c6e78', T(-1.6, 1.1 + i * 0.07, -101.1)));
    solid.push(part(new SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#b88a44', T(0.6, 1.07, -101.1, Math.PI, 0, 0)));

    // Back worktop, tiled wall, shelves with jars, pots and calabashes.
    solid.push(part(new BoxGeometry(inner * 2, 0.92, 0.8), '#3a2418', T(0, 0.46, backFace + 0.4)));
    solid.push(part(new BoxGeometry(inner * 2, 0.06, 0.86), '#9a9590', T(0, 0.95, backFace + 0.43)));
    const tiles = ['#efe4cc', '#c2410c', '#efe4cc', '#2f6b3a', '#efe4cc', '#e8b04b'];
    for (let x = -inner + 0.18; x < inner - 0.1; x += 0.34) {
      for (let row = 0; row < 4; row++) {
        const y = 1.15 + row * 0.34;
        const c = tiles[(Math.floor((x + inner) / 0.34) + row * 2) % tiles.length];
        solid.push(part(new BoxGeometry(0.31, 0.31, 0.02), c, T(x, y, backFace + 0.01)));
      }
    }
    for (const y of [2.65, 3.3]) {
      solid.push(part(new BoxGeometry(inner * 2 - 0.4, 0.05, 0.34), '#5a3420', T(0, y, backFace + 0.17)));
      for (let x = -inner + 0.5; x < inner - 0.4; x += r.range(0.3, 0.55)) {
        const kind = r();
        if (kind < 0.45) {
          const h = r.range(0.16, 0.3);
          solid.push(part(new CylinderGeometry(0.07, 0.07, h, 8), r.pick(['#c2410c', '#e8b04b', '#7a2a12', '#3c7a3c', '#b8862e']), T(x, y + 0.025 + h / 2, backFace + 0.17)));
          solid.push(part(new CylinderGeometry(0.075, 0.075, 0.04, 8), '#d8d0c0', T(x, y + 0.045 + h, backFace + 0.17)));
        } else if (kind < 0.7) {
          for (let k = 0; k < 4; k++) solid.push(part(new CylinderGeometry(0.15, 0.12, 0.03, 12), k % 2 ? '#f1e9da' : '#2f6b3a', T(x, y + 0.04 + k * 0.03, backFace + 0.17)));
        } else {
          solid.push(part(new SphereGeometry(0.15, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#a8763a', T(x, y + 0.025, backFace + 0.17, Math.PI, 0, 0)));
        }
      }
    }
    // Ladles hanging from a rail.
    solid.push(part(new CylinderGeometry(0.015, 0.015, 3, 5), '#2a2622', T(0.4, 2.3, backFace + 0.12, 0, 0, Math.PI / 2)));
    for (let i = 0; i < 6; i++) {
      const x = -0.9 + i * 0.5;
      solid.push(part(new BoxGeometry(0.03, 0.42, 0.02), '#8a8680', T(x, 2.08, backFace + 0.14)));
      solid.push(part(new SphereGeometry(0.07, 6, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#9a968f', T(x, 1.86, backFace + 0.15)));
    }

    // Charcoal grill: legs, firebox, grate, hood; fish and soya cooking on top.
    const gy = 1.0;
    for (const [dx, dz] of [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.35], [0.85, 0.35]]) solid.push(part(new BoxGeometry(0.06, gy - 0.2, 0.06), '#1d1b19', T(GRILL.x + dx, (gy - 0.2) / 2, GRILL.z + dz)));
    solid.push(part(new BoxGeometry(1.9, 0.32, 0.86), '#24211e', T(GRILL.x, gy - 0.08, GRILL.z)));
    for (let i = 0; i < 34; i++) {
      const g = new DodecahedronGeometry(0.07, 0);
      jitter(g, 0.03, i);
      const hot = r();
      coals.push(part(g, () => (hot > 0.35 ? hdr(hot > 0.7 ? '#ff7a22' : '#ff4a12', 2 + hot * 2) : '#1a1210'), T(GRILL.x + r.range(-0.82, 0.82), gy + 0.06, GRILL.z + r.range(-0.34, 0.34), r(), r(), r())));
    }
    for (let i = 0; i < 12; i++) solid.push(part(new BoxGeometry(1.86, 0.018, 0.018), '#3a3632', T(GRILL.x, gy + 0.16, GRILL.z - 0.38 + i * 0.07)));
    foodInto(solid, 'fish', T(GRILL.x - 0.45, gy + 0.08, GRILL.z, 0, 0.1, 0, 1.1));
    foodInto(solid, 'soya', T(GRILL.x + 0.5, gy + 0.1, GRILL.z, 0, Math.PI / 2, 0, 0.9), { sticks: 4, seed: 3 });
    const hood = new CylinderGeometry(0.4, 1.35, 0.9, 4, 1, true);
    solid.push(part(hood, '#2c2824', T(GRILL.x, 3.05, GRILL.z, 0, Math.PI / 4, 0, 1, 1, 0.75)));
    solid.push(part(new BoxGeometry(0.55, 0.9, 0.42), '#2c2824', T(GRILL.x, 3.85, GRILL.z)));

    // Stove and the big pot of ndolé.
    solid.push(part(new BoxGeometry(1.0, 0.72, 0.9), '#22201d', T(POT.x, 0.36, POT.z)));
    coals.push(part(new TorusGeometry(0.24, 0.025, 5, 16), hdr('#3a7bff', 3), T(POT.x, 0.735, POT.z, Math.PI / 2, 0, 0)));
    const potProfile = [[0, 0], [0.36, 0], [0.42, 0.04], [0.44, 0.12], [0.44, 0.52], [0.47, 0.55], [0.45, 0.56], [0.41, 0.53], [0.41, 0.46]].map(([x, y]) => new Vector2(x, y));
    solid.push(part(new LatheGeometry(potProfile, 20), '#a8a7a0', T(POT.x, 0.74, POT.z), { flat: false }));
    solid.push(part(new CylinderGeometry(0.41, 0.41, 0.02, 20), (x, y, z) => (hash3(x * 40, 0, z * 40) > 0.82 ? '#7a6a3a' : hash3(x * 30, 1, z * 30) > 0.5 ? '#24502a' : '#1f4426'), T(POT.x, 1.2, POT.z)));
    for (const s of [-1, 1]) solid.push(part(new TorusGeometry(0.08, 0.02, 4, 8, Math.PI), '#8a8984', T(POT.x + s * 0.46, 1.18, POT.z, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0)));
    solid.push(part(new CylinderGeometry(0.02, 0.025, 0.9, 6), '#8a5a34', T(POT.x + 0.15, 1.42, POT.z + 0.05, 0.25, 0, -0.35)));
    solid.push(part(new CylinderGeometry(0.42, 0.42, 0.03, 18), '#b8b7b0', T(POT.x + 0.62, 0.42, POT.z + 0.15, 0.1, 0, Math.PI / 2 - 0.2)));

    // Sacks of rice and charcoal.
    for (const [x, z, c] of [[-5.9, -110.6, '#d9c8a4'], [-5.2, -110.8, '#2a2622'], [5.8, -110.5, '#d9c8a4']]) {
      const g = new IcosahedronGeometry(0.42, 1);
      jitter(g, 0.08, x);
      solid.push(part(g, c, T(x, 0.38, z, 0, x, 0, 1, 1.15, 0.85)));
    }

    this.solid = new Mesh(merge(solid), materials.lambert);
    this.coalMaterial = new MeshBasicMaterial({ vertexColors: true });
    this.coals = new Mesh(merge(coals), this.coalMaterial);
    this.solid.name = 'kitchen-solid';

    this.embers = new Embers({ shared, count: 150, area: [1.6, 0.6], height: 2.6, size: 0.032 });
    this.embers.points.position.set(GRILL.x, gy + 0.12, GRILL.z);
    this.steam = new Steam({ shared, count: 34, spread: 0.24, height: 1.8, size: 0.34, speed: 0.17, seed: 61 });
    this.steam.points.position.set(POT.x, 1.22, POT.z);
    this.fireGlow = new GlowPoints({
      shared,
      points: [
        { x: GRILL.x, y: gy + 0.25, z: GRILL.z, size: 3.4, intensity: 1.1, color: '#ff6a1f' },
        { x: GRILL.x - 0.5, y: gy + 0.2, z: GRILL.z + 0.1, size: 1.6, intensity: 1.4, color: '#ffa040' },
        { x: GRILL.x + 0.6, y: gy + 0.2, z: GRILL.z - 0.1, size: 1.6, intensity: 1.4, color: '#ffa040' },
        { x: POT.x, y: 0.76, z: POT.z, size: 1.1, intensity: 1.3, color: '#4a8bff' },
      ],
      twinkle: 0.35,
    });

    this.group.add(this.solid, this.coals, this.embers.points, this.steam.points, this.fireGlow.points);
    freeze(this.solid);
    freeze(this.coals);
  }

  setDensity(f) {
    this.embers.setDensity(f);
    this.steam.setDensity(f);
  }

  update(p, time, dt, state) {
    // Seen down the room on entering, then from the end of the table onward.
    const visible = inRanges(p, [[0.3, 0.42], [0.6, 1]]);
    this.group.visible = visible;
    if (!visible) return;
    const active = smoothstep(0.6, 0.68, p) * (1 - smoothstep(0.9, 0.96, p));
    this.embers.opacity = active;
    this.steam.opacity = active * 0.4;
    this.coalMaterial.color.setScalar(0.75 + 0.35 * state.flicker);
  }
}
