import { Color, NormalBlending, ShaderMaterial, Sphere, Vector3 } from 'three';
import { ParticleSystem, SOFT_FRAG_END } from './particles.js';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uDpr;
  uniform float uSize;
  uniform vec3 uMin;
  uniform vec3 uBox;
  attribute vec4 aSeed;
  varying float vAlpha;

  void main() {
    vec3 p = uMin + aSeed.xyz * uBox;
    float u = fract(aSeed.x + uTime * (0.002 + aSeed.w * 0.004));
    p.x = uMin.x + u * uBox.x;
    p.y += sin(uTime * 0.15 + aSeed.w * 6.2831853) * 1.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = min(uSize * (0.6 + aSeed.w * 0.8) * uScale / max(depth, 0.1), 110.0 * uDpr);
    float edge = smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.9, 1.0, u));
    vAlpha = smoothstep(10.0, 45.0, depth) * (1.0 - smoothstep(330.0, 520.0, depth)) * edge;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = exp(-dot(c, c) * 12.0) * vAlpha * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    ${SOFT_FRAG_END}
  }
`;

/** Slow drifting banks of mist over the foothills. Fades near the camera to limit overdraw. */
export class Mist extends ParticleSystem {
  constructor({ shared, count = 160, min = [-260, 5, -420], box = [520, 34, 500], size = 34, color = '#d9a7a0' }) {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: shared.time,
        uScale: shared.pointScale,
        uDpr: shared.dpr,
        uOpacity: { value: 0 },
        uSize: { value: size },
        uColor: { value: new Color(color) },
        uMin: { value: new Vector3(...min) },
        uBox: { value: new Vector3(...box) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    const center = new Vector3(min[0] + box[0] / 2, min[1] + box[1] / 2, min[2] + box[2] / 2);
    super({ count, material, seed: 23, bounds: new Sphere(center, Math.hypot(...box) / 2 + size) });
    this.points.renderOrder = 2;
  }
}
