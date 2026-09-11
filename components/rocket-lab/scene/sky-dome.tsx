"use client";

import { type RefObject, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BackSide, Color, Mesh, ShaderMaterial, Vector3 } from "three";

import { SKY_KEYFRAMES, sampleAtmosphere } from "@/lib/rocket-lab/atmosphere";

import type { LookState } from "./look-state";

const ZENITH = SKY_KEYFRAMES.map((key) => new Color(key.sky));
const HORIZON = SKY_KEYFRAMES.map((key) => new Color(key.horizon));
const _sunDir = new Vector3();
const _up = new Vector3();

const domeVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * A gradient sky that rides with the camera: pale haze along the horizon,
 * deeper colour overhead, and a warm scatter halo around the Sun that fades
 * away with the air. In space every colour collapses to near-black.
 */
const domeFragment = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uUp;
  uniform vec3 uSunDir;
  uniform float uHaze;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = dot(d, uUp);
    float k = smoothstep(-0.1, 0.42, h);
    vec3 col = mix(uHorizon, uZenith, k);
    float s = max(dot(d, uSunDir), 0.0);
    vec3 warm = vec3(1.0, 0.86, 0.62);
    col += warm * (pow(s, 48.0) * 0.55 + pow(s, 8.0) * 0.14) * uHaze;
    float limb = pow(max(1.0 - abs(h), 0.0), 14.0);
    col += vec3(1.0, 0.74, 0.52) * limb * s * s * 0.12 * uHaze;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SkyDome({ lookRef }: { lookRef: RefObject<LookState> }) {
  const { camera, scene } = useThree();
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: domeVertex,
        fragmentShader: domeFragment,
        uniforms: {
          uZenith: { value: new Color(SKY_KEYFRAMES[0].sky) },
          uHorizon: { value: new Color(SKY_KEYFRAMES[0].horizon) },
          uUp: { value: new Vector3(0, 1, 0) },
          uSunDir: { value: new Vector3(0.2, 0.9, 0.4).normalize() },
          uHaze: { value: 1 },
        },
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }),
    [],
  );

  useFrame(() => {
    const dome = mesh.current;
    if (!dome) return;
    dome.position.copy(camera.position);
    const look = sampleAtmosphere(lookRef.current.altitude);
    const a = look.i;
    const b = Math.min(a + 1, ZENITH.length - 1);
    (material.uniforms.uZenith.value as Color).lerpColors(ZENITH[a], ZENITH[b], look.t);
    (material.uniforms.uHorizon.value as Color).lerpColors(HORIZON[a], HORIZON[b], look.t);
    material.uniforms.uHaze.value = look.haze;
    _up.copy(camera.position);
    if (_up.lengthSq() < 1e-6) _up.set(0, 1, 0);
    else _up.normalize();
    (material.uniforms.uUp.value as Vector3).copy(_up);
    const sol = scene.getObjectByName("sol-body");
    if (sol) {
      _sunDir.copy(sol.position).sub(camera.position);
      if (_sunDir.lengthSq() > 1e-6) {
        _sunDir.normalize();
        (material.uniforms.uSunDir.value as Vector3).copy(_sunDir);
      }
    }
  });

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[50000, 48, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
