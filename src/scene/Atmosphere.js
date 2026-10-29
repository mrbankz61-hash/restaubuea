import { Color, DirectionalLight, Fog, HemisphereLight, PointLight, Vector3 } from 'three';
import { createSky } from './fx/SkyShader.js';
import { smooth } from './util/math.js';

/**
 * The colour script of the journey. Each stop overrides only what changes; everything is
 * blended continuously by scroll so dusk → street → amber doorway → warm interior → fire →
 * night map reads as one world. Colours are sRGB hex; vectors are plain arrays.
 */
const SCRIPT = [
  [0.0, {
    skyTop: '#1b1733', skyMid: '#6d3b5e', skyBottom: '#ee8a4c', sun: '#ffb36b', sunI: 1.0, stars: 0.25,
    fog: '#5b3850', fogNear: 70, fogFar: 420,
    hemiSky: '#9a7bb0', hemiGround: '#4a2a1c', hemiI: 1.7,
    key: '#ff9a5c', keyI: 2.6, keyDir: [-0.5, 0.32, -0.8],
    warm: '#ffb56b', warmI: 0, warmPos: [0, 3.2, -64],
    fireI: 0,
    mBase: '#2b1b30', mTop: '#5c3448', mRim: '#ff8a4a',
    mist: '#c99a9c', mistI: 0.24,
    bloom: 0.55, exposure: 1.05, frameX: 0, frameY: 0,
  }],
  [0.1, { fog: '#4a2f45', fogNear: 30, fogFar: 260, mistI: 0.18 }],
  [0.15, {
    skyTop: '#16122b', skyMid: '#4f2c4d', skyBottom: '#c8653a', sun: '#ff9a55', sunI: 0.85, stars: 0.4,
    fog: '#3b2638', fogNear: 18, fogFar: 140, hemiI: 1.25, keyI: 1.6, warmI: 10, warmPos: [0, 3.6, -58], mistI: 0.08, bloom: 0.6,
  }],
  [0.26, {
    skyTop: '#110e22', skyMid: '#3a2340', skyBottom: '#9a4a30', sunI: 0.6, stars: 0.6,
    fog: '#3c2420', fogNear: 10, fogFar: 90, warmI: 16, warmPos: [0, 3.4, -61], mistI: 0, bloom: 0.62,
  }],
  [0.315, { fog: '#5a3420', fogNear: 6, fogFar: 50, warmI: 14, warmPos: [0, 3.0, -64.5], bloom: 0.72, exposure: 1.05 }],
  [0.34, { fog: '#a8642a', fogNear: 1, fogFar: 24, bloom: 0.95, exposure: 1.12, warmI: 14, warmPos: [0, 2.8, -72] }],
  [0.38, {
    fog: '#3a2414', fogNear: 7, fogFar: 36,
    hemiSky: '#ffe2b0', hemiGround: '#4a2a18', hemiI: 1.5, key: '#ffd29a', keyI: 0.5,
    warm: '#ffc27a', warmI: 16, warmPos: [0, 3.3, -76], bloom: 0.6, exposure: 1.02,
  }],
  [0.41, { frameX: 0.15, frameY: 0.16 }],
  [0.645, { warmPos: [0, 3.3, -97], frameX: 0.15, frameY: 0.16 }],
  [0.67, { frameX: 0, frameY: 0, fog: '#3d1c0c', fogNear: 5, fogFar: 28 }],
  [0.72, { fog: '#4a1e0c', fogNear: 4, fogFar: 24, warmI: 9, warmPos: [2.5, 3.2, -104], fireI: 26, bloom: 0.85 }],
  [0.79, { fireI: 26, warmI: 9 }],
  [0.85, {
    skyTop: '#06070f', skyMid: '#121633', skyBottom: '#2c2440', sun: '#5d6fd0', sunI: 0.25, stars: 1.0,
    fog: '#141320', fogNear: 60, fogFar: 380,
    hemiSky: '#7080c0', hemiGround: '#2a1c12', hemiI: 1.5, key: '#b0bcff', keyI: 1.4, keyDir: [0.35, 0.9, 0.25],
    warmI: 0, fireI: 4, mBase: '#0b0c16', mTop: '#1c2038', mRim: '#3a4a90',
    bloom: 0.85, exposure: 1.05, frameX: 0, frameY: 0,
  }],
  [0.93, { frameX: 0.19, frameY: 0.31, fogNear: 120, fogFar: 520 }],
  [1.0, { frameX: 0.19, frameY: 0.31 }],
];

function compile(script) {
  let acc = {};
  return script.map(([p, changes]) => {
    acc = { ...acc, ...changes };
    const stop = { p };
    for (const [k, v] of Object.entries(acc)) {
      stop[k] = typeof v === 'string' ? new Color(v) : Array.isArray(v) ? new Vector3(...v) : v;
    }
    return stop;
  });
}

export class Atmosphere {
  constructor(scene, shared) {
    this.stops = compile(SCRIPT);
    this.state = {};
    for (const [k, v] of Object.entries(this.stops[0])) this.state[k] = v?.clone ? v.clone() : v;

    this.sky = createSky(shared);
    scene.add(this.sky.mesh);

    this.fog = new Fog(0x000000, 10, 100);
    scene.fog = this.fog;

    this.hemi = new HemisphereLight(0xffffff, 0x000000, 1);
    this.key = new DirectionalLight(0xffffff, 1);
    // Light count stays constant (intensity goes to 0 instead of toggling) to avoid shader recompiles.
    this.warm = new PointLight(0xffb56b, 0, 18, 2);
    this.fire = new PointLight(0xff6a1f, 0, 9, 2);
    this.fire.position.set(-3, 1.75, -108.4);
    scene.add(this.hemi, this.key, this.warm, this.fire);
  }

  update(p, time) {
    const { stops, state } = this;
    let i = 0;
    while (i < stops.length - 2 && p > stops[i + 1].p) i++;
    const a = stops[i];
    const b = stops[i + 1];
    const w = smooth(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
    for (const k in a) {
      if (k === 'p') continue;
      const va = a[k];
      if (va.isColor) state[k].copy(va).lerp(b[k], w);
      else if (va.isVector3) state[k].lerpVectors(va, b[k], w);
      else state[k] = va + (b[k] - va) * w;
    }

    const u = this.sky.uniforms;
    u.uTop.value.copy(state.skyTop);
    u.uMid.value.copy(state.skyMid);
    u.uBottom.value.copy(state.skyBottom);
    u.uSunColor.value.copy(state.sun);
    u.uSun.value = state.sunI;
    u.uStars.value = state.stars;

    this.fog.color.copy(state.fog);
    this.fog.near = state.fogNear;
    this.fog.far = state.fogFar;

    this.hemi.color.copy(state.hemiSky);
    this.hemi.groundColor.copy(state.hemiGround);
    this.hemi.intensity = state.hemiI;
    this.key.color.copy(state.key);
    this.key.intensity = state.keyI;
    this.key.position.copy(state.keyDir).normalize().multiplyScalar(100);

    this.warm.color.copy(state.warm);
    this.warm.intensity = state.warmI;
    this.warm.position.copy(state.warmPos);

    const flicker = 0.78 + 0.14 * Math.sin(time * 13.1) + 0.08 * Math.sin(time * 31.7 + 1.3);
    this.fire.intensity = state.fireI * flicker;
    state.flicker = flicker;
    return state;
  }

  followCamera(camera) {
    this.sky.mesh.position.copy(camera.position);
  }
}
