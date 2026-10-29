import { Color, CylinderGeometry, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { Mist } from '../fx/Mist.js';
import { fbm, inRanges, smoothstep } from '../util/math.js';
import { freeze, jitter, merge, part, T } from '../util/geo.js';

/** Where the open-air world is visible: before the door, and after we leave through the roof. */
export const OUTSIDE = [[0, 0.345], [0.79, 1]];

/** Ground height. Flat where the town sits, rolling foothills climbing toward the volcano. */
export function terrainHeight(x, z) {
  const d = Math.hypot(x * 0.85, z + 50);
  const flat = smoothstep(150, 340, d);
  const climb = smoothstep(-220, -560, z);
  const h = ((fbm(x * 0.006 + 3.1, z * 0.006 - 7.3, 3) - 0.38) * 70 + climb * 45) * flat;
  return Math.max(h, 0) - 0.08;
}

const mountainVert = /* glsl */ `
  varying vec3 vWorld;
  varying float vH;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vH = clamp(wp.y / 175.0, 0.0, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const mountainFrag = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTop;
  uniform vec3 uRim;
  uniform vec3 uHaze;
  uniform vec3 uSunDir;
  varying vec3 vWorld;
  varying float vH;
  void main() {
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    float sun = max(dot(n, normalize(uSunDir)), 0.0);
    vec3 col = mix(uBase, uTop, smoothstep(0.05, 1.0, vH));
    col += uRim * pow(sun, 1.4) * (0.3 + vH);
    col = mix(col, uHaze, (1.0 - smoothstep(0.0, 0.6, vH)) * 0.72);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Mount Cameroon, the foothills around Buea, and drifting dusk mist. */
export class Mountain {
  constructor({ scene, shared, materials }) {
    this.group = new Group();
    this.group.name = 'mountain';
    scene.add(this.group);

    // The massif: faceted cones with a broad, slightly truncated summit, like the real volcano.
    const parts = [];
    const peak = (rTop, r, h, seg, x, z, sx, seed) => {
      const g = new CylinderGeometry(rTop, r, h, seg, 6);
      g.translate(0, h / 2, 0);
      jitter(g, [r * 0.1, h * 0.07, r * 0.1], seed, (px, py) => (py > h * 0.98 ? 0.25 : 1));
      parts.push(part(g, '#ffffff', T(x, -10, z, 0, seed * 0.7, 0, sx, 1, 1)));
    };
    peak(26, 300, 178, 22, -60, -560, 1.55, 1);
    peak(8, 170, 108, 16, 200, -505, 1.2, 2);
    peak(6, 150, 82, 14, -310, -470, 1.3, 3);
    peak(14, 260, 128, 16, 140, -780, 1.4, 4);
    peak(4, 110, 52, 12, -170, -400, 1, 5);
    this.uniforms = {
      uBase: { value: new Color() },
      uTop: { value: new Color() },
      uRim: { value: new Color() },
      uHaze: { value: new Color() },
      uSunDir: { value: new Vector3(-0.5, 0.3, -0.8).normalize() },
    };
    this.mountains = new Mesh(
      merge(parts),
      new ShaderMaterial({ uniforms: this.uniforms, vertexShader: mountainVert, fragmentShader: mountainFrag }),
    );
    this.mountains.name = 'volcano';

    // Foothills and the red laterite ground of the town.
    const ground = new PlaneGeometry(1500, 1200, 75, 60);
    ground.rotateX(-Math.PI / 2);
    ground.translate(0, 0, -300);
    const pos = ground.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    const earth = ['#6e3b22', '#7a4428', '#5e3420', '#6a3a24'];
    const greens = ['#2a5a2e', '#24502a', '#2f6b3a', '#1f4426', '#35703a'];
    const colorAt = (x, y, z) => {
      const n = fbm(x * 0.02 + 11, z * 0.02 - 5, 2);
      const pick = (arr) => arr[Math.floor(fbm(x * 0.11, z * 0.11, 1) * arr.length * 0.999)];
      if (y < 0.6) return n > 0.56 ? pick(greens) : pick(earth);
      return y > 45 ? '#1a3320' : pick(greens);
    };
    this.terrain = new Mesh(merge([part(ground, colorAt)]), materials.lambert);
    this.terrain.name = 'terrain';

    this.mist = new Mist({ shared, count: 120, min: [-300, 7, -500], box: [600, 36, 540], size: 42 });

    this.group.add(this.mountains, this.terrain, this.mist.points);
    freeze(this.mountains);
    freeze(this.terrain);
  }

  setDensity(f) {
    this.mist.setDensity(f);
  }

  update(p, time, dt, state) {
    const outside = inRanges(p, OUTSIDE);
    this.mountains.visible = outside;
    this.terrain.visible = outside;
    this.mist.opacity = p < 0.3 ? state.mistI : 0;
    this.mist.material.uniforms.uColor.value.copy(state.mist);
    if (!outside) return;
    const u = this.uniforms;
    u.uBase.value.copy(state.mBase);
    u.uTop.value.copy(state.mTop);
    u.uRim.value.copy(state.mRim);
    u.uHaze.value.copy(state.skyBottom).lerp(state.fog, 0.45);
  }
}
