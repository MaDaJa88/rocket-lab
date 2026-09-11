"use client";

import { type RefObject, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";

import { VISUAL } from "@/lib/rocket-lab/constants";

function paintPlanet(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, "#e7f6ff");
  ocean.addColorStop(0.1, "#4aa6e0");
  ocean.addColorStop(0.28, "#1d78c9");
  ocean.addColorStop(0.5, "#125caa");
  ocean.addColorStop(0.78, "#0d4a91");
  ocean.addColorStop(0.92, "#3f8fd0");
  ocean.addColorStop(1, "#eef7ff");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);

  const blobs: [number, number, number, number, string][] = [
    [0.16, 0.4, 0.2, 0.26, "#2f9a4a"],
    [0.22, 0.46, 0.09, 0.08, "#d2b15a"],
    [0.47, 0.36, 0.28, 0.17, "#3dba5c"],
    [0.54, 0.3, 0.08, 0.07, "#e0c56a"],
    [0.78, 0.48, 0.2, 0.22, "#2d8f48"],
    [0.12, 0.6, 0.15, 0.1, "#45c46a"],
    [0.68, 0.58, 0.13, 0.09, "#d8b45c"],
    [0.36, 0.56, 0.07, 0.15, "#1f7a3c"],
    [0.88, 0.38, 0.08, 0.1, "#4ec86e"],
    [0.3, 0.34, 0.05, 0.04, "#c9a24a"],
  ];
  for (const [x, y, rx, ry, color] of blobs) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x * w, y * h, rx * w, ry * h, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(247,251,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 0, w * 0.58, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h, w * 0.58, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintClouds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  const puffs = [
    [0.2, 0.35, 0.18, 0.05],
    [0.55, 0.3, 0.22, 0.04],
    [0.8, 0.45, 0.16, 0.05],
    [0.35, 0.62, 0.2, 0.045],
    [0.7, 0.7, 0.14, 0.04],
    [0.1, 0.5, 0.12, 0.03],
    [0.42, 0.44, 0.1, 0.028],
    [0.92, 0.58, 0.11, 0.03],
  ];
  for (const [x, y, rx, ry] of puffs) {
    ctx.beginPath();
    ctx.ellipse(x * w, y * h, rx * w, ry * h, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

const globeVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldN;
  void main() {
    vUv = uv;
    vWorldN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const globeFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uLightDir;
  varying vec2 vUv;
  varying vec3 vWorldN;
  void main() {
    vec3 n = normalize(vWorldN);
    vec3 l = normalize(uLightDir);
    float ndl = dot(n, l);
    float day = smoothstep(-0.08, 0.42, ndl);
    vec3 albedo = texture2D(uMap, vUv).rgb;
    vec3 night = albedo * 0.07 + vec3(0.015, 0.03, 0.07);
    float spec = pow(max(0.0, ndl), 28.0) * 0.22;
    vec3 col = mix(night, albedo, day);
    col += vec3(0.75, 0.9, 1.0) * spec;
    float rim = pow(1.0 - abs(ndl), 3.2);
    col += vec3(1.0, 0.55, 0.25) * rim * (1.0 - day) * 0.18;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const glowVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const glowFragment = /* glsl */ `
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform float uGain;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.55);
    vec3 col = mix(uInner, uOuter, clamp(fresnel, 0.0, 1.0));
    gl_FragColor = vec4(col, fresnel * uGain);
  }
`;

/** Noon over the pad while you build and climb; the true Sun once you look back from space. */
const LAUNCH_LIGHT = new Vector3(48, 210, 90).normalize();
const _sunDir = new Vector3();

export function Earth({ voyageRef }: { voyageRef: RefObject<boolean> }) {
  const groupRef = useRef<Group>(null);
  const cloudRef = useRef<Mesh>(null);
  const blend = useRef(0);
  const { scene } = useThree();
  const textures = useMemo(() => {
    const planet = document.createElement("canvas");
    planet.width = 1024;
    planet.height = 512;
    const pctx = planet.getContext("2d");
    if (pctx) paintPlanet(pctx, planet.width, planet.height);
    const planetMap = new CanvasTexture(planet);
    planetMap.anisotropy = 8;

    const clouds = document.createElement("canvas");
    clouds.width = 1024;
    clouds.height = 512;
    const cctx = clouds.getContext("2d");
    if (cctx) paintClouds(cctx, clouds.width, clouds.height);
    const cloudMap = new CanvasTexture(clouds);
    cloudMap.anisotropy = 4;

    return { planetMap, cloudMap };
  }, []);

  const globe = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: globeVertex,
        fragmentShader: globeFragment,
        uniforms: {
          uMap: { value: textures.planetMap },
          uLightDir: { value: new Vector3(48, 210, 90).normalize() },
        },
      }),
    [textures.planetMap],
  );

  const atmosphere = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        uniforms: {
          uInner: { value: new Color("#7ddcfc") },
          uOuter: { value: new Color("#3b6cff") },
          uGain: { value: 0.82 },
        },
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
      }),
    [],
  );

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.018;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.028;
    const target = voyageRef.current ? 1 : 0;
    blend.current += (target - blend.current) * (1 - Math.pow(0.05, dt));
    const sun = scene.getObjectByName("sun") as DirectionalLight | undefined;
    if (sun && sun.position.lengthSq() > 1e-6) {
      _sunDir.copy(sun.position).normalize();
      (globe.uniforms.uLightDir.value as Vector3)
        .copy(LAUNCH_LIGHT)
        .lerp(_sunDir, blend.current)
        .normalize();
    }
  });

  const r = VISUAL.planetRadius;

  return (
    <group ref={groupRef} rotation={[0.55, 0.35, 0.15]}>
      <mesh>
        <sphereGeometry args={[r, 96, 72]} />
        <primitive object={globe} attach="material" />
      </mesh>
      <mesh ref={cloudRef}>
        <sphereGeometry args={[r * 1.012, 48, 32]} />
        <meshStandardMaterial
          map={textures.cloudMap}
          transparent
          opacity={0.5}
          depthWrite={false}
          roughness={1}
        />
      </mesh>
      <mesh scale={1.055}>
        <sphereGeometry args={[r, 48, 32]} />
        <primitive object={atmosphere} attach="material" />
      </mesh>
    </group>
  );
}
