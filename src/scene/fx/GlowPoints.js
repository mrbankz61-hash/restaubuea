import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from 'three';
import { SOFT_FRAG_END } from './particles.js';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uDpr;
  uniform float uTwinkle;
  uniform float uMax;
  uniform float uMin;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  varying vec3 vColor;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (1.3 + aPhase) + aPhase * 40.0));
    gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.05), uMin * uDpr, uMax * uDpr);
    vColor = aColor * tw;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d2 = dot(c, c) * 4.0;
    float a = (exp(-d2 * 5.0) * 0.55 + exp(-d2 * 40.0)) * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
    ${SOFT_FRAG_END}
  }
`;

/**
 * Billboard halos for lamps, lanterns, headlights and town lights. Fakes dozens of light
 * sources for the price of one draw call and zero real lights.
 */
export class GlowPoints {
  constructor({ shared, points, size = 1.6, color = '#ffb15e', intensity = 2, twinkle = 0, max = 140, min = 1.5 }) {
    const n = points.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const phase = new Float32Array(n);
    const c = new Color();
    points.forEach((pt, i) => {
      pos.set([pt.x, pt.y, pt.z], i * 3);
      c.set(pt.color ?? color).multiplyScalar(pt.intensity ?? intensity);
      col.set([c.r, c.g, c.b], i * 3);
      sizes[i] = pt.size ?? size;
      phase[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(pos, 3));
    geometry.setAttribute('aColor', new BufferAttribute(col, 3));
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new BufferAttribute(phase, 1));
    geometry.computeBoundingSphere();
    this.material = new ShaderMaterial({
      uniforms: {
        uTime: shared.time,
        uScale: shared.pointScale,
        uDpr: shared.dpr,
        uTwinkle: { value: twinkle },
        uOpacity: { value: 1 },
        uMax: { value: max },
        uMin: { value: min },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(geometry, this.material);
    this.points.renderOrder = 6;
  }

  setPosition(i, x, y, z) {
    this.points.geometry.attributes.position.setXYZ(i, x, y, z);
  }

  commit() {
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  set opacity(v) {
    this.material.uniforms.uOpacity.value = v;
    this.points.visible = v > 0.002;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
