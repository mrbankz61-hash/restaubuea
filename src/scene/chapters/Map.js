import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry,
  InstancedMesh, LatheGeometry, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry,
  Quaternion, SphereGeometry, Vector2, Vector3,
} from 'three';
import { GlowPoints } from '../fx/GlowPoints.js';
import { glowMaterial, PALETTE } from '../materials.js';
import { atlasQuad, canvasTexture, freeze, hdr, merge, part, T } from '../util/geo.js';
import { inRanges, rng, smoothstep } from '../util/math.js';
import { OUTSIDE, terrainHeight } from './Mountain.js';

const PIN = { x: 0, z: -90 };

// Stylised road network of Molyko around the restaurant (main street continues north).
const ROADS = [
  { a: [0, 14], b: [0, 330], w: 8 },
  { a: [-330, -62.5], b: [330, -62.5], w: 6 },
  { a: [-70, -330], b: [-70, 330], w: 6 },
  { a: [80, -330], b: [80, 330], w: 6 },
  { a: [-178, -330], b: [-178, 330], w: 5 },
  { a: [186, -330], b: [186, 330], w: 5 },
  { a: [-330, 56], b: [330, 56], w: 6 },
  { a: [-330, 168], b: [330, 168], w: 5 },
  { a: [-330, -152], b: [330, -152], w: 6 },
  { a: [-330, -248], b: [330, -248], w: 5 },
  { a: [80, 56], b: [330, 300], w: 6 },
];

/** A strip draped over the terrain from a to b. */
function strip(a, b, w, lift) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const nx = -dz / len;
  const nz = dx / len;
  const steps = Math.max(1, Math.ceil(len / 6));
  const pos = [];
  const v = (t, s) => {
    const x = a[0] + dx * t + nx * s * (w / 2);
    const z = a[1] + dz * t + nz * s * (w / 2);
    return [x, terrainHeight(x, z) + lift, z];
  };
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const [p0, p1, p2, p3] = [v(t0, -1), v(t0, 1), v(t1, -1), v(t1, 1)];
    // Winding chosen so the strip faces up.
    if (nx * dz - nz * dx > 0) pos.push(...p0, ...p1, ...p2, ...p2, ...p1, ...p3);
    else pos.push(...p0, ...p2, ...p1, ...p1, ...p2, ...p3);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  return g;
}

function distToSegment(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

const reserved = (x, z) =>
  (Math.abs(x) < 15 && z > -60 && z < 18) || // the street chapter's buildings
  (Math.abs(x) < 9.5 && z < -59 && z > -116) || // the restaurant
  ROADS.some((r) => distToSegment(x, z, r.a, r.b) < r.w / 2 + 3.5);

function labelTexture() {
  return canvasTexture(1024, 512, (ctx) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f4ead5';
    ctx.font = '600 150px Fraunces, Georgia, serif';
    ctx.letterSpacing = '24px';
    ctx.fillText('MOLYKO', 512, 128);
    ctx.fillStyle = '#e8b04b';
    ctx.font = '600 74px Inter, Arial, sans-serif';
    ctx.letterSpacing = '10px';
    ctx.fillText('↑ MOUNT CAMEROON', 512, 384);
  });
}

/** The end of the journey: the town of Molyko seen from above, with a glowing pin. */
export class MapChapter {
  constructor({ scene, shared, materials, camera }) {
    this.camera = camera;
    this.group = new Group();
    this.group.name = 'map';
    scene.add(this.group);
    const r = rng(2024);

    // Roads: asphalt draped on the terrain + gold centre lines that light up for the map.
    const asphalt = [];
    const lines = [];
    for (const road of ROADS) {
      asphalt.push(part(strip(road.a, road.b, road.w, 0.05), '#2a2420'));
      lines.push(part(strip(road.a, road.b, 1.1, 0.1), '#ffffff'));
    }
    this.roads = new Mesh(merge(asphalt), materials.lambert);
    this.lineMaterial = new MeshBasicMaterial({ color: hdr('#e8b04b', 2.2), transparent: true, opacity: 0, depthWrite: false });
    this.lines = new Mesh(merge(lines), this.lineMaterial);
    this.lines.renderOrder = 3;

    // Houses: walls + colourful corrugated roofs, denser near the centre of Molyko.
    const houses = [];
    const trees = [];
    for (let x = -300; x <= 300; x += 10) {
      for (let z = -300; z <= 300; z += 10) {
        const px = x + r.range(-2.5, 2.5);
        const pz = z + r.range(-2.5, 2.5);
        if (reserved(px, pz)) continue;
        const d = Math.hypot(px, pz + 60);
        const ground = terrainHeight(px, pz);
        if (r() < 0.85 * (1 - smoothstep(130, 300, d)) && ground < 6) houses.push({ x: px, z: pz, y: ground, d });
        else if (r() < 0.55) trees.push({ x: px + r.range(-2, 2), z: pz + r.range(-2, 2), y: ground });
      }
    }
    const box = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    this.walls = new InstancedMesh(box, materials.instanced, houses.length);
    this.roofs = new InstancedMesh(box, materials.instanced, houses.length);
    const m = new Matrix4();
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const c = new Color();
    const lightPoints = [];
    houses.forEach((h, i) => {
      const w = r.range(4, 7.5);
      const dpt = r.range(4, 7);
      const height = r.range(2.6, 4) + (1 - smoothstep(40, 200, h.d)) * r.range(0, 3);
      const rot = r.range(-0.08, 0.08) + (r() < 0.15 ? Math.PI / 2 : 0);
      q.setFromAxisAngle(up, rot);
      this.walls.setMatrixAt(i, m.compose(new Vector3(h.x, h.y, h.z), q, new Vector3(w, height, dpt)));
      this.walls.setColorAt(i, c.set(r.pick(PALETTE.walls)));
      this.roofs.setMatrixAt(i, m.compose(new Vector3(h.x, h.y + height, h.z), q, new Vector3(w + 0.6, 0.22, dpt + 0.6)));
      this.roofs.setColorAt(i, c.set(r.pick([...PALETTE.roofs, '#2c6e78', '#9a2e16', '#b8862e'])));
      if (r() < 0.22) lightPoints.push({ x: h.x + r.range(-1, 1), y: h.y + 1.6, z: h.z + r.range(-1, 1), color: r.pick(['#ffc27a', '#ffe0b0', '#ffb15e']), size: 2.2, intensity: 1.6 });
    });

    // ~30 triangles a tree: open trunk + one faceted canopy. There are hundreds of them.
    const treeParts = [
      part(new CylinderGeometry(0.18, 0.26, 2, 4, 1, true), '#4a3524', T(0, 1, 0)),
      part(new IcosahedronGeometry(1.6, 0), (x, y) => (y > 0.4 ? '#3c7a3c' : '#2f6b3a'), T(0, 3, 0, 0, 0, 0, 1, 1.15, 1)),
    ];
    this.trees = new InstancedMesh(merge(treeParts), materials.lambert, trees.length);
    trees.forEach((t, i) => {
      const s = r.range(0.8, 1.7);
      this.trees.setMatrixAt(i, m.compose(new Vector3(t.x, t.y, t.z), q.setFromAxisAngle(up, r() * 6), new Vector3(s, s * r.range(0.9, 1.3), s)));
      this.trees.setColorAt(i, c.setScalar(r.range(0.7, 1.25)));
    });

    // Street lights along the roads: the town glittering at dusk and on the map at night.
    for (const road of ROADS) {
      const dx = road.b[0] - road.a[0];
      const dz = road.b[1] - road.a[1];
      const len = Math.hypot(dx, dz);
      for (let t = 0; t < len; t += 14) {
        const side = (t / 14) % 2 ? 1 : -1;
        const x = road.a[0] + (dx * t) / len + (-dz / len) * side * (road.w / 2 + 1);
        const z = road.a[1] + (dz * t) / len + (dx / len) * side * (road.w / 2 + 1);
        if (Math.abs(x) < 15 && z > -60 && z < 14) continue;
        lightPoints.push({ x, y: terrainHeight(x, z) + 4.5, z, color: r() < 0.8 ? '#ffb15e' : '#fff0d0', size: 2.6, intensity: 2 });
      }
    }
    this.cityLights = new GlowPoints({ shared, points: lightPoints, twinkle: 0.25, min: 1.6 });

    // Ground labels, always drawn on top like a printed map.
    this.labelTex = labelTexture();
    this.labelMaterial = new MeshBasicMaterial({ map: this.labelTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const labels = [
      part(atlasQuad(22, 5.5, [0, 0.5, 1, 1]), '#ffffff', T(25, 6, -95, -Math.PI / 2, 0, 0)),
      part(atlasQuad(24, 6, [0, 0, 1, 0.5]), '#ffffff', T(-25, 6, -104, -Math.PI / 2, 0, 0)),
    ];
    this.labels = new Mesh(merge(labels, { uv: true }), this.labelMaterial);
    this.labels.renderOrder = 20;

    // The pin: a classic map marker that always turns to face the camera, over pulsing rings.
    this.pin = new Group();
    const tear = [[0, 0], [0.35, 0.9], [0.75, 1.7], [1.05, 2.4], [1.2, 3.0], [1.18, 3.4], [1.0, 3.8], [0.7, 4.1], [0.35, 4.27], [0, 4.32]].map(([x, y]) => new Vector2(x * 1.15, y * 1.15));
    this.pinBody = new Mesh(
      new LatheGeometry(tear, 28),
      new MeshLambertMaterial({ color: '#c2410c', emissive: '#c2410c', emissiveIntensity: 0.9 }),
    );
    const dot = new Mesh(new SphereGeometry(0.5, 16, 10), new MeshBasicMaterial({ color: hdr('#f4ead5', 1.6) }));
    dot.position.set(0, 3.55, 1.05);
    dot.scale.z = 0.4;
    this.pinBody.add(dot);
    this.pin.add(this.pinBody);
    this.pin.position.set(PIN.x, 9, PIN.z);
    this.pinHalo = new GlowPoints({ shared, points: [{ x: 0, y: 3.4, z: 0, size: 16, intensity: 1.0, color: '#ff7a3a' }] });
    this.pin.add(this.pinHalo.points);
    this.rings = [0, 1].map(() => {
      const ring = new Mesh(new PlaneGeometry(2, 2), glowMaterial({ color: '#e8b04b', intensity: 1.6, opacity: 0, ring: 0.85 }));
      ring.material.depthTest = false;
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(PIN.x, 0.4, PIN.z);
      ring.renderOrder = 19;
      this.group.add(ring);
      return ring;
    });

    this.town = new Group();
    this.town.add(this.roads, this.walls, this.roofs, this.trees, this.cityLights.points);
    this.group.add(this.town, this.lines, this.labels, this.pin);
    freeze(this.town);
    freeze(this.lines);
    freeze(this.labels);
  }

  update(p, time) {
    const outside = inRanges(p, OUTSIDE);
    this.town.visible = outside;
    const mapT = smoothstep(0.84, 0.94, p);
    this.lineMaterial.opacity = mapT * 0.85;
    this.lines.visible = mapT > 0.002;
    this.labelMaterial.opacity = smoothstep(0.9, 0.97, p);
    this.labels.visible = this.labelMaterial.opacity > 0.002;

    const pinT = smoothstep(0.83, 0.9, p);
    this.pin.visible = pinT > 0.001;
    if (this.pin.visible) {
      const s = (pinT + Math.sin(pinT * Math.PI) * 0.25) * 2.1;
      this.pin.scale.setScalar(Math.max(0.001, s));
      this.pin.position.y = 10 + Math.sin(time * 1.7) * 0.8;
      this.pin.quaternion.copy(this.camera.quaternion);
    }
    this.rings.forEach((ring, i) => {
      const phase = (time * 0.45 + i * 0.5) % 1;
      ring.scale.setScalar(3 + phase * 22);
      ring.material.uniforms.uOpacity.value = pinT * (1 - phase) * 0.6;
      ring.visible = pinT > 0.001;
    });
  }
}
