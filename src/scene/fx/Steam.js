import { Color, NormalBlending, ShaderMaterial, Sphere, Vector3 } from 'three';
import { ParticleSystem, SOFT_FRAG_END } from './particles.js';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uDpr;
  uniform float uSpread;
  uniform float uHeight;
  uniform float uSize;
  uniform float uSpeed;
  attribute vec4 aSeed;
  varying float vAlpha;

  void main() {
    float life = fract(uTime * uSpeed * (0.7 + aSeed.x * 0.6) + aSeed.y);
    float ang = aSeed.z * 6.2831853;
    float r = uSpread * (0.25 + aSeed.w) * (0.35 + life);
    vec3 p = vec3(cos(ang) * r, life * uHeight, sin(ang) * r);
    p.x += sin(life * 5.0 + aSeed.w * 6.0 + uTime * 0.7) * 0.09 * life * uHeight;
    p.z += cos(life * 4.0 + aSeed.x * 6.0) * 0.06 * life * uHeight;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = uSize * (0.45 + life * 1.7);
    gl_PointSize = min(size * uScale / max(-mv.z, 0.05), 150.0 * uDpr);
    vAlpha = smoothstep(0.0, 0.18, life) * (1.0 - smoothstep(0.5, 1.0, life));
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = exp(-dot(c, c) * 14.0) * vAlpha * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    ${SOFT_FRAG_END}
  }
`;

/** Rising steam wisps above a plate or pot. Local origin is the food surface. */
export class Steam extends ParticleSystem {
  constructor({ shared, count = 24, spread = 0.12, height = 1.0, size = 0.22, speed = 0.24, color = '#cbbfa8', seed = 3 }) {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: shared.time,
        uScale: shared.pointScale,
        uDpr: shared.dpr,
        uOpacity: { value: 0 },
        uColor: { value: new Color(color) },
        uSpread: { value: spread },
        uHeight: { value: height },
        uSize: { value: size },
        uSpeed: { value: speed },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    super({ count, material, seed, bounds: new Sphere(new Vector3(0, height * 0.5, 0), height) });
    this.points.visible = false;
  }
}
