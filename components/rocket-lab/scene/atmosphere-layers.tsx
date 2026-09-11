"use client";

import { useMemo, useRef } from "react";
import { Html, Line as DreiLine } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";

import { ATMOSPHERE_LAYERS, LAYER_SHELL_ALTS } from "@/lib/rocket-lab/atmosphere";
import { VISUAL } from "@/lib/rocket-lab/constants";
import { visualRadiusForAltitude } from "@/lib/rocket-lab/physics";

function paintHighClouds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  const puffs = [
    [0.18, 0.28, 0.2, 0.045],
    [0.48, 0.22, 0.26, 0.05],
    [0.78, 0.34, 0.18, 0.04],
    [0.3, 0.55, 0.22, 0.038],
    [0.62, 0.62, 0.2, 0.042],
    [0.12, 0.72, 0.16, 0.03],
    [0.88, 0.7, 0.14, 0.028],
  ];
  for (const [x, y, rx, ry] of puffs) {
    ctx.beginPath();
    ctx.ellipse(x * w, y * h, rx * w, ry * h, 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ringPoints(radius: number) {
  const pts: Vector3[] = [];
  for (let i = 0; i <= 160; i += 1) {
    const a = (i / 160) * Math.PI * 2;
    pts.push(new Vector3(Math.sin(a) * radius, Math.cos(a) * radius, 0));
  }
  return pts;
}

const shellVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const shellFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGain;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.8);
    gl_FragColor = vec4(uColor, fresnel * uGain);
  }
`;

function FresnelShell({
  radius,
  color,
  gain,
}: {
  radius: number;
  color: string;
  gain: number;
}) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: shellVertex,
        fragmentShader: shellFragment,
        uniforms: {
          uColor: { value: new Color(color) },
          uGain: { value: gain },
        },
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
      }),
    [color, gain],
  );
  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function LayerTorus({
  radius,
  color,
  tube = 0.34,
  rotation,
  opacity = 0.72,
}: {
  radius: number;
  color: string;
  tube?: number;
  rotation: [number, number, number];
  opacity?: number;
}) {
  return (
    <mesh rotation={rotation}>
      <torusGeometry args={[radius, tube, 10, 96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function LayerLabel({
  position,
  label,
  accent,
}: {
  position: [number, number, number];
  label: string;
  accent: string;
}) {
  return (
    <Html
      position={position}
      center
      sprite
      pointerEvents="none"
      zIndexRange={[5, 0]}
    >
      <div
        className="whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold tracking-wide text-slate-950 shadow-lg sm:text-sm"
        style={{
          background: accent,
          borderColor: "rgba(255,255,255,0.45)",
          fontFamily: "var(--font-fredoka), Fredoka, sans-serif",
        }}
      >
        {label}
      </div>
    </Html>
  );
}

/**
 * The soft glow shells always stay. The rings, labels, and ladder are the
 * lesson while you climb; on the star road they go away so Terra reads as a world.
 */
export function AtmosphereLayers({ marks }: { marks: boolean }) {
  const tropoR = visualRadiusForAltitude(LAYER_SHELL_ALTS.tropo);
  const cloudR = visualRadiusForAltitude(LAYER_SHELL_ALTS.clouds);
  const stratoR = visualRadiusForAltitude(LAYER_SHELL_ALTS.strato);
  const spaceR = visualRadiusForAltitude(LAYER_SHELL_ALTS.space);
  const planetR = VISUAL.planetRadius;
  const cloudRef = useRef<Mesh>(null);

  const cloudMap = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) paintHighClouds(ctx, canvas.width, canvas.height);
    const map = new CanvasTexture(canvas);
    map.anisotropy = 4;
    return map;
  }, []);

  const tropoRing = useMemo(() => ringPoints(tropoR), [tropoR]);
  const stratoRing = useMemo(() => ringPoints(stratoR), [stratoR]);
  const spaceRing = useMemo(() => ringPoints(spaceR), [spaceR]);

  useFrame((_, dt) => {
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.018;
  });

  const labelX = 7.2;

  return (
    <group>
      <FresnelShell radius={tropoR} color="#63b9f7" gain={0.3} />
      {marks ? (
        <>
          <FresnelShell radius={stratoR} color="#a78bfa" gain={0.38} />
          <FresnelShell radius={spaceR} color="#fde68a" gain={0.28} />
        </>
      ) : null}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[cloudR, 48, 32]} />
        <meshStandardMaterial
          map={cloudMap}
          transparent
          opacity={0.36}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {marks ? (
        <group>
          <mesh position={[0, planetR + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.7, 2.85, 48]} />
            <meshBasicMaterial
              color="#4ade80"
              transparent
              opacity={0.45}
              side={DoubleSide}
              depthWrite={false}
            />
          </mesh>

          <LayerTorus radius={tropoR} color="#38bdf8" tube={0.22} opacity={0.5} rotation={[Math.PI / 2, 0, 0]} />
          <LayerTorus radius={stratoR} color="#c4b5fd" tube={0.22} opacity={0.5} rotation={[Math.PI / 2, 0, 0]} />
          <LayerTorus radius={spaceR} color="#fde68a" tube={0.26} opacity={0.55} rotation={[Math.PI / 2, 0, 0]} />

          <DreiLine points={tropoRing} color="#7dd3fc" transparent opacity={0.4} />
          <DreiLine points={stratoRing} color="#c4b5fd" transparent opacity={0.45} />
          <DreiLine points={spaceRing} color="#fde68a" transparent opacity={0.5} />

          <LayerLabel
            position={[labelX, planetR + 2.4, 0]}
            label={ATMOSPHERE_LAYERS[0].kidName}
            accent={ATMOSPHERE_LAYERS[0].accent}
          />
          <LayerLabel
            position={[labelX, tropoR, 0]}
            label={ATMOSPHERE_LAYERS[1].kidName}
            accent={ATMOSPHERE_LAYERS[1].accent}
          />
          <LayerLabel
            position={[labelX, stratoR, 0]}
            label={ATMOSPHERE_LAYERS[2].kidName}
            accent={ATMOSPHERE_LAYERS[2].accent}
          />
          <LayerLabel
            position={[labelX, spaceR, 0]}
            label={ATMOSPHERE_LAYERS[3].kidName}
            accent={ATMOSPHERE_LAYERS[3].accent}
          />
        </group>
      ) : null}
    </group>
  );
}
