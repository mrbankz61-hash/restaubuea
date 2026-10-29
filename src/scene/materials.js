import {
  AdditiveBlending, Color, DoubleSide, MeshBasicMaterial, MeshLambertMaterial, ShaderMaterial,
} from 'three';

/** Brand palette (sRGB hex) plus the extra tones the world needs. */
export const PALETTE = {
  night: '#13120F',
  red: '#C2410C',
  gold: '#E8B04B',
  leaf: '#2F6B3A',
  cream: '#F4EAD5',
  laterite: '#7a3f22',
  asphalt: '#2b2724',
  wood: '#7a4a2a',
  woodDark: '#4a2c19',
  metal: '#2a2724',
  walls: ['#c9a27e', '#b86a4b', '#8fa58a', '#d7c39a', '#9a7fa6', '#7d9fb0', '#e0b07a', '#a35d3d', '#c7b7a0', '#6f8f7c'],
  roofs: ['#7a3b22', '#8f4a2a', '#6e6e6a', '#5d4b42', '#9a5a30', '#4f6470', '#7d7a74'],
  greens: ['#2f6b3a', '#24552d', '#3c7a3c', '#1f4426', '#4a8a3f'],
};

/**
 * One instance of each material, shared by every chapter. Fewer materials means fewer shader
 * programs to compile at load and fewer state changes per frame.
 */
export function createMaterials() {
  return {
    lambert: new MeshLambertMaterial({ vertexColors: true }),
    lambertDouble: new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }),
    lit: new MeshBasicMaterial({ vertexColors: true }),
    instanced: new MeshLambertMaterial({ color: 0xffffff }),
  };
}

const GLOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`;

const GLOW_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uPower;
  uniform float uRing;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(1.0 - d, 0.0), uPower);
    if (uRing > 0.0) a = smoothstep(uRing - 0.25, uRing, d) * (1.0 - smoothstep(uRing, 1.0, d)) * 2.0;
    a *= uOpacity;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Soft additive radial glow for light pools, halos and pulse rings. */
export function glowMaterial({ color = '#ffb15e', intensity = 1, opacity = 1, power = 2, ring = 0 } = {}) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color).multiplyScalar(intensity) },
      uOpacity: { value: opacity },
      uPower: { value: power },
      uRing: { value: ring },
    },
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}
