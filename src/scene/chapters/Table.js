import {
  BoxGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, LatheGeometry, Mesh,
  MeshLambertMaterial, NormalBlending, PlaneGeometry, ShaderMaterial, Sphere, Vector2, Vector3,
} from 'three';
import { GlowPoints } from '../fx/GlowPoints.js';
import { Steam } from '../fx/Steam.js';
import { dishProgress, plateZ, TABLE } from '../timeline.js';
import { atlasQuad, canvasTexture, freeze, hdr, merge, part, T } from '../util/geo.js';
import { damp, hash3, rng, smoothstep } from '../util/math.js';
import { buildDish } from './dishes.js';
import { HOUSE } from './Doorway.js';

const INSIDE = [0.26, 1];

function toghuTexture() {
  // Inspired by the embroidered toghu cloth of Cameroon's grassfields: black velvet, bright stitching.
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#131010';
    ctx.fillRect(0, 0, w, h);
    const colors = ['#e8b04b', '#c2410c', '#f4ead5', '#e0571d', '#2f8a4a'];
    const diamond = (cx, cy, r) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.8, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.8, cy);
      ctx.closePath();
      ctx.stroke();
    };
    ctx.lineWidth = 7;
    for (let i = 0; i < 6; i++) {
      for (let k = 4; k > 0; k--) {
        ctx.strokeStyle = colors[(i + k) % colors.length];
        diamond(w / 2, 52 + i * 82, k * 13);
      }
    }
    ctx.lineWidth = 5;
    for (const x of [26, w - 26]) {
      for (const [color, dx] of [['#e8b04b', 0], ['#c2410c', 10]]) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (let y = 0; y <= h; y += 18) ctx.lineTo(x + dx * (x < w / 2 ? 1 : -1) + ((y / 18) % 2 ? 9 : -9), y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#e8b04b';
    for (let x = 6; x < w; x += 12) ctx.fillRect(x, h - 22, 4, 22);
  });
}

const shadowMaterial = () =>
  new ShaderMaterial({
    uniforms: { uOpacity: { value: 0.5 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.35, d) * uOpacity;
        gl_FragColor = vec4(0.03, 0.02, 0.01, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });

/** The dining room and the long table where each dish rises to meet the camera. */
export class Table {
  constructor({ scene, shared, materials, dishes }) {
    this.group = new Group();
    this.group.name = 'dining-room';
    scene.add(this.group);
    const { x1, front, back, wall } = HOUSE;
    const inner = x1 - 0.3;
    const zFront = front - 0.3;
    const zBack = back + 0.3;
    const depth = zFront - zBack;
    const zMid = (zFront + zBack) / 2;
    const solid = [];
    const lit = [];
    const r = rng(17);

    // Floor: staggered planks.
    const planks = Math.round((inner * 2) / 0.36);
    for (let i = 0; i < planks; i++) {
      const x = -inner + (i + 0.5) * ((inner * 2) / planks);
      const tones = ['#5a3420', '#64391f', '#4e2d1a', '#6a4024', '#583220'];
      const g = new BoxGeometry((inner * 2) / planks - 0.012, 0.04, depth, 1, 1, 14);
      solid.push(part(g, (px, py, pz) => tones[Math.floor(hash3(i, Math.floor((pz + i * 1.7) / 3.1), 0, 3) * tones.length)], T(x, 0, zMid)));
    }

    // Green wainscot with a gold rail around the room.
    for (const s of [-1, 1]) {
      solid.push(part(new BoxGeometry(0.02, 1.1, depth), '#2f6b3a', T(s * (inner - 0.01), 0.55, zMid)));
      solid.push(part(new BoxGeometry(0.04, 0.06, depth), '#e8b04b', T(s * (inner - 0.02), 1.13, zMid)));
      const w = inner - HOUSE.door;
      solid.push(part(new BoxGeometry(w, 1.1, 0.02), '#2f6b3a', T(s * (HOUSE.door + w / 2), 0.55, zFront - 0.01)));
      solid.push(part(new BoxGeometry(w, 0.06, 0.04), '#e8b04b', T(s * (HOUSE.door + w / 2), 1.13, zFront - 0.02)));
      // Night-blue windows seen from inside.
      solid.push(part(new PlaneGeometry(1.7, 1.2), '#1a2238', T(s * 4.15, 1.95, zFront - 0.02, 0, Math.PI, 0)));
      solid.push(part(new BoxGeometry(1.9, 0.1, 0.1), '#3d2414', T(s * 4.15, 2.6, zFront - 0.05)));
      solid.push(part(new BoxGeometry(1.9, 0.1, 0.1), '#3d2414', T(s * 4.15, 1.3, zFront - 0.05)));
    }

    // The long table and its benches, sized to the menu.
    const n = dishes.length;
    const z0 = plateZ(0, n) + 1.9;
    const z1 = plateZ(n - 1, n) - 1.9;
    const tLen = z0 - z1;
    const tMid = (z0 + z1) / 2;
    const top = TABLE.topY;
    for (let k = 0; k < 4; k++) {
      solid.push(part(new BoxGeometry(0.37, 0.07, tLen), ['#7a4a2a', '#84502c', '#714427', '#7f4c2b'][k], T(-0.56 + k * 0.375, top - 0.035, tMid)));
    }
    solid.push(part(new BoxGeometry(1.3, 0.12, tLen - 0.4), '#4a2c19', T(0, top - 0.13, tMid)));
    for (let z = z0 - 0.5; z > z1; z -= Math.max(2.2, (tLen - 1) / Math.ceil((tLen - 1) / 3.2))) {
      for (const s of [-1, 1]) solid.push(part(new BoxGeometry(0.1, top - 0.07, 0.1), '#4a2c19', T(s * 0.62, (top - 0.07) / 2, z)));
    }
    for (const s of [-1, 1]) {
      solid.push(part(new BoxGeometry(0.4, 0.06, tLen - 0.4), '#6a3f22', T(s * 1.18, 0.46, tMid)));
      for (let z = z0 - 0.7; z > z1 + 0.3; z -= 3) solid.push(part(new BoxGeometry(0.32, 0.43, 0.08), '#4a2c19', T(s * 1.18, 0.215, z)));
    }
    // Cutlery and cups between the plates.
    for (let i = 0; i < n; i++) {
      const z = plateZ(i, n);
      for (const s of [-1, 1]) {
        solid.push(part(new BoxGeometry(0.03, 0.01, 0.26), '#c9c6bd', T(s * 0.5, top + 0.005, z)));
        if ((i + (s > 0 ? 1 : 0)) % 2) solid.push(part(new CylinderGeometry(0.05, 0.042, 0.11, 10), '#f1e9da', T(s * 0.6, top + 0.055, z - 0.5)));
      }
    }

    // Side tables with wax-print cloths and chairs, the room's colour.
    const wax = ['#e8b04b', '#c2410c', '#2f6b3a', '#f4ead5', '#2c6e78'];
    for (let z = front - 6; z > back + 14; z -= 6.5) {
      for (const s of [-1, 1]) {
        const x = s * 5.1;
        solid.push(part(new BoxGeometry(1.0, 0.04, 1.0, 4, 1, 4), (px, py, pz) => wax[(Math.floor((px + 0.5) * 4) + Math.floor((pz + 0.5) * 4) * 2 + (s > 0 ? 1 : 0)) % wax.length], T(x, 0.76, z)));
        solid.push(part(new BoxGeometry(1.02, 0.22, 1.02), '#c2410c', T(x, 0.64, z)));
        solid.push(part(new CylinderGeometry(0.06, 0.1, 0.62, 6), '#3d2414', T(x, 0.31, z)));
        for (const dz of [-0.75, 0.75]) {
          solid.push(part(new BoxGeometry(0.46, 0.05, 0.46), '#7a4a2a', T(x, 0.46, z + dz)));
          solid.push(part(new BoxGeometry(0.46, 0.5, 0.05), '#6a3f22', T(x, 0.72, z + dz + Math.sign(dz) * 0.22)));
        }
        solid.push(part(new CylinderGeometry(0.05, 0.05, 0.16, 8), '#f1e9da', T(x + 0.2, 0.86, z - 0.15)));
        solid.push(part(new CylinderGeometry(0.03, 0.03, 0.22, 6), '#3c7a3c', T(x - 0.2, 0.89, z + 0.1)));
      }
    }

    // Plants in the corners.
    for (const [x, z] of [[-6.2, front - 1.0], [6.2, front - 1.0], [-6.2, back + 12.5], [6.2, back + 12.5]]) {
      solid.push(part(new CylinderGeometry(0.3, 0.22, 0.55, 10), '#8a4a2a', T(x, 0.27, z)));
      for (let i = 0; i < 6; i++) solid.push(part(new IcosahedronGeometry(0.34, 0), i % 2 ? '#2f6b3a' : '#24552d', T(x + Math.cos(i) * 0.2, 0.85 + (i % 3) * 0.28, z + Math.sin(i) * 0.2)));
    }

    // Ceiling, beams and woven pendant lamps (the ceiling hides when we leave through the roof).
    const ceiling = [];
    ceiling.push(part(new PlaneGeometry(inner * 2, depth), '#3a2416', T(0, wall - 0.02, zMid, Math.PI / 2)));
    for (let z = zFront - 1.5; z > zBack; z -= 3.6) ceiling.push(part(new BoxGeometry(inner * 2, 0.18, 0.22), '#2a180e', T(0, wall - 0.11, z)));
    const shade = new LatheGeometry([[0, 0.34], [0.07, 0.34], [0.12, 0.27], [0.24, 0.07], [0.31, 0], [0.3, -0.012]].map(([x, y]) => new Vector2(x, y)), 12);
    const pendants = [];
    for (let z = z0 - 1.2; z > z1; z -= 4.4) {
      for (const s of [-1, 1]) {
        const x = s * 1.55;
        ceiling.push(part(new CylinderGeometry(0.008, 0.008, 0.5, 4), '#1a1410', T(x, wall - 0.27, z)));
        ceiling.push(part(shade, (px, py) => (Math.round(py * 40) % 2 ? '#c8a05a' : '#a8803a'), T(x, 3.6, z)));
        lit.push(part(new IcosahedronGeometry(0.075, 1), hdr('#ffd08a', 5), T(x, 3.62, z)));
        pendants.push({ x, y: 3.55, z });
      }
    }
    // Wall sconces between the hangings.
    for (let z = zFront - 4; z > zBack + 13; z -= 8) {
      for (const s of [-1, 1]) {
        solid.push(part(new BoxGeometry(0.1, 0.36, 0.22), '#3d2414', T(s * (inner - 0.05), 2.35, z)));
        lit.push(part(new BoxGeometry(0.06, 0.24, 0.16), hdr('#ffbe6e', 3), T(s * (inner - 0.12), 2.38, z)));
        pendants.push({ x: s * (inner - 0.3), y: 2.4, z, size: 1.2, intensity: 1.4 });
      }
    }
    this.glow = new GlowPoints({ shared, points: pendants, size: 1.5, color: '#ffc27a', intensity: 1.8 });

    // Toghu hangings on the side walls.
    this.toghu = toghuTexture();
    const hangings = [];
    for (let z = zFront - 8; z > zBack + 14; z -= 8) {
      for (const s of [-1, 1]) {
        hangings.push(part(atlasQuad(1.1, 2.1, [0, 0, 1, 1]), '#ffffff', T(s * (inner - 0.015), 2.45, z, 0, -s * (Math.PI / 2), 0)));
        solid.push(part(new CylinderGeometry(0.025, 0.025, 1.3, 6), '#3d2414', T(s * (inner - 0.04), 3.52, z, Math.PI / 2, 0, 0)));
      }
    }
    this.hangings = new Mesh(merge(hangings, { uv: true }), new MeshLambertMaterial({ map: this.toghu }));

    this.solid = new Mesh(merge(solid), materials.lambert);
    this.lit = new Mesh(merge(lit), materials.lit);
    this.ceiling = new Mesh(merge(ceiling), materials.lambertDouble);
    this.solid.name = 'dining-solid';

    // The dishes.
    this.glassMaterial = new MeshLambertMaterial({ color: '#e4f0f2', transparent: true, opacity: 0.28, depthWrite: false, side: DoubleSide });
    this.plates = dishes.map((dish, i) => {
      const built = buildDish(dish);
      const z = plateZ(i, n);
      const root = new Group();
      root.position.set(0, top, z);
      const tilt = new Group();
      const spin = new Group();
      spin.rotation.y = r() * Math.PI * 2;
      root.add(tilt);
      tilt.add(spin);
      spin.add(new Mesh(built.geometry, materials.lambertDouble));
      if (built.glass) {
        const glass = new Mesh(built.glass, this.glassMaterial);
        glass.renderOrder = 7;
        spin.add(glass);
      }
      let steam = null;
      if (built.hot) {
        steam = new Steam({ shared, count: 22, spread: 0.12, height: 0.95, size: 0.17, seed: 31 + i });
        steam.points.position.y = built.top;
        root.add(steam.points);
      }
      const shadow = new Mesh(new PlaneGeometry(1.4, 1.4), shadowMaterial());
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, top + 0.004, z);
      shadow.renderOrder = 2;
      this.group.add(root, shadow);
      return { root, tilt, spin, steam, shadow, center: dishProgress(i, n), speed: 0, rise: 0 };
    });

    this.hover = -1;
    this._sphere = new Sphere(new Vector3(), 0.55);
    this._hit = new Vector3();

    this.group.add(this.solid, this.lit, this.ceiling, this.hangings, this.glow.points);
    freeze(this.solid);
    freeze(this.lit);
    freeze(this.ceiling);
    freeze(this.hangings);
  }

  setDensity(f) {
    for (const plate of this.plates) plate.steam?.setDensity(f);
  }

  setHover(index) {
    this.hover = index;
  }

  update(p, time, dt) {
    const visible = p >= INSIDE[0];
    this.group.visible = visible;
    if (!visible) return;
    this.ceiling.visible = p < 0.795;
    this.glow.opacity = p < 0.8 ? 1 : 0;

    this.plates.forEach((plate, i) => {
      const c = plate.center;
      const rise = smoothstep(c - 0.034, c - 0.006, p) * (1 - smoothstep(c + 0.01, c + 0.036, p));
      plate.rise = rise;
      plate.root.position.y = TABLE.topY + rise * 0.3;
      plate.tilt.rotation.x = rise * 0.42;
      const target = i === this.hover ? 3.4 : rise * 0.7;
      plate.speed = damp(plate.speed, target, 4, dt);
      plate.spin.rotation.y += plate.speed * dt;
      if (plate.steam) plate.steam.opacity = rise * 0.42;
      plate.shadow.scale.setScalar(1 + rise * 0.5);
      plate.shadow.material.uniforms.uOpacity.value = 0.55 * (1 - rise * 0.55);
    });
  }

  /** Index of the plate under the ray (only while the menu is on screen), or -1. */
  pick(ray, p) {
    if (p < 0.39 || p > 0.66) return -1;
    let best = -1;
    let bestDist = Infinity;
    this.plates.forEach((plate, i) => {
      this._sphere.center.set(0, plate.root.position.y + 0.1, plate.root.position.z);
      if (ray.intersectSphere(this._sphere, this._hit)) {
        const d = this._hit.distanceTo(ray.origin);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
    });
    return best;
  }

  dishWorldPosition(index, target, p) {
    const plate = this.plates[index];
    if (!plate || p < 0.38 || p > 0.67) return null;
    return target.set(0, plate.root.position.y + 0.12, plate.root.position.z);
  }
}
