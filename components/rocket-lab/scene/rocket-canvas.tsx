"use client";

import { type RefObject, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";

import { SKY_KEYFRAMES, layerAt, sampleAtmosphere, smooth01 } from "@/lib/rocket-lab/atmosphere";
import { PLANET, VISUAL } from "@/lib/rocket-lab/constants";
import {
  createSim,
  resetSim,
  stepSim,
  telemetryOf,
  visualPosition,
} from "@/lib/rocket-lab/physics";
import type {
  AssembledRocket,
  MissionPhase,
  SimState,
  SteerInput,
  Telemetry,
} from "@/lib/rocket-lab/types";
import {
  VOYAGE_STOPS,
  voyageVisualX,
  voyageWorldPosition,
  voyageWorldRadius,
} from "@/lib/rocket-lab/voyage";

import { AtmosphereLayers } from "./atmosphere-layers";
import { Earth } from "./earth";
import type { LookState } from "./look-state";
import { RocketModel } from "./rocket-model";
import { SkyDome } from "./sky-dome";
import { SolarSystem } from "./solar-system";
import { SpaceEnvironment } from "./space-environment";
import { Starfield } from "./starfield";

const UP = new Vector3(0, 1, 0);
const _pos = new Vector3();
const _railPos = new Vector3();
const _att = new Vector3();
const _east = new Vector3();
const _radial = new Vector3();
const _look = new Vector3();
const _center = new Vector3();
const _railQuat = new Quaternion();
const _haloTarget = new Color();
const PAD_LOOK = new Vector3(0, VISUAL.planetRadius + 1.35, 0);
const SKY_COLORS = SKY_KEYFRAMES.map((key) => ({
  sky: new Color(key.sky),
  fog: new Color(key.fog),
}));

const CAMERA_INIT = {
  fov: 42,
  near: 0.12,
  far: 180000,
  position: [23, VISUAL.planetRadius + 16.5, 32] as [number, number, number],
};

const LIVE_FLIGHT = new Set(["orbit", "escape", "heliopause"]);
const ZOOM_MIN = 4.2;
const ZOOM_MAX = 9000;
const RAIL_DIR = new Vector3(1, 0, 0);
/** Camera distance the view eases out to once the ship is on the star road. */
const CRUISE_DIST = 96;
/** Real seconds to slide the ship from its climb onto the rail. */
const HANDOFF_SECONDS = 2.6;
/** Terra shrinks from the launch stage to its honest size beside the other worlds. */
const TERRA_HONEST_SCALE = voyageWorldRadius("terra") / VISUAL.planetRadius;
const TERRA_SHRINK_DELAY = 3;
const TERRA_SHRINK_SECONDS = 42;
/** Seconds without touch before the camera starts its slow drift. */
const DRIFT_DELAY = 6;
/** About nine minutes per lap around the ship. */
const DRIFT_YAW_RATE = 0.012;
/** During a pass the camera settles a little lower so the world sits in frame, not above it. */
const PASS_PITCH = 1.36;
/** And a touch to the side, so the world hangs ahead of the ship instead of behind it. */
const PASS_YAW_OFFSET = 0.22;

type SceneProps = {
  rocket: AssembledRocket;
  phase: MissionPhase;
  running: boolean;
  voyage: boolean;
  steerRef: RefObject<SteerInput>;
  warpRef: RefObject<number>;
  engineOn: boolean;
  reducedMotion: boolean;
  onTelemetry: (t: Telemetry) => void;
  onOutcome: (state: SimState) => void;
};

export function RocketCanvas(props: SceneProps) {
  const timeRef = useRef(0);
  const voyageRef = useRef(false);
  const lookRef = useRef<LookState>({ altitude: 0, star: 0 });
  return (
    <Canvas
      className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      camera={CAMERA_INIT}
      dpr={[1, 1.75]}
      resize={{ debounce: 0, offsetSize: true }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        gl.setClearColor("#9ad6fb", 1);
        const parent = canvas.parentElement;
        if (parent) gl.setSize(parent.clientWidth, parent.clientHeight, false);
      }}
    >
      <SpaceEnvironment />
      <SkyDome lookRef={lookRef} />
      <Starfield lookRef={lookRef} reducedMotion={props.reducedMotion} />
      <group name="terra-stage">
        <Earth voyageRef={voyageRef} />
        <AtmosphereLayers marks={!props.voyage} />
        <LaunchPad />
      </group>
      <FlightRig {...props} timeRef={timeRef} voyageRef={voyageRef} lookRef={lookRef} />
      <SolarSystem timeRef={timeRef} voyageRef={voyageRef} />
    </Canvas>
  );
}

function LaunchPad() {
  const y = VISUAL.planetRadius + 0.02;
  return (
    <group position={[0, y, 0]}>
      <pointLight position={[2.2, 6.5, 3.4]} intensity={1.35} distance={28} color="#fff3d0" />
      <mesh>
        <cylinderGeometry args={[1.15, 1.25, 0.08, 24]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[0.85, 0.85, 0.15]}>
        <boxGeometry args={[0.08, 1.7, 0.08]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0.85, 1.65, 0.15]}>
        <boxGeometry args={[0.55, 0.06, 0.12]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[0.85, 1.78, 0.15]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial
          color="#fb7185"
          emissive="#fb7185"
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

function FlightRig({
  rocket,
  phase,
  running,
  steerRef,
  warpRef,
  reducedMotion,
  engineOn,
  onTelemetry,
  onOutcome,
  timeRef,
  voyageRef,
  lookRef,
}: SceneProps & {
  timeRef: RefObject<number>;
  voyageRef: RefObject<boolean>;
  lookRef: RefObject<LookState>;
}) {
  const rocketRef = useRef<Group>(null);
  const rocketLive = useRef(rocket);
  rocketLive.current = rocket;
  const runningLive = useRef(running);
  runningLive.current = running;
  const phaseLive = useRef(phase);
  phaseLive.current = phase;
  const onOutcomeLive = useRef(onOutcome);
  onOutcomeLive.current = onOutcome;
  const onTelemetryLive = useRef(onTelemetry);
  onTelemetryLive.current = onTelemetry;
  const simRef = useRef<SimState>(createSim());
  const trailRef = useRef<Line>(null);
  const trailPts = useRef<number[]>([]);
  const lastHud = useRef(0);
  const lastOutcome = useRef<SimState["outcome"]>(null);
  const orbitYaw = useRef(0.62);
  const orbitPitch = useRef(1.22);
  const orbitDist = useRef(42);
  const dragging = useRef(false);
  const lastPtr = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef({ dist: 0, orbit: 42 });
  const { scene, camera, gl, size } = useThree();
  const sky = useRef(new Color("#87c6f5"));
  const hangarSpin = useRef(0);
  const haloRef = useRef<Mesh>(null);
  const wasVoyage = useRef(false);
  const voyageStartedAt = useRef(0);
  const handoffFrom = useRef(new Vector3());
  const handoffQuat = useRef(new Quaternion());
  const cruiseZoomTarget = useRef<number | null>(null);
  const lastInputMs = useRef(0);
  const drifting = useRef(false);
  const driftPitchBase = useRef(1.12);
  const driftT = useRef(0);
  const passBlend = useRef(0);

  const trailLine = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(6), 3));
    const mat = new LineBasicMaterial({
      color: "#ffc089",
      transparent: true,
      opacity: 0.78,
    });
    return new Line(geo, mat);
  }, []);

  useEffect(() => {
    trailRef.current = trailLine;
    // The climb trail belongs to Terra's stage so it shrinks away with the planet.
    const host = scene.getObjectByName("terra-stage") ?? scene;
    host.add(trailLine);
    return () => {
      host.remove(trailLine);
      trailLine.geometry.dispose();
      (trailLine.material as LineBasicMaterial).dispose();
    };
  }, [scene, trailLine]);

  useEffect(() => {
    if (phase === "hangar" || phase === "countdown") {
      resetSim(simRef.current, rocket);
      lastOutcome.current = null;
      trailPts.current = [];
      wasVoyage.current = false;
      voyageRef.current = false;
      cruiseZoomTarget.current = null;
      drifting.current = false;
    }
  }, [rocket, phase, voyageRef]);

  useEffect(() => {
    if (phase === "countdown") return;
    if (phase === "result") return;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    orbitYaw.current = 0.62;
    orbitPitch.current = phase === "hangar" ? (narrow ? 1.05 : 1.22) : 1.12;
    orbitDist.current = phase === "hangar" ? (narrow ? 34 : 42) : 52;
  }, [phase]);

  useEffect(() => {
    const el = gl.domElement;
    const touched = () => {
      lastInputMs.current = performance.now();
      drifting.current = false;
    };
    const pinchDist = () => {
      const pts = [...pointers.current.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      touched();
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.current.size >= 2) {
        dragging.current = false;
        pinch.current = { dist: pinchDist(), orbit: orbitDist.current };
        return;
      }
      dragging.current = true;
      lastPtr.current = { x: event.clientX, y: event.clientY };
    };
    const onMove = (event: PointerEvent) => {
      if (pointers.current.has(event.pointerId)) {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      if (pointers.current.size >= 2 && pinch.current.dist > 8) {
        const next = pinchDist();
        if (next > 8) {
          touched();
          cruiseZoomTarget.current = null;
          orbitDist.current = MathUtils.clamp(
            pinch.current.orbit * (pinch.current.dist / next),
            ZOOM_MIN,
            ZOOM_MAX,
          );
        }
        return;
      }
      if (!dragging.current) return;
      touched();
      const dx = event.clientX - lastPtr.current.x;
      const dy = event.clientY - lastPtr.current.y;
      lastPtr.current = { x: event.clientX, y: event.clientY };
      orbitYaw.current -= dx * 0.0055;
      orbitPitch.current = MathUtils.clamp(orbitPitch.current + dy * 0.0042, 0.08, 1.52);
    };
    const onUp = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) {
        pinch.current.dist = 0;
      }
      if (pointers.current.size === 0) dragging.current = false;
      else if (pointers.current.size === 1) {
        const remaining = [...pointers.current.values()][0];
        lastPtr.current = remaining;
        dragging.current = true;
      }
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      touched();
      cruiseZoomTarget.current = null;
      const factor = Math.exp(event.deltaY * 0.00115);
      orbitDist.current = MathUtils.clamp(orbitDist.current * factor, ZOOM_MIN, ZOOM_MAX);
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const sim = simRef.current;
    const now = state.clock.elapsedTime;
    const flying =
      phaseLive.current === "flight" || Boolean(sim.outcome && LIVE_FLIGHT.has(sim.outcome));
    sim.cruiseWarp = Math.max(1, warpRef.current ?? 1);
    if (flying) {
      stepSim(sim, rocketLive.current, steerRef.current ?? { pitch: 0 }, dt);
      if (sim.outcome && sim.outcome !== lastOutcome.current) {
        lastOutcome.current = sim.outcome;
        onOutcomeLive.current(sim);
      }
    }
    voyageRef.current = sim.voyage;
    if (sim.voyage && !wasVoyage.current) {
      wasVoyage.current = true;
      voyageStartedAt.current = now;
      handoffFrom.current.copy(_pos);
      if (rocketRef.current) handoffQuat.current.copy(rocketRef.current.quaternion);
      cruiseZoomTarget.current = Math.max(orbitDist.current, CRUISE_DIST);
    }
    timeRef.current =
      phaseLive.current === "hangar" || phaseLive.current === "countdown"
        ? state.clock.elapsedTime
        : sim.time;

    const vis = visualPosition(sim);
    _pos.set(vis.x, vis.y, vis.z);
    const mag = Math.max(_pos.length(), 0.001);
    _radial.copy(_pos).multiplyScalar(1 / mag);
    _east.set(_radial.y, -_radial.x, 0);
    if (_east.lengthSq() < 1e-8) _east.set(1, 0, 0);
    _east.normalize();
    _att
      .copy(_radial)
      .multiplyScalar(Math.cos(sim.theta))
      .addScaledVector(_east, Math.sin(sim.theta));
    _att.normalize();

    const sinceVoyage = now - voyageStartedAt.current;
    const group = rocketRef.current;
    if (group) {
      if (phaseLive.current === "hangar" || phaseLive.current === "countdown") {
        const padY = VISUAL.planetRadius + 0.12;
        group.position.set(0, padY, 0);
        hangarSpin.current += dt * (reducedMotion ? 0 : 0.35);
        group.rotation.set(0, hangarSpin.current, 0);
      } else if (sim.voyage) {
        // Slide from the last climb position onto the rail instead of jumping.
        const k = smooth01(sinceVoyage / HANDOFF_SECONDS);
        _railPos.copy(_pos);
        if (k < 1) _pos.lerpVectors(handoffFrom.current, _railPos, k);
        group.position.copy(_pos);
        _railQuat.setFromUnitVectors(UP, RAIL_DIR);
        if (k < 1) group.quaternion.slerpQuaternions(handoffQuat.current, _railQuat, k);
        else group.quaternion.copy(_railQuat);
      } else {
        group.position.copy(_pos);
        group.quaternion.setFromUnitVectors(UP, _att);
        group.rotateY(sim.roll);
        if (flying && state.clock.elapsedTime - lastHud.current > 0.09) {
          trailPts.current.push(vis.x, vis.y, vis.z);
          if (trailPts.current.length > 2400) trailPts.current.splice(0, 120);
          const attr = new Float32BufferAttribute(new Float32Array(trailPts.current), 3);
          trailLine.geometry.setAttribute("position", attr);
          trailLine.geometry.setDrawRange(0, trailPts.current.length / 3);
          trailLine.geometry.computeBoundingSphere();
        }
      }
    }

    // Terra shrinks to its honest size beside the other worlds: the pale blue dot.
    let stageScale = 1;
    if (sim.voyage) {
      const k = smooth01((sinceVoyage - TERRA_SHRINK_DELAY) / TERRA_SHRINK_SECONDS);
      stageScale = 1 + (TERRA_HONEST_SCALE - 1) * k;
    }
    const stage = scene.getObjectByName("terra-stage");
    if (stage) stage.scale.setScalar(stageScale);

    const physR = Math.hypot(sim.x, sim.y, sim.z);
    const altitude = sim.voyage ? 90_000 : physR - PLANET.radius;
    const layer = layerAt(altitude);
    const haloMat = haloRef.current?.material as MeshBasicMaterial | undefined;
    if (haloMat) {
      _haloTarget.set(layer.accent);
      haloMat.color.lerp(_haloTarget, 1 - Math.pow(0.012, dt));
    }
    const look = sampleAtmosphere(altitude);
    paintSky(sky.current, look);
    scene.background = sky.current;
    state.gl.setClearColor(sky.current, 1);
    const zoomedOut = orbitDist.current > 140;
    if (scene.fog) {
      const fog = scene.fog as Fog;
      tuneFog(fog, look);
      if (zoomedOut || sim.voyage) {
        fog.near = Math.min(fog.near, sim.voyage ? 120 : 900);
        fog.far = Math.max(fog.far, sim.voyage ? 9000 : 14000);
      }
    }
    lookRef.current.altitude = altitude;
    lookRef.current.star = Math.max(look.star, zoomedOut ? 0.85 : 0);
    tuneLights(scene, look);

    const hangarView =
      phaseLive.current === "hangar" ||
      phaseLive.current === "countdown" ||
      (phaseLive.current === "result" && !sim.airborne);
    if (hangarView) {
      _look.copy(PAD_LOOK);
      // The hangar sheet covers the lower half on a phone, so aim below the
      // rocket and it sits in the open sky above the panel.
      if (size.width < 768) {
        const halfH =
          Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360) * orbitDist.current;
        _look.y -= halfH * 0.62;
      }
    } else _look.copy(_pos);

    // Ease out to cruise distance once, unless the viewer has taken the wheel.
    const zoomTarget = cruiseZoomTarget.current;
    if (zoomTarget !== null) {
      orbitDist.current += (zoomTarget - orbitDist.current) * (1 - Math.pow(0.08, dt));
      if (Math.abs(zoomTarget - orbitDist.current) < 0.3) cruiseZoomTarget.current = null;
    }

    // Left alone on the star road, the camera drifts slowly around the ship.
    // While a world is near, the drift settles on the far side so the world
    // stays in frame past the ship — the look target and zoom never change.
    const idleFor = (performance.now() - lastInputMs.current) / 1000;
    if (sim.voyage && !reducedMotion && idleFor > DRIFT_DELAY) {
      const ramp = Math.min(1, (idleFor - DRIFT_DELAY) / 10);
      if (!drifting.current) {
        drifting.current = true;
        driftPitchBase.current = orbitPitch.current;
        driftT.current = 0;
      }
      driftT.current += dt * ramp;
      const frameYaw = passingWorldYaw(sim, _pos);
      passBlend.current += ((frameYaw !== null ? 1 : 0) - passBlend.current) * (1 - Math.pow(0.5, dt));
      if (frameYaw !== null) {
        const delta = Math.atan2(
          Math.sin(frameYaw - orbitYaw.current),
          Math.cos(frameYaw - orbitYaw.current),
        );
        orbitYaw.current += delta * (1 - Math.pow(0.45, dt)) * ramp;
      } else {
        orbitYaw.current += dt * DRIFT_YAW_RATE * ramp;
      }
      const wander = driftPitchBase.current + Math.sin(driftT.current * 0.09) * 0.07 * ramp;
      orbitPitch.current = MathUtils.clamp(
        MathUtils.lerp(wander, PASS_PITCH, passBlend.current * ramp),
        0.08,
        1.52,
      );
    } else {
      passBlend.current = 0;
      if (!sim.voyage) drifting.current = false;
    }

    const dist = orbitDist.current;
    const pitch = orbitPitch.current;
    const yaw = orbitYaw.current;
    const sp = Math.sin(pitch);
    camera.position.set(
      _look.x + dist * sp * Math.sin(yaw),
      _look.y + dist * Math.cos(pitch),
      _look.z + dist * sp * Math.cos(yaw),
    );
    if (!sim.voyage) {
      const minCamR = VISUAL.planetRadius + 1.5;
      const camR = camera.position.length();
      if (camR < minCamR && camR > 0.001) camera.position.multiplyScalar(minCamR / camR);
    } else {
      keepCameraOutsideWorlds(camera.position, _pos.x, stageScale);
    }
    camera.lookAt(_look);
    if (sim.voyage && camera.far < 180000) {
      camera.far = 180000;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();

    if (now - lastHud.current > 0.1) {
      lastHud.current = now;
      onTelemetryLive.current(telemetryOf(sim, rocketLive.current));
    }
  });

  return (
    <group ref={rocketRef} scale={1.22}>
      <RocketModel
        key={`${rocket.design.nose}-${rocket.design.body}-${rocket.design.fins}-${rocket.design.engine}-${rocket.design.paint}`}
        design={rocket.design}
        engineOn={engineOn}
      />
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <torusGeometry args={[1.42, 0.055, 8, 40]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Yaw that puts the camera on the far side of the ship from the world being passed. */
function passingWorldYaw(sim: SimState, ship: Vector3) {
  // Luna is a pebble at honest scale and gone in a second; Terra is the view itself.
  if (!sim.flybyId || sim.flybyId === "heliopause" || sim.flybyId === "terra" || sim.flybyId === "luna") {
    return null;
  }
  const stop = VOYAGE_STOPS.find((item) => item.id === sim.flybyId);
  if (!stop) return null;
  const world = voyageWorldPosition(stop);
  const dx = world.x - ship.x;
  const dz = world.z - ship.z;
  if (Math.hypot(dx, dz) < 1e-3) return null;
  // Ringed worlds are wide on screen, so they get less of a sideways nudge.
  return Math.atan2(-dx, -dz) + PASS_YAW_OFFSET * (stop.ring ? 0.4 : 1);
}

/** The orbit camera may swing wide, but never inside the nearest world. */
function keepCameraOutsideWorlds(cameraPos: Vector3, shipX: number, terraScale: number) {
  let nearest = VOYAGE_STOPS[0];
  let nearestGap = Number.POSITIVE_INFINITY;
  for (const stop of VOYAGE_STOPS) {
    const gap = Math.abs(voyageVisualX(stop.auFromEarth) - shipX);
    if (gap < nearestGap) {
      nearestGap = gap;
      nearest = stop;
    }
  }
  let radius: number;
  if (nearest.id === "terra") {
    _center.set(0, 0, 0);
    radius = VISUAL.planetRadius * terraScale * 1.08;
  } else {
    const world = voyageWorldPosition(nearest);
    _center.set(world.x, world.y, world.z);
    radius = world.radius * (nearest.ring ? 2.4 : 1.15);
  }
  const minD = radius + 3;
  const d = cameraPos.distanceTo(_center);
  if (d < minD && d > 1e-4) {
    cameraPos.sub(_center).multiplyScalar(minD / d).add(_center);
  }
}

function paintSky(out: Color, look: ReturnType<typeof sampleAtmosphere>) {
  const a = SKY_COLORS[look.i];
  const b = SKY_COLORS[look.i + 1] ?? a;
  out.lerpColors(a.sky, b.sky, look.t);
}

function tuneFog(fog: Fog | null, look: ReturnType<typeof sampleAtmosphere>) {
  if (!fog) return;
  const a = SKY_COLORS[look.i];
  const b = SKY_COLORS[look.i + 1] ?? a;
  fog.color.lerpColors(a.fog, b.fog, look.t);
  fog.near = look.fogNear;
  fog.far = look.fogFar;
}

function tuneLights(
  scene: { getObjectByName: (n: string) => unknown },
  look: ReturnType<typeof sampleAtmosphere>,
) {
  const amb = scene.getObjectByName("amb") as AmbientLight | undefined;
  const sun = scene.getObjectByName("sun") as DirectionalLight | undefined;
  const hemi = scene.getObjectByName("hemi") as HemisphereLight | undefined;
  const fill = scene.getObjectByName("fill") as DirectionalLight | undefined;
  if (amb) amb.intensity = look.amb;
  if (sun) sun.intensity = look.sun;
  if (hemi) hemi.intensity = look.hemi;
  if (fill) fill.intensity = 0.18 + look.hemi * 0.4;
}
