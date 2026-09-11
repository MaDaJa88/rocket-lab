"use client";

import { type RefObject, useMemo, useRef } from "react";
import { Line as DreiLine } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from "three";

import { smooth01 } from "@/lib/rocket-lab/atmosphere";
import { PLANET, VISUAL } from "@/lib/rocket-lab/constants";
import { visualMoonPosition, visualRadiusForAltitude } from "@/lib/rocket-lab/physics";
import {
  MOON,
  SOLAR_PLANETS,
  SUN,
  geocentricVisual,
  sunVisual,
} from "@/lib/rocket-lab/solar-system";
import {
  INNER_BODIES,
  VOYAGE_STOPS,
  voyageVisualX,
  voyageWorldPosition,
} from "@/lib/rocket-lab/voyage";

import { createGlareTexture, createWorldTexture } from "./world-textures";

const _sun = new Vector3();
const _moon = new Vector3();
const _dir = new Vector3();
const _q = new Quaternion();

const LUNA_STOP = VOYAGE_STOPS.find((stop) => stop.id === "luna")!;
const PLUTO_STOP = VOYAGE_STOPS.find((stop) => stop.id === "pluto")!;
const EDGE_STOP = VOYAGE_STOPS.find((stop) => stop.id === "heliopause")!;
const SOL_STOP = INNER_BODIES.find((stop) => stop.id === "sol")!;
const TEXTURED = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "luna"];

/** Axial tilt in radians so bands and rings lean like the real worlds. */
const TILT: Record<string, number> = {
  mercury: 0,
  venus: 0.05,
  mars: 0.44,
  jupiter: 0.05,
  saturn: 0.47,
  uranus: 1.71,
  neptune: 0.49,
  pluto: 2.1,
  luna: 0.12,
};

/** Gentle visual spin, radians per second. Gas giants turn fastest, as they do. */
const SPIN: Record<string, number> = {
  jupiter: 0.09,
  saturn: 0.08,
  uranus: 0.05,
  neptune: 0.06,
  mars: 0.04,
  venus: 0.005,
  mercury: 0.01,
  pluto: 0.02,
  luna: 0.004,
};

const ringVertex = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Saturn's rings in the planet's local frame (planet radius = 1): banded
 * translucency, a Cassini-style gap, and the planet's own shadow cast across them.
 */
const ringFragment = /* glsl */ `
  uniform vec3 uLightLocal;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uInner;
  uniform float uOuter;
  varying vec2 vLocal;
  void main() {
    float r = length(vLocal);
    float x = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
    float density = 0.55 + 0.45 * sin(x * 60.0) * sin(x * 23.0 + 1.3);
    float gap = smoothstep(0.025, 0.0, abs(x - 0.62));
    float edge = smoothstep(0.0, 0.05, x) * smoothstep(1.0, 0.86, x);
    float alpha = density * edge * (1.0 - gap * 0.85) * 0.9;
    vec3 col = mix(uColorA, uColorB, 0.5 + 0.5 * sin(x * 31.0 + 0.4));
    vec3 p = vec3(vLocal, 0.0);
    vec3 L = normalize(uLightLocal);
    float along = dot(p, L);
    float perp = length(p - L * along);
    float shadow = along < 0.0 ? smoothstep(1.0, 0.9, perp) : 0.0;
    col *= 1.0 - 0.88 * shadow;
    col *= 0.4 + 0.6 * abs(L.z);
    gl_FragColor = vec4(col, alpha);
  }
`;

const gateVertex = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * The heliopause gate: one thin luminous hoop with a soft halo, so the end of
 * the road reads as a quiet threshold rather than a wall.
 */
const gateFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uCore;
  varying vec2 vLocal;
  void main() {
    float r = length(vLocal);
    float d = r - uCore;
    float core = exp(-d * d / 0.9);
    float halo = exp(-abs(d) / 14.0) * 0.16;
    float a = core * 0.8 + halo;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Hoop radius in scene units; the halo fades out well before the outer edge. */
const GATE_CORE = 56;
const GATE_OUTER = 150;

export function SolarSystem({
  timeRef,
  voyageRef,
}: {
  timeRef: RefObject<number>;
  voyageRef: RefObject<boolean>;
}) {
  const moonOrbitR = visualRadiusForAltitude(MOON.orbitRadius - PLANET.radius);
  const moonSizeSky = VISUAL.planetRadius * (MOON.radius / PLANET.radius);
  const moonRing = useMemo(() => ringPoints(moonOrbitR), [moonOrbitR]);
  const rail = useMemo(() => {
    const x1 = voyageVisualX(VOYAGE_STOPS[VOYAGE_STOPS.length - 1].auFromEarth);
    return [new Vector3(0, 0, 0), new Vector3(x1, 0, 0)];
  }, []);
  const { scene } = useThree();
  const blend = useRef(0);

  const textures = useMemo(() => {
    const map: Record<string, CanvasTexture> = {};
    for (const id of TEXTURED) map[id] = createWorldTexture(id);
    return map;
  }, []);
  const glare = useMemo(() => createGlareTexture(), []);
  const ringMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: {
          uLightLocal: { value: new Vector3(-1, 0.2, 0.3).normalize() },
          uColorA: { value: new Color("#eadcb6") },
          uColorB: { value: new Color("#bda67a") },
          uInner: { value: 1.24 },
          uOuter: { value: 2.32 },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  );
  const gateMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: gateVertex,
        fragmentShader: gateFragment,
        uniforms: {
          uColor: { value: new Color("#a9dcff") },
          uCore: { value: GATE_CORE },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        fog: false,
      }),
    [],
  );

  useFrame((state, dt) => {
    const voyaging = voyageRef.current;
    const target = voyaging ? 1 : 0;
    blend.current += (target - blend.current) * (1 - Math.pow(0.04, dt));
    if (Math.abs(target - blend.current) < 0.002) blend.current = target;
    const b = smooth01(blend.current);
    const skyT = state.clock.elapsedTime;
    const moonT = timeRef.current;

    const sunSky = sunVisual(skyT);
    const sunRail = voyageWorldPosition(SOL_STOP);
    _sun.set(
      MathUtils.lerp(sunSky.x, sunRail.x, b),
      0,
      MathUtils.lerp(sunSky.z, sunRail.z, b),
    );

    const moonSky = visualMoonPosition(moonT);
    const lunaRail = voyageWorldPosition(LUNA_STOP);
    _moon.set(
      MathUtils.lerp(moonSky.x, lunaRail.x, b),
      MathUtils.lerp(moonSky.y, 0, b),
      MathUtils.lerp(moonSky.z, lunaRail.z, b),
    );

    const light = scene.getObjectByName("sun") as DirectionalLight | undefined;
    if (light) {
      const len = Math.max(_sun.length(), 1);
      light.position.copy(_sun).multiplyScalar(220 / len);
    }
    const sol = scene.getObjectByName("sol-body");
    if (sol) sol.position.copy(_sun);

    const luna = scene.getObjectByName("luna") as Group | undefined;
    if (luna) {
      luna.position.copy(_moon);
      luna.scale.setScalar(MathUtils.lerp(moonSizeSky, lunaRail.radius, b));
      const body = luna.getObjectByName("body");
      if (body) body.rotation.y += dt * SPIN.luna;
    }
    const railLine = scene.getObjectByName("star-rail");
    if (railLine) railLine.visible = b > 0.02;
    const moonOrbit = scene.getObjectByName("luna-orbit");
    if (moonOrbit) moonOrbit.visible = b < 0.5;

    for (const planet of SOLAR_PLANETS) {
      if (planet.home) continue;
      const node = scene.getObjectByName(`planet-${planet.id}`) as Group | undefined;
      if (!node) continue;
      const sky = geocentricVisual(planet, skyT);
      const stop =
        INNER_BODIES.find((item) => item.id === planet.id) ??
        VOYAGE_STOPS.find((item) => item.id === planet.id);
      if (stop) {
        const railPos = voyageWorldPosition(stop);
        node.position.set(
          MathUtils.lerp(sky.x, railPos.x, b),
          0,
          MathUtils.lerp(sky.z, railPos.z, b),
        );
        node.scale.setScalar(MathUtils.lerp(planet.visualRadius, railPos.radius, b));
      } else {
        node.position.set(sky.x, 0, sky.z);
        node.scale.setScalar(planet.visualRadius);
      }
      const body = node.getObjectByName("body");
      if (body) body.rotation.y += dt * (SPIN[planet.id] ?? 0.02);
    }

    const pluto = scene.getObjectByName("planet-pluto") as Group | undefined;
    if (pluto) {
      pluto.visible = b > 0.02;
      const railPos = voyageWorldPosition(PLUTO_STOP);
      pluto.position.set(railPos.x, 0, railPos.z);
      pluto.scale.setScalar(railPos.radius);
      const body = pluto.getObjectByName("body");
      if (body) body.rotation.y += dt * SPIN.pluto;
    }
    const edge = scene.getObjectByName("planet-heliopause");
    if (edge) {
      edge.visible = b > 0.02;
      edge.position.set(voyageVisualX(EDGE_STOP.auFromEarth), 0, 0);
    }

    const saturn = scene.getObjectByName("planet-saturn") as Group | undefined;
    const ring = saturn?.getObjectByName("ring") as Mesh | undefined;
    if (saturn && ring) {
      _dir.copy(_sun).sub(saturn.position).normalize();
      ring.getWorldQuaternion(_q);
      _dir.applyQuaternion(_q.invert());
      (ringMaterial.uniforms.uLightLocal.value as Vector3).copy(_dir);
    }
  });

  return (
    <group>
      <group name="sol-body">
        <mesh>
          <sphereGeometry args={[SUN.visualRadius, 32, 24]} />
          <meshBasicMaterial color="#fff7dc" fog={false} toneMapped={false} />
        </mesh>
        <sprite scale={[SUN.visualRadius * 11, SUN.visualRadius * 11, 1]}>
          <spriteMaterial
            map={glare}
            color="#ffdca8"
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={AdditiveBlending}
            fog={false}
          />
        </sprite>
        <sprite scale={[0.055, 0.055, 1]}>
          <spriteMaterial
            map={glare}
            color="#fff1cf"
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={AdditiveBlending}
            sizeAttenuation={false}
            fog={false}
          />
        </sprite>
      </group>

      <group name="luna" rotation={[0, 0, TILT.luna]}>
        <mesh name="body">
          <sphereGeometry args={[1, 48, 32]} />
          <meshStandardMaterial map={textures.luna} roughness={0.95} metalness={0} />
        </mesh>
      </group>
      <group name="luna-orbit">
        <DreiLine points={moonRing} color="#d6d3c8" transparent opacity={0.22} />
      </group>
      <group name="star-rail" visible={false}>
        <DreiLine points={rail} color="#67e8f9" transparent opacity={0.2} />
      </group>

      {SOLAR_PLANETS.filter((planet) => !planet.home).map((planet) => (
        <group key={planet.id} name={`planet-${planet.id}`} rotation={[0, 0, TILT[planet.id] ?? 0]}>
          <mesh name="body">
            <sphereGeometry args={[1, 48, 32]} />
            <meshStandardMaterial
              map={textures[planet.id]}
              roughness={planet.id === "jupiter" || planet.ring ? 0.62 : 0.88}
              metalness={0}
              emissive={planet.color}
              emissiveIntensity={0.05}
            />
          </mesh>
          {planet.ring ? (
            <mesh name="ring" rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.24, 2.32, 128, 1]} />
              <primitive object={ringMaterial} attach="material" />
            </mesh>
          ) : null}
        </group>
      ))}

      <group name="planet-pluto" visible={false} rotation={[0, 0, TILT.pluto]}>
        <mesh name="body">
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial map={textures.pluto} roughness={0.9} metalness={0} />
        </mesh>
      </group>

      <group name="planet-heliopause" visible={false} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <ringGeometry args={[GATE_CORE * 0.55, GATE_OUTER, 128, 1]} />
          <primitive object={gateMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function ringPoints(radius: number) {
  const pts: Vector3[] = [];
  for (let i = 0; i <= 128; i += 1) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new Vector3(Math.sin(a) * radius, Math.cos(a) * radius, 0));
  }
  return pts;
}
