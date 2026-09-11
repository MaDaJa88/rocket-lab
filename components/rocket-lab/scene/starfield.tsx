"use client";

import { type RefObject, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  ShaderMaterial,
} from "three";

import type { LookState } from "./look-state";

/** Far enough that nothing in the scene reaches it, near enough for the depth buffer. */
const STAR_RADIUS = 4200;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Star colours by temperature, weighted like a real night sky: mostly white, a few blue and orange. */
const PALETTE = [
  { color: new Color("#b8ceff"), weight: 0.14 },
  { color: new Color("#dfe8ff"), weight: 0.22 },
  { color: new Color("#ffffff"), weight: 0.32 },
  { color: new Color("#fff3d6"), weight: 0.2 },
  { color: new Color("#ffd6a6"), weight: 0.09 },
  { color: new Color("#ffb489"), weight: 0.03 },
];

function pickColor(rng: () => number) {
  let r = rng();
  for (const entry of PALETTE) {
    r -= entry.weight;
    if (r <= 0) return entry.color;
  }
  return PALETTE[2].color;
}

/** The Milky Way band leans about 60° to Terra's equator, like the real galactic plane. */
const BAND_TILT_X = 1.05;
const BAND_TILT_Y = 0.6;

function bandDirection(rng: () => number, spread: number, out: Float32Array, at: number) {
  const a = rng() * Math.PI * 2;
  const lat = gaussian(rng) * spread;
  const cl = Math.cos(lat);
  let x = Math.cos(a) * cl;
  let y = Math.sin(lat);
  let z = Math.sin(a) * cl;
  const cx = Math.cos(BAND_TILT_X);
  const sx = Math.sin(BAND_TILT_X);
  const y1 = y * cx - z * sx;
  const z1 = y * sx + z * cx;
  y = y1;
  z = z1;
  const cy = Math.cos(BAND_TILT_Y);
  const sy = Math.sin(BAND_TILT_Y);
  const x2 = x * cy + z * sy;
  const z2 = -x * sy + z * cy;
  x = x2;
  z = z2;
  out[at] = x;
  out[at + 1] = y;
  out[at + 2] = z;
}

function uniformDirection(rng: () => number, out: Float32Array, at: number) {
  const z = rng() * 2 - 1;
  const phi = rng() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  out[at] = Math.cos(phi) * r;
  out[at + 1] = z;
  out[at + 2] = Math.sin(phi) * r;
}

type StarBatch = {
  count: number;
  seed: number;
  place: (rng: () => number, out: Float32Array, at: number) => void;
  size: (rng: () => number) => number;
  alpha: (rng: () => number) => number;
  color: (rng: () => number, out: Color) => void;
};

function buildBatch(batch: StarBatch) {
  const rng = mulberry32(batch.seed);
  const pos = new Float32Array(batch.count * 3);
  const size = new Float32Array(batch.count);
  const col = new Float32Array(batch.count * 3);
  const alpha = new Float32Array(batch.count);
  const twinkle = new Float32Array(batch.count);
  const tmp = new Color();
  for (let i = 0; i < batch.count; i += 1) {
    batch.place(rng, pos, i * 3);
    pos[i * 3] *= STAR_RADIUS;
    pos[i * 3 + 1] *= STAR_RADIUS;
    pos[i * 3 + 2] *= STAR_RADIUS;
    size[i] = batch.size(rng);
    alpha[i] = batch.alpha(rng);
    batch.color(rng, tmp);
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
    twinkle[i] = rng();
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new Float32BufferAttribute(size, 1));
  geo.setAttribute("aColor", new Float32BufferAttribute(col, 3));
  geo.setAttribute("aAlpha", new Float32BufferAttribute(alpha, 1));
  geo.setAttribute("aTwinkle", new Float32BufferAttribute(twinkle, 1));
  geo.computeBoundingSphere();
  return geo;
}

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aTwinkle;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uTwinkle;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (0.7 + aTwinkle * 2.3) + aTwinkle * 80.0));
    vAlpha = aAlpha * tw;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const starFragment = /* glsl */ `
  uniform float uFade;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    float a = smoothstep(0.25, 0.02, r2) * vAlpha * uFade;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

function starMaterial(twinkle: number) {
  return new ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    uniforms: {
      uPixelRatio: { value: 1 },
      uTime: { value: 0 },
      uTwinkle: { value: twinkle },
      uFade: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  });
}

/**
 * Thousands of individual stars with size and colour spread, a dense faint
 * Milky Way band, and a soft additive haze along it. Follows the camera so it
 * reads as infinitely far, and fades in as the air thins.
 */
export function Starfield({
  lookRef,
  reducedMotion,
}: {
  lookRef: RefObject<LookState>;
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const group = useRef<Group>(null);
  const geometries = useMemo(
    () => ({
      stars: buildBatch({
        count: 6000,
        seed: 11,
        place: uniformDirection,
        size: (rng) => 1.5 + 3.6 * Math.pow(rng(), 5),
        alpha: (rng) => 0.55 + 0.45 * Math.pow(rng(), 1.5),
        color: (rng, out) => out.copy(pickColor(rng)),
      }),
      band: buildBatch({
        count: 12000,
        seed: 23,
        place: (rng, out, at) => bandDirection(rng, 0.15, out, at),
        size: (rng) => 1.0 + 1.6 * Math.pow(rng(), 2),
        alpha: (rng) => 0.35 + 0.5 * Math.pow(rng(), 2),
        color: (rng, out) => out.copy(pickColor(rng)).lerp(new Color("#ffffff"), 0.3),
      }),
      haze: buildBatch({
        count: 900,
        seed: 37,
        place: (rng, out, at) => bandDirection(rng, 0.11, out, at),
        size: (rng) => 80 + 70 * rng(),
        alpha: (rng) => 0.05 + 0.04 * rng(),
        color: (rng, out) => {
          const t = rng();
          out.set(t < 0.5 ? "#9db7ff" : t < 0.8 ? "#ffe6c8" : "#d9c9ff");
        },
      }),
    }),
    [],
  );
  const materials = useMemo(
    () => ({ stars: starMaterial(0.22), band: starMaterial(0.12), haze: starMaterial(0) }),
    [],
  );

  useFrame((state) => {
    if (group.current) group.current.position.copy(camera.position);
    const fade = lookRef.current.star;
    const twinkle = reducedMotion ? 0 : 1;
    const dpr = state.gl.getPixelRatio();
    for (const key of ["stars", "band", "haze"] as const) {
      const mat = materials[key];
      mat.uniforms.uFade.value = fade;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      mat.uniforms.uPixelRatio.value = dpr;
      if (key !== "haze") mat.uniforms.uTwinkle.value = (key === "stars" ? 0.22 : 0.12) * twinkle;
    }
  });

  return (
    <group ref={group} name="starfield">
      <points geometry={geometries.haze} material={materials.haze} renderOrder={-9} frustumCulled={false} />
      <points geometry={geometries.band} material={materials.band} renderOrder={-8} frustumCulled={false} />
      <points geometry={geometries.stars} material={materials.stars} renderOrder={-8} frustumCulled={false} />
    </group>
  );
}
