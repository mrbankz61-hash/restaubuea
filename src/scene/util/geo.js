// Low-poly toolkit: every prop is built from primitives, coloured per face, and merged into a
// single geometry so a whole street or kitchen costs one draw call.
import {
  BufferAttribute, BufferGeometry, CanvasTexture, Color, Euler, Matrix4, PlaneGeometry,
  Quaternion, SRGBColorSpace, Vector3,
} from 'three';
import { hash3 } from './math.js';

const _p = new Vector3();
const _s = new Vector3();
const _q = new Quaternion();
const _e = new Euler();
const _c = new Color();
const colorCache = new Map();

/** Transform matrix from position, Euler rotation and scale. */
export function T(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

/** HDR colour: values above 1 feed the bloom pass. */
export const hdr = (hex, k = 1) => new Color(hex).multiplyScalar(k);

function toColor(value) {
  if (value?.isColor) return value;
  let c = colorCache.get(value);
  if (!c) {
    c = new Color(value);
    colorCache.set(value, c);
  }
  return c;
}

/**
 * Prepares one primitive for merging: non-indexed, vertex-coloured, transformed.
 * `color` is a hex string, a Color, or fn(x, y, z, faceIndex) evaluated in local space.
 */
export function part(geometry, color, matrix, { flat = true, perFace = flat } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const pos = g.attributes.position;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const write = (i, c) => {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  };
  if (typeof color === 'function') {
    if (perFace) {
      for (let i = 0; i + 2 < n; i += 3) {
        const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
        const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
        const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
        const c = toColor(color(cx, cy, cz, i / 3));
        write(i, c);
        write(i + 1, c);
        write(i + 2, c);
      }
    } else {
      for (let i = 0; i < n; i++) write(i, toColor(color(pos.getX(i), pos.getY(i), pos.getZ(i), i)));
    }
  } else {
    const c = toColor(color);
    for (let i = 0; i < n; i++) write(i, c);
  }
  g.setAttribute('color', new BufferAttribute(col, 3));
  if (matrix) g.applyMatrix4(matrix);
  if (flat || !g.attributes.normal) {
    g.deleteAttribute('normal');
    g.computeVertexNormals();
  }
  return g;
}

/** Concatenates prepared parts into one geometry (position, normal, color, optional uv). */
export function merge(parts, { uv = false } = {}) {
  let count = 0;
  for (const g of parts) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const uvs = uv ? new Float32Array(count * 2) : null;
  let o = 0;
  for (const g of parts) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    if (uvs && g.attributes.uv) uvs.set(g.attributes.uv.array, o * 2);
    o += c;
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', new BufferAttribute(nor, 3));
  out.setAttribute('color', new BufferAttribute(col, 3));
  if (uvs) out.setAttribute('uv', new BufferAttribute(uvs, 2));
  out.computeBoundingSphere();
  return out;
}

/** Nudges vertices for a hand-cut look. Duplicated vertices move together, so no cracks. */
export function jitter(geometry, amount, seed = 1, weight) {
  const pos = geometry.attributes.position;
  const [ax, ay, az] = Array.isArray(amount) ? amount : [amount, amount, amount];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const kx = Math.round(x * 1000);
    const ky = Math.round(y * 1000);
    const kz = Math.round(z * 1000);
    const w = weight ? weight(x, y, z) : 1;
    pos.setXYZ(
      i,
      x + (hash3(kx, ky, kz, seed) - 0.5) * ax * w,
      y + (hash3(kx, ky, kz, seed + 1) - 0.5) * ay * w,
      z + (hash3(kx, ky, kz, seed + 2) - 0.5) * az * w,
    );
  }
  pos.needsUpdate = true;
  return geometry;
}

/** Plane whose UVs point at a sub-rectangle [u0, v0, u1, v1] of an atlas. */
export function atlasQuad(w, h, [u0, v0, u1, v1], flipU = false) {
  const g = new PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = flipU ? 1 - uv.getX(i) : uv.getX(i);
    uv.setXY(i, u0 + u * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  return g;
}

export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Static meshes don't need their matrices recomputed every frame. */
export function freeze(object) {
  object.traverse((o) => {
    o.updateMatrix();
    o.matrixAutoUpdate = false;
  });
  return object;
}

export function disposeTree(root) {
  const seen = new Set();
  root.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) {
      seen.add(o.geometry);
      o.geometry.dispose();
    }
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (seen.has(m)) continue;
      seen.add(m);
      for (const value of Object.values(m)) if (value?.isTexture && !seen.has(value)) (seen.add(value), value.dispose());
      if (m.uniforms) {
        for (const u of Object.values(m.uniforms)) {
          if (u.value?.isTexture && !seen.has(u.value)) (seen.add(u.value), u.value.dispose());
        }
      }
      m.dispose();
    }
    if (o.isInstancedMesh) o.dispose();
  });
}
