import { AdditiveBlending, ShaderMaterial, Sphere, Vector2, Vector3 } from 'three';
import { ParticleSystem, SOFT_FRAG_END } from './particles.js';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uSize;
  uniform float uHeight;
  uniform float uSpeed;
  uniform vec2 uArea;
  attribute vec4 aSeed;
  varying float vLife;
  varying float vFlicker;

  void main() {
    float life = fract(uTime * uSpeed * (0.6 + aSeed.x * 0.8) + aSeed.y);
    vec3 p = vec3((aSeed.z - 0.5) * uArea.x, 0.0, (aSeed.w - 0.5) * uArea.y);
    p.y = life * uHeight * (0.65 + aSeed.x * 0.7);
    p.x += sin(life * 9.0 + aSeed.w * 20.0 + uTime) * 0.16 * life;
    p.z += cos(life * 7.0 + aSeed.z * 20.0) * 0.12 * life;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(uSize * (1.0 - life * 0.55) * uScale / max(-mv.z, 0.05), 1.5);
    vLife = life;
    vFlicker = 0.55 + 0.45 * sin(uTime * 21.0 + aSeed.x * 50.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying float vLife;
  varying float vFlicker;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d) * smoothstep(0.0, 0.05, vLife) * (1.0 - smoothstep(0.55, 1.0, vLife));
    a *= vFlicker * uOpacity;
    if (a < 0.01) discard;
    vec3 col = mix(vec3(4.0, 2.3, 0.8), vec3(2.0, 0.42, 0.1), smoothstep(0.1, 0.7, vLife));
    gl_FragColor = vec4(col, a);
    ${SOFT_FRAG_END}
  }
`;

/** Sparks rising off charcoal. Additive and HDR, so the bloom pass makes them glow. */
export class Embers extends ParticleSystem {
  constructor({ shared, count = 120, area = [1.6, 0.6], height = 2.4, size = 0.035, speed = 0.42, seed = 11 }) {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: shared.time,
        uScale: shared.pointScale,
        uOpacity: { value: 0 },
        uSize: { value: size },
        uHeight: { value: height },
        uSpeed: { value: speed },
        uArea: { value: new Vector2(area[0], area[1]) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    super({ count, material, seed, bounds: new Sphere(new Vector3(0, height * 0.5, 0), height) });
    this.points.visible = false;
  }
}
