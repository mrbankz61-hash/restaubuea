import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uBottom;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uSun;
  uniform float uStars;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 col = mix(uBottom, uMid, smoothstep(-0.06, 0.16, h));
    col = mix(col, uTop, smoothstep(0.12, 0.62, h));

    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunColor * (pow(sd, 7.0) * 0.26 + pow(sd, 260.0) * 1.4) * uSun;

    float s = hash(floor(dir * 420.0));
    float star = step(0.9972, s) * smoothstep(0.04, 0.4, h);
    col += star * uStars * (0.55 + 0.45 * sin(uTime * 1.7 + s * 80.0)) * vec3(1.6, 1.5, 1.35);

    col *= mix(0.5, 1.0, smoothstep(-0.25, 0.0, h));
    col += (hash(vec3(gl_FragCoord.xy, 1.0)) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Gradient sky dome with a low sun and twinkling stars. It follows the camera, so it never ends. */
export function createSky(shared) {
  const uniforms = {
    uTop: { value: new Color() },
    uMid: { value: new Color() },
    uBottom: { value: new Color() },
    uSunColor: { value: new Color() },
    uSunDir: { value: new Vector3(-0.5, 0.05, -0.86).normalize() },
    uSun: { value: 1 },
    uStars: { value: 0 },
    uTime: shared.time,
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new Mesh(new SphereGeometry(800, 32, 16), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  mesh.name = 'sky';
  return { mesh, uniforms };
}
