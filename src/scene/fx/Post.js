import { HalfFloatType, ShaderMaterial, Vector2, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Final pass: vignette + film grain, then tone mapping and sRGB output in the same draw.
// Folding the output conversion in here saves a full-screen pass versus OutputPass + grain.
const gradeMaterial = () =>
  new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uGrain: { value: 0.045 },
      uVignette: { value: 0.55 },
      uRes: { value: new Vector2(1, 1) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uGrain;
      uniform float uVignette;
      uniform vec2 uRes;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 d = vUv - 0.5;
        d.x *= uRes.x / uRes.y;
        c.rgb *= mix(1.0, smoothstep(0.95, 0.25, length(d)), uVignette);
        gl_FragColor = c;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float g = hash(vUv * uRes + fract(uTime * 7.31) * 113.0) - 0.5;
        gl_FragColor.rgb += g * uGrain;
      }
    `,
    depthTest: false,
    depthWrite: false,
  });

/** Bloom + grade. Only created on tiers that can afford it. */
export class Post {
  constructor(renderer, scene, camera, { bloomScale = 0.5, msaa = 0 } = {}) {
    this.renderer = renderer;
    this.bloomScale = bloomScale;
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: msaa });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new Vector2(256, 256), 0.6, 0.42, 0.86);
    const setBloomSize = this.bloom.setSize.bind(this.bloom);
    // Bloom is soft by nature, so render it at a fraction of the screen resolution.
    this.bloom.setSize = (w, h) => setBloomSize(Math.max(64, w * this.bloomScale), Math.max(64, h * this.bloomScale));
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(gradeMaterial());
    this.composer.addPass(this.grade);
  }

  setSize(width, height, dpr) {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);
    this.grade.uniforms.uRes.value.set(width * dpr, height * dpr);
  }

  render(time, bloomStrength) {
    this.bloom.strength = bloomStrength;
    this.grade.uniforms.uTime.value = time;
    this.composer.render();
  }

  dispose() {
    this.composer.passes.forEach((pass) => pass.dispose?.());
    this.grade.material.dispose();
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
  }
}
