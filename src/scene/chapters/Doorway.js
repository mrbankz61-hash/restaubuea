import {
  AdditiveBlending, BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, IcosahedronGeometry,
  LatheGeometry, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, Shape, Vector2,
} from 'three';
import { GlowPoints } from '../fx/GlowPoints.js';
import { glowMaterial } from '../materials.js';
import { atlasQuad, canvasTexture, freeze, hdr, merge, part, T } from '../util/geo.js';
import { bell, easeInOut, fbm, inRanges, remap, smoothstep } from '../util/math.js';
import { OUTSIDE } from './Mountain.js';

export const HOUSE = { x0: -7.15, x1: 7.15, front: -68, back: -112.3, wall: 4.2, door: 0.95, doorH: 2.7 };

function signTexture() {
  return canvasTexture(1024, 512, (ctx) => {
    // Top half: the shop sign.
    ctx.fillStyle = '#173322';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#e8b04b';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 996, 228);
    ctx.fillStyle = '#f4ead5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const roman = '600 108px Fraunces, Georgia, serif';
    const italic = 'italic 400 108px Fraunces, Georgia, serif';
    ctx.font = roman;
    const w1 = ctx.measureText('Ndolé').width;
    ctx.font = italic;
    const w2 = ctx.measureText('House').width;
    const gap = 30;
    const x0 = 512 - (w1 + gap + w2) / 2;
    ctx.textAlign = 'left';
    ctx.font = roman;
    ctx.fillText('Ndolé', x0, 112);
    ctx.fillStyle = '#e8b04b';
    ctx.font = italic;
    ctx.fillText('House', x0 + w1 + gap, 112);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(244,234,213,0.85)';
    ctx.font = '600 30px Inter, Arial, sans-serif';
    ctx.fillText('CUISINE CAMEROUNAISE  ·  CAMEROONIAN KITCHEN', 512, 204);
    // Bottom half: the chalkboard by the door.
    ctx.fillStyle = '#1f2420';
    ctx.fillRect(0, 256, 512, 256);
    ctx.strokeStyle = '#8a6a44';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 261, 502, 246);
    ctx.fillStyle = '#efe9da';
    ctx.textAlign = 'center';
    ctx.font = 'italic 400 50px Fraunces, Georgia, serif';
    ctx.fillText("Today's pot", 256, 312);
    ctx.font = '500 32px Inter, Arial, sans-serif';
    ['Ndolé · Eru · Achu', 'Poisson braisé · Soya', 'Folere · Ginger juice'].forEach((line, i) => ctx.fillText(line, 256, 372 + i * 42));
  });
}

function doorLeaf(dir) {
  // dir = +1 for the left leaf (extends +x from its hinge), -1 for the right leaf.
  const p = [];
  const cx = dir * 0.475;
  p.push(part(new BoxGeometry(0.95, 2.7, 0.07), '#6b3a1e', T(cx, 1.35, 0)));
  for (const y of [0.75, 1.95]) {
    for (const z of [-0.045, 0.045]) p.push(part(new BoxGeometry(0.62, 0.9, 0.025), '#5a2f17', T(cx, y, z)));
  }
  p.push(part(new BoxGeometry(0.62, 0.05, 0.03), '#e8b04b', T(cx, 1.35, 0.05)));
  p.push(part(new BoxGeometry(0.05, 0.22, 0.06), '#d9a441', T(dir * 0.84, 1.3, 0.07)));
  p.push(part(new BoxGeometry(0.05, 0.22, 0.06), '#d9a441', T(dir * 0.84, 1.3, -0.07)));
  return merge(p);
}

const portalMaterial = () =>
  new ShaderMaterial({
    uniforms: { uColor: { value: hdr('#ffb04a', 2.6) }, uIntensity: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        vec2 c = (vUv - vec2(0.5, 0.42)) * vec2(1.5, 1.0);
        float a = smoothstep(0.8, 0.0, length(c)) * 0.8 + 0.2;
        a *= smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x) * smoothstep(0.0, 0.03, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
        a *= uIntensity;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

/** The restaurant: its shell, the glowing front, the doors and the amber portal we fall through. */
export class Doorway {
  constructor({ scene, shared, materials, camera }) {
    this.group = new Group();
    this.group.name = 'restaurant';
    scene.add(this.group);
    const { x0, x1, front, back, wall, door, doorH } = HOUSE;
    const solid = [];
    const lit = [];
    const cream = '#e9dcc0';
    const t = 0.3;

    // Shell: thick walls read correctly from the street, from inside, and from the sky.
    const sideW = (x1 - x0) / 2 - door;
    solid.push(part(new BoxGeometry(sideW, wall, t), cream, T(x0 + sideW / 2, wall / 2, front - t / 2)));
    solid.push(part(new BoxGeometry(sideW, wall, t), cream, T(x1 - sideW / 2, wall / 2, front - t / 2)));
    solid.push(part(new BoxGeometry(door * 2, wall - doorH, t), cream, T(0, (wall + doorH) / 2, front - t / 2)));
    solid.push(part(new BoxGeometry(t, wall, front - back), cream, T(x0 + t / 2, wall / 2, (front + back) / 2)));
    solid.push(part(new BoxGeometry(t, wall, front - back), cream, T(x1 - t / 2, wall / 2, (front + back) / 2)));
    solid.push(part(new BoxGeometry(x1 - x0, wall, t), cream, T(0, wall / 2, back + t / 2)));

    // Painted front: palm-oil red base with a gold line, like the colours on the menu.
    const fz = front + 0.02;
    for (const s of [-1, 1]) {
      const cx = s * (door + sideW / 2);
      solid.push(part(new BoxGeometry(sideW, 1.1, 0.04), '#a8360c', T(cx, 0.55, fz)));
      solid.push(part(new BoxGeometry(sideW, 0.08, 0.05), '#e8b04b', T(cx, 1.14, fz)));
      // Windows: warm panes in dark wooden frames, with a flower box underneath.
      const wx = s * 4.15;
      lit.push(part(new PlaneGeometry(1.7, 1.2), (x, y) => hdr(y > 0 ? '#ffc67e' : '#ffae5c', 1.35), T(wx, 1.95, fz + 0.01)));
      solid.push(part(new BoxGeometry(1.9, 0.1, 0.12), '#3d2414', T(wx, 2.6, fz + 0.04)));
      solid.push(part(new BoxGeometry(1.9, 0.1, 0.16), '#3d2414', T(wx, 1.3, fz + 0.06)));
      for (const dx of [-0.9, 0, 0.9]) solid.push(part(new BoxGeometry(0.07, 1.25, 0.08), '#3d2414', T(wx + dx, 1.95, fz + 0.04)));
      solid.push(part(new BoxGeometry(1.8, 0.28, 0.3), '#7a3b22', T(wx, 1.12, fz + 0.16)));
      for (let i = 0; i < 7; i++) {
        solid.push(part(new IcosahedronGeometry(0.16, 0), i % 2 ? '#2f6b3a' : '#3c7a3c', T(wx - 0.75 + i * 0.25, 1.32, fz + 0.18)));
        solid.push(part(new IcosahedronGeometry(0.05, 0), i % 3 ? '#e8b04b' : '#c2410c', T(wx - 0.7 + i * 0.25, 1.45, fz + 0.26)));
      }
    }

    // Door frame, steps, forecourt tiles.
    solid.push(part(new BoxGeometry(0.14, doorH + 0.1, 0.4), '#3d2414', T(-door - 0.05, (doorH + 0.1) / 2, front - 0.1)));
    solid.push(part(new BoxGeometry(0.14, doorH + 0.1, 0.4), '#3d2414', T(door + 0.05, (doorH + 0.1) / 2, front - 0.1)));
    solid.push(part(new BoxGeometry(door * 2 + 0.3, 0.14, 0.4), '#3d2414', T(0, doorH + 0.05, front - 0.1)));
    solid.push(part(new BoxGeometry(3.2, 0.12, 0.9), '#8a7d6e', T(0, 0.06, front + 0.45)));
    solid.push(part(new BoxGeometry(14.8, 0.06, 2.5), (x, y, z) => ((Math.floor(x / 0.6) + Math.floor(z / 0.6)) % 2 ? '#8a4a2a' : '#7a3f22'), T(0, 0.03, front + 1.25)));

    // Striped awning with a scalloped valance.
    const stripes = 8;
    for (let i = 0; i < stripes; i++) {
      const w = 3.4 / stripes;
      const x = -1.7 + w * (i + 0.5);
      const c = i % 2 ? '#f4ead5' : '#c2410c';
      solid.push(part(new BoxGeometry(w, 0.05, 1.35), c, T(x, 2.88, front + 0.64, 0.22)));
      solid.push(part(new CylinderGeometry(w / 2, w / 2, 0.04, 8, 1, false, -Math.PI / 2, Math.PI), c, T(x, 2.73, front + 1.3, Math.PI / 2, 0, 0)));
    }

    // Shop sign and chalkboard (one canvas texture for both).
    this.signTexture = signTexture();
    solid.push(part(new BoxGeometry(4.7, 0.9, 0.12), '#0f1f15', T(0, 3.62, front + 0.07)));
    const signQuads = [
      part(atlasQuad(4.5, 0.82, [0, 0.5, 1, 1]), '#ffffff', T(0, 3.62, front + 0.135)),
      part(atlasQuad(0.86, 0.43, [0, 0, 0.5, 0.5]), '#ffffff', T(2.89, 0.706, front + 1.428, -0.22, -0.35, 0)),
    ];
    solid.push(part(new BoxGeometry(0.92, 0.5, 0.04), '#5a3a22', T(2.9, 0.7, front + 1.4, -0.22, -0.35, 0)));
    solid.push(part(new BoxGeometry(0.92, 0.5, 0.04), '#5a3a22', T(3.03, 0.7, front + 1.06, 0.22, -0.35, 0)));
    for (const dx of [-0.42, 0.42]) solid.push(part(new BoxGeometry(0.04, 0.95, 0.04), '#3d2414', T(2.9 + dx * 0.94, 0.46, front + 1.25 - dx * 0.34, 0, -0.35, 0)));
    this.sign = new Mesh(merge(signQuads, { uv: true }), new MeshBasicMaterial({ map: this.signTexture, color: hdr('#ffffff', 1.12) }));

    // Lanterns either side of the door.
    for (const s of [-1, 1]) {
      solid.push(part(new BoxGeometry(0.24, 0.36, 0.24), '#1d1712', T(s * 1.48, 2.25, front + 0.16)));
      solid.push(part(new CylinderGeometry(0.02, 0.16, 0.12, 4), '#1d1712', T(s * 1.48, 2.48, front + 0.16, 0, Math.PI / 4)));
      lit.push(part(new BoxGeometry(0.15, 0.26, 0.26), hdr('#ffc46a', 3.2), T(s * 1.48, 2.25, front + 0.16)));
    }
    this.lanterns = new GlowPoints({
      shared,
      points: [
        { x: -1.48, y: 2.25, z: front + 0.3 },
        { x: 1.48, y: 2.25, z: front + 0.3 },
        { x: 0, y: 3.62, z: front + 0.5, size: 4.5, intensity: 0.6, color: '#ffe0a0' },
      ],
      size: 1.4,
      color: '#ffb35a',
      intensity: 2.6,
    });

    // Potted plants.
    const pot = new LatheGeometry([[0, 0], [0.22, 0], [0.28, 0.42], [0.3, 0.46], [0.27, 0.47]].map(([x, y]) => new Vector2(x, y)), 10);
    for (const x of [-2.6, 2.4, -6.4, 6.4]) {
      solid.push(part(pot, '#8a4a2a', T(x, 0.06, front + 0.5)));
      for (let i = 0; i < 5; i++) solid.push(part(new IcosahedronGeometry(0.28, 0), i % 2 ? '#2f6b3a' : '#24552d', T(x + Math.cos(i * 1.3) * 0.15, 0.75 + (i % 3) * 0.2, front + 0.5 + Math.sin(i * 1.3) * 0.15)));
    }

    // Round vent in the gable, lit from inside.
    lit.push(part(new CylinderGeometry(0.32, 0.32, 0.04, 14), hdr('#ffbf70', 1.6), T(0, 4.95, front + 0.04, Math.PI / 2)));

    this.shell = new Mesh(merge(solid), materials.lambert);
    this.lit = new Mesh(merge(lit), materials.lit);
    this.shell.name = 'restaurant-shell';

    // Corrugated gable roof (hidden when the camera rises out through it).
    const roofParts = [];
    const eave = 7.6;
    const rise = 1.75;
    const slope = Math.hypot(eave, rise);
    const pitch = Math.atan2(rise, eave);
    const roofLen = front - back + 0.8;
    const roofZ = (front + back) / 2;
    for (const s of [-1, 1]) {
      const sheet = new BoxGeometry(slope + 0.1, 0.08, roofLen, 1, 1, 96);
      roofParts.push(
        part(sheet, (x, y, z) => {
          const odd = Math.floor((z / roofLen + 0.5) * 96) % 2;
          if (fbm(z * 0.08 + s * 9, 3.3, 2) > 0.62) return odd ? '#707069' : '#62625c';
          return odd ? '#7a3b22' : '#904b2b';
        }, T((s * eave) / 2, wall + rise / 2 - 0.05, roofZ, 0, 0, -s * pitch)),
      );
    }
    roofParts.push(part(new BoxGeometry(0.4, 0.14, roofLen + 0.1), '#5a2a16', T(0, wall + rise, roofZ)));
    const gable = new Shape();
    gable.moveTo(x0, 0);
    gable.lineTo(x1, 0);
    gable.lineTo(0, rise - 0.08);
    gable.closePath();
    const gableGeo = new ExtrudeGeometry(gable, { depth: t, bevelEnabled: false });
    roofParts.push(part(gableGeo, cream, T(0, wall, front - t)));
    roofParts.push(part(gableGeo, cream, T(0, wall, back)));
    this.roof = new Mesh(merge(roofParts), materials.lambert);
    this.roof.name = 'roof';

    // Doors swing inward as we arrive.
    this.leftDoor = new Group();
    this.rightDoor = new Group();
    this.leftDoor.position.set(-door, 0, front - t / 2);
    this.rightDoor.position.set(door, 0, front - t / 2);
    this.leftDoor.add(new Mesh(doorLeaf(1), materials.lambert));
    this.rightDoor.add(new Mesh(doorLeaf(-1), materials.lambert));

    // The portal: amber light filling the doorway, a pool of it on the step, and a camera flash.
    this.portal = new Mesh(new PlaneGeometry(door * 2, doorH), portalMaterial());
    this.portal.position.set(0, doorH / 2, front - 0.42);
    this.portal.renderOrder = 4;
    this.spill = new Mesh(new PlaneGeometry(5, 4), glowMaterial({ color: '#ffa040', intensity: 1, opacity: 0, power: 1.4 }));
    this.spill.rotation.x = -Math.PI / 2;
    this.spill.position.set(0, 0.08, front + 1.6);
    this.spill.renderOrder = 3;

    this.flash = new Mesh(
      new PlaneGeometry(2, 2),
      new MeshBasicMaterial({ color: hdr('#ff9a3a', 1.5), transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }),
    );
    this.flash.position.z = -0.12;
    this.flash.renderOrder = 999;
    this.flash.frustumCulled = false;
    camera.add(this.flash);

    this.flashAmount = 0;
    this.fovKick = 0;

    this.group.add(this.shell, this.lit, this.sign, this.roof, this.leftDoor, this.rightDoor, this.portal, this.spill, this.lanterns.points);
    freeze(this.shell);
    freeze(this.lit);
    freeze(this.sign);
    freeze(this.roof);
    freeze(this.portal);
    freeze(this.spill);
  }

  update(p) {
    const outside = inRanges(p, OUTSIDE);
    this.roof.visible = p < 0.795;
    this.sign.visible = outside;
    this.lanterns.opacity = outside ? 1 : 0;

    const open = 0.22 + easeInOut(remap(p, 0.27, 0.328)) * 1.5;
    this.leftDoor.rotation.y = open;
    this.rightDoor.rotation.y = -open;

    const glow = smoothstep(0.1, 0.3, p) * (1 - smoothstep(0.336, 0.345, p));
    this.portal.material.uniforms.uIntensity.value = glow * (0.55 + 0.45 * remap(p, 0.27, 0.33));
    this.portal.visible = glow > 0.002;
    this.spill.material.uniforms.uOpacity.value = (0.25 + 0.75 * remap(p, 0.25, 0.33)) * (p < 0.37 ? 0.55 : 0);
    this.spill.visible = p < 0.37;

    // The moment of entering: the screen floods amber, bloom flares, the lens widens.
    this.flashAmount = bell(p, 0.337, 0.012);
    this.fovKick = 16 * bell(p, 0.333, 0.028);
    this.flash.material.opacity = this.flashAmount * 0.88;
    this.flash.visible = this.flashAmount > 0.003;
  }
}
