import { BufferAttribute, BufferGeometry, Points, Sphere, Vector3 } from 'three';
import { rng } from '../util/math.js';

/**
 * Base for GPU-animated particle systems: every particle gets four random seeds and the
 * vertex shader does all the motion, so the CPU never touches the buffers after creation.
 * `setDensity` trims the draw range, which is how weak devices get 70% fewer particles.
 */
export class ParticleSystem {
  constructor({ count, material, bounds, seed = 7 }) {
    const rand = rng(seed);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    geometry.boundingSphere = bounds ?? new Sphere(new Vector3(), 4);
    this.count = count;
    this.material = material;
    this.points = new Points(geometry, material);
    this.points.renderOrder = 5;
    this.minCount = Math.min(count, 6);
  }

  setDensity(f) {
    this.points.geometry.setDrawRange(0, Math.max(this.minCount, Math.round(this.count * f)));
  }

  set opacity(v) {
    this.material.uniforms.uOpacity.value = v;
    this.points.visible = v > 0.002;
  }

  get opacity() {
    return this.material.uniforms.uOpacity.value;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

export const SOFT_FRAG_END = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;
