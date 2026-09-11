import { G0, LIGHT_C, PLANET, SIM, VISUAL, VISUAL_SCALE } from "./constants";
import { MOON, circularSpeed, escapeSpeed, moonPosition } from "./solar-system";
import {
  AU_M,
  DEFAULT_CRUISE_WARP,
  FLYBY_INFO,
  FLYBY_LINGER,
  HELIOPAUSE_AU,
  easedWarp,
  etaSeconds,
  metersToAU,
  nearbyStop,
  nextStop,
  nextWindowStartAU,
  voyageVisualX,
} from "./voyage";
import type { AssembledRocket, FlightOutcome, SimState, SteerInput, Telemetry } from "./types";

function hypot3(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

function density(altitude: number) {
  if (altitude <= 0) return PLANET.rho0 * 1.15;
  if (altitude > PLANET.atmosphereTop) return 0;
  return PLANET.rho0 * Math.exp(-altitude / PLANET.scaleHeight);
}

function orbitalElements(state: SimState) {
  const r = hypot3(state.x, state.y, state.z);
  const v = hypot3(state.vx, state.vy, state.vz);
  const mu = PLANET.mu;
  const hx = state.y * state.vz - state.z * state.vy;
  const hy = state.z * state.vx - state.x * state.vz;
  const hz = state.x * state.vy - state.y * state.vx;
  const h = hypot3(hx, hy, hz);
  const energy = (v * v) / 2 - mu / Math.max(r, 1);
  const a = energy < 0 ? -mu / (2 * energy) : Infinity;
  const e = Math.min(3, Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (mu * mu))));
  const peri = Number.isFinite(a) ? a * (1 - e) : 0;
  const apo = Number.isFinite(a) ? a * (1 + e) : r + (v * v) / (2 * PLANET.surfaceG);
  return {
    periapsis: peri - PLANET.radius,
    apoapsis: apo - PLANET.radius,
    eccentricity: e,
    bound: energy < 0,
    energy,
  };
}

export function createSim(): SimState {
  const y = PLANET.radius + 2.2;
  return {
    x: 0,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    theta: 0,
    omega: 0,
    roll: 0,
    rollRate: 0,
    fuel: 0,
    time: 0,
    throttle: 1,
    maxAltitude: 0,
    maxSpeed: 0,
    heating: 0,
    airborne: false,
    outcome: null,
    reason: "",
    phaseLabel: "On the pad",
    apoapsis: 0,
    periapsis: 0,
    eccentricity: 1,
    inSpace: false,
    engineOn: false,
    bound: true,
    voyage: false,
    voyageMeters: 0,
    voyageTime: 0,
    cruiseWarp: DEFAULT_CRUISE_WARP,
    flybyId: null,
    flybyLinger: 0,
  };
}

export function resetSim(state: SimState, rocket: AssembledRocket) {
  const fresh = createSim();
  Object.assign(state, fresh);
  state.fuel = rocket.fuelMass;
}

function stabilityFail(rocket: AssembledRocket) {
  return rocket.stabilityCalibers < 0.06 || rocket.design.fins === "none";
}

const LIVE_OUTCOMES = new Set<FlightOutcome>(["orbit", "escape", "heliopause"]);

function setOutcome(state: SimState, outcome: FlightOutcome, reason: string) {
  if (!state.outcome) {
    state.outcome = outcome;
    state.reason = reason;
    return;
  }
  if (!LIVE_OUTCOMES.has(state.outcome)) return;
  if (outcome === "orbit") return;
  if (outcome === "escape" || outcome === "moon" || outcome === "crash" || outcome === "spacefall") {
    state.outcome = outcome;
    state.reason = reason;
  }
}

function guidancePitch(
  altitude: number,
  radialVel: number,
  circularizing: boolean,
  starDrive: boolean,
) {
  if (starDrive) {
    return Math.min(0.22, Math.max(0, altitude / 120_000));
  }
  if (circularizing) {
    const down = Math.max(0, Math.min(0.28, radialVel / 1600));
    return Math.PI / 2 + down;
  }
  if (altitude < 600) return 0.07;
  const t = Math.min(1, Math.max(0, (altitude - 600) / 46_000));
  return 0.07 + Math.pow(t, 0.9) * 1.28;
}

function stepOnce(state: SimState, rocket: AssembledRocket, steer: SteerInput, dt: number) {
  if (state.outcome === "moon" || state.outcome === "heliopause") return;
  if (state.voyage) return;
  if (state.outcome && !LIVE_OUTCOMES.has(state.outcome)) return;

  const r = hypot3(state.x, state.y, state.z);
  if (r < 1) return;
  const altitude = r - PLANET.radius;
  const rho = density(altitude);
  const speed = hypot3(state.vx, state.vy, state.vz);
  const mass = rocket.dryMass + Math.max(0, state.fuel);
  const radialX = state.x / r;
  const radialY = state.y / r;
  const radialZ = state.z / r;

  const eastX = radialY;
  const eastY = -radialX;
  const eastZ = 0;
  const eastMag = hypot3(eastX, eastY, eastZ) || 1;
  const eX = eastX / eastMag;
  const eY = eastY / eastMag;
  const eZ = eastZ / eastMag;

  const orb = orbitalElements(state);
  state.apoapsis = orb.apoapsis;
  state.periapsis = orb.periapsis;
  state.eccentricity = orb.eccentricity;
  state.bound = orb.bound;
  state.inSpace = altitude > PLANET.karmanLine;
  state.maxAltitude = Math.max(state.maxAltitude, altitude);
  state.maxSpeed = Math.max(state.maxSpeed, speed);
  state.time += dt;

  if (
    !state.voyage &&
    !state.outcome &&
    state.airborne &&
    altitude > PLANET.karmanLine
  ) {
    beginVoyage(state, altitude);
    return;
  }

  const q = 0.5 * rho * speed * speed;
  state.heating = q * speed;

  const moon = moonPosition(state.time);
  const mdx = moon.x - state.x;
  const mdy = moon.y - state.y;
  const mdz = moon.z - state.z;
  const moonDist = hypot3(mdx, mdy, mdz);

  if (altitude < -2) {
    setOutcome(state, "crash", "hit-ground");
    return;
  }

  const moonAlt = MOON.orbitRadius - PLANET.radius;
  if (
    (state.outcome === "orbit" || state.outcome === "escape") &&
    altitude > 380_000 &&
    (orb.apoapsis > moonAlt * 0.72 || moonDist < MOON.radius + MOON.encounter)
  ) {
    setOutcome(state, "moon", "lunar-transfer");
    state.phaseLabel = "Arrived at Luna!";
    return;
  }

  if (!state.airborne && altitude > 8 && speed > 12) {
    state.airborne = true;
  }

  const live = Boolean(state.outcome && LIVE_OUTCOMES.has(state.outcome));

  if (state.airborne && altitude < 1.2 && speed > SIM.crashSpeed) {
    if (!live) {
      if (state.maxAltitude > PLANET.karmanLine && orb.periapsis < PLANET.karmanLine * 0.5) {
        setOutcome(state, "spacefall", "fell-from-space");
      } else if (state.maxAltitude > 18_000) {
        setOutcome(state, "suborbital", "fell-back");
      } else {
        setOutcome(state, "crash", "hit-ground");
      }
      return;
    }
    setOutcome(state, "crash", "hit-ground");
    return;
  }

  const radialVel = state.vx * radialX + state.vy * radialY + state.vz * radialZ;
  const heatLoad = state.heating * rocket.cdA;
  const descending = radialVel < -40;
  const draggy = rocket.cdA > 0.85;
  if (
    !live &&
    rho > 0.03 &&
    speed > 280 &&
    ((descending && heatLoad > SIM.maxHeating * 0.35) ||
      (draggy && heatLoad > SIM.maxHeating * 0.55 && altitude < 42_000))
  ) {
    setOutcome(state, "burnup", "aero-heat");
    return;
  }

  if (
    !live &&
    ((Math.abs(state.omega) > SIM.tumbleBreakup && rho > 0.03 && speed > 70) ||
      (stabilityFail(rocket) && q > 900 && Math.abs(state.omega) > 2.4 && speed > 90))
  ) {
    setOutcome(state, "tumble", "spun-out");
    return;
  }

  const vCirc = circularSpeed(r);
  const vEsc = escapeSpeed(r);
  const horizSpeed = state.vx * eX + state.vy * eY + state.vz * eZ;
  const horizFrac = speed > 1 ? Math.abs(horizSpeed) / speed : 0;
  const circularEnough =
    orb.bound &&
    orb.periapsis > PLANET.karmanLine + 4_000 &&
    orb.apoapsis < PLANET.targetOrbit + 58_000 &&
    orb.eccentricity < 0.2 &&
    Math.abs(speed - vCirc) / Math.max(vCirc, 1) < 0.11 &&
    horizFrac > 0.86 &&
    Math.abs(radialVel) < 220 &&
    altitude > PLANET.karmanLine &&
    state.time > 18;

  if (circularEnough) {
    setOutcome(state, "orbit", "circular-enough");
  }

  if (
    !orb.bound &&
    altitude > 200_000 &&
    speed > vEsc * 0.98 &&
    state.time > 22
  ) {
    setOutcome(state, "escape", "unbound");
  }


  const massNow = rocket.dryMass + Math.max(0, state.fuel);
  const liveTwr = rocket.thrust / Math.max(massNow * PLANET.surfaceG, 1);
  if (
    !live &&
    state.time > 4.5 &&
    !state.airborne &&
    speed < 8 &&
    altitude < 20 &&
    liveTwr < 1.04
  ) {
    setOutcome(state, "pad", "no-liftoff");
    return;
  }

  const userMoonBurn = Math.abs(steer.pitch) > 0.2 && altitude > PLANET.karmanLine && state.fuel > 0;
  const circularizing = altitude > 52_000;
  const autoPitch = guidancePitch(
    altitude,
    radialVel,
    circularizing,
    rocket.topSpeedC >= 0.04,
  );
  const flightPath =
    speed > 8
      ? Math.atan2(
          state.vx * eX + state.vy * eY + state.vz * eZ,
          state.vx * radialX + state.vy * radialY + state.vz * radialZ,
        )
      : 0;

  let targetTheta = autoPitch + steer.pitch * 0.5;
  if (userMoonBurn) {
    targetTheta = speed > 8 ? flightPath : Math.PI / 2;
  } else if (circularizing) {
    targetTheta = Math.PI / 2 + steer.pitch * 0.22;
  }

  if (userMoonBurn) {
    state.phaseLabel = "Burning toward Luna — hold it!";
  } else if (state.outcome === "orbit") {
    state.phaseLabel = "Orbiting Terra — hold arrows to push for the Moon";
  } else if (state.outcome === "escape") {
    state.phaseLabel = "Free of Terra — sailing the solar system";
  } else if (altitude < 2500) {
    state.phaseLabel = "Straight up — punching the sky";
  } else if (altitude < 28_000) {
    state.phaseLabel = "Gravity turn — tipping east";
  } else if (altitude < PLANET.karmanLine) {
    state.phaseLabel = "Racing the thinning air";
  } else if (speed < vCirc * 0.96) {
    state.phaseLabel = "Speeding up to catch a circle";
  } else {
    state.phaseLabel = "Rounding out the orbit";
  }

  if (!userMoonBurn && state.fuel <= 0 && altitude > PLANET.karmanLine && state.outcome !== "orbit") {
    state.phaseLabel = "Out of fuel — hoping for orbit";
  } else if (state.fuel <= 0 && !state.outcome) {
    state.phaseLabel = "Out of fuel — falling";
  }

  const stability = rocket.stabilityCalibers;
  const authority = Math.max(0, Math.min(1, (stability - 0.02) / 0.16));
  const aoa = state.theta - flightPath;
  const lever = rocket.comFromTail - rocket.copFromTail;
  const aeroTorque = -q * rocket.refArea * lever * Math.sin(aoa) * 0.18;
  const wobbleSeed =
    (rocket.design.nose === "cube" ||
    rocket.design.nose === "saucer" ||
    rocket.design.nose === "hammer"
      ? 1.1
      : 0.18) +
    (rocket.design.body === "orb" ? 0.35 : 0) +
    (rocket.design.fins === "none" ? 1.6 : rocket.design.fins === "stubs" ? 0.45 : rocket.design.fins === "petal" ? 0.55 : 0);
  const noise =
    (Math.sin(state.time * 7.1) + Math.sin(state.time * 3.7 + 1.2)) *
    wobbleSeed *
    (0.35 + q * 0.00025);
  const controlTorque =
    authority * (targetTheta - state.theta) * 16 - state.omega * (2.4 + authority * 7);
  const I = Math.max(rocket.inertia, 80);
  let torque = aeroTorque * 1.35 + noise + controlTorque * Math.max(mass * 0.09, 50);
  if (stability < 0.05) {
    const kick = (0.55 + q * 0.00035) * (0.08 - stability) * (state.omega === 0 ? 1 : Math.sign(state.omega));
    torque += kick * I;
  }
  state.omega += (torque / I) * dt;
  state.omega *= Math.max(0.2, 1 - dt * (rho * 1.8 + 0.08));
  state.theta += state.omega * dt;

  if (rocket.design.fins === "none" && q > 800) {
    state.rollRate += (0.9 + Math.sin(state.time * 5)) * dt;
  } else {
    state.rollRate += -state.roll * 0.4 * dt;
    state.rollRate *= 0.985;
  }
  state.roll += state.rollRate * dt;

  const c = Math.cos(state.theta);
  const s = Math.sin(state.theta);
  const ax = radialX * c + eX * s;
  const ay = radialY * c + eY * s;
  const az = radialZ * c + eZ * s;
  const aMag = hypot3(ax, ay, az) || 1;
  const nX = ax / aMag;
  const nY = ay / aMag;
  const nZ = az / aMag;

  let throttle = 0;
  if (state.fuel > 0) {
    if (userMoonBurn) {
      const moonClimb = MOON.orbitRadius - PLANET.radius;
      throttle = orb.apoapsis < moonClimb * 1.12 ? 1 : 0;
    } else if (state.outcome === "orbit" || state.outcome === "escape") {
      throttle = 0;
    } else if (altitude > 52_000) {
      const periSafe = orb.periapsis > PLANET.karmanLine + 6_000;
      const apo = Math.max(orb.apoapsis, altitude);
      const nearApo = altitude > apo * 0.82 && radialVel < 160;
      if (!periSafe) throttle = nearApo ? 1 : 0;
      else if (speed < vCirc * 0.985) throttle = 1;
      else throttle = 0;
    } else {
      throttle = 1;
    }
    if (steer.pitch !== 0 && altitude > 4000 && !state.outcome) throttle = Math.max(throttle, 0.8);
  }
  if (Math.abs(state.omega) > 2.8) throttle *= 0.35;
  state.throttle = throttle;
  state.engineOn = throttle > 0.05 && state.fuel > 0;

  let fx = 0;
  let fy = 0;
  let fz = 0;

  const gAcc = PLANET.mu / (r * r);
  fx += -radialX * gAcc * mass;
  fy += -radialY * gAcc * mass;
  fz += -radialZ * gAcc * mass;

  if (altitude > 180_000 && moonDist > MOON.radius + 1) {
    const moonAcc = MOON.mu / (moonDist * moonDist);
    fx += (mdx / moonDist) * moonAcc * mass;
    fy += (mdy / moonDist) * moonAcc * mass;
    fz += (mdz / moonDist) * moonAcc * mass;
  }

  if (state.engineOn) {
    const thrust = rocket.thrust * throttle;
    fx += nX * thrust;
    fy += nY * thrust;
    fz += nZ * thrust;
    const mdot = thrust / Math.max(rocket.isp * G0, 1);
    state.fuel = Math.max(0, state.fuel - mdot * dt);
  }

  if (speed > 0.4 && rho > 1e-7) {
    const drag = q * rocket.cdA;
    const inv = 1 / speed;
    fx += -state.vx * inv * drag;
    fy += -state.vy * inv * drag;
    fz += -state.vz * inv * drag;
  }

  const invMass = 1 / Math.max(mass, 1);
  state.vx += fx * invMass * dt;
  state.vy += fy * invMass * dt;
  state.vz += fz * invMass * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.z += state.vz * dt;

  const r2 = hypot3(state.x, state.y, state.z);
  if (r2 < PLANET.radius) {
    const bump = PLANET.radius + 0.4;
    const sN = bump / r2;
    state.x *= sN;
    state.y *= sN;
    state.z *= sN;
    if (state.airborne || speed > SIM.crashSpeed) {
      if (state.maxAltitude > PLANET.karmanLine) setOutcome(state, "spacefall", "fell-from-space");
      else if (state.maxAltitude > 18_000) setOutcome(state, "suborbital", "fell-back");
      else setOutcome(state, "crash", "hit-ground");
    } else {
      state.vx = 0;
      state.vy = 0;
      state.vz = 0;
    }
  }

  if (state.time > 420 && !state.outcome && !state.voyage) {
    if (
      orb.bound &&
      orb.periapsis > PLANET.karmanLine + 4_000 &&
      orb.eccentricity < 0.18 &&
      orb.apoapsis < PLANET.targetOrbit + 80_000
    ) {
      setOutcome(state, "orbit", "timeout-orbit");
    } else setOutcome(state, "suborbital", "timeout");
  }
}

function beginVoyage(state: SimState, altitude: number) {
  state.voyage = true;
  state.voyageMeters = Math.max(altitude, PLANET.karmanLine);
  state.voyageTime = 0;
  state.inSpace = true;
  state.bound = false;
  state.engineOn = true;
  state.throttle = 1;
  state.flybyId = null;
  state.flybyLinger = 0;
  state.phaseLabel = "Star road — locked toward the heliopause";
}

/**
 * One cruise tick. `dt` is story seconds (already warped); `realDt` is wall-clock.
 * The ship never stops: it passes beside each world, and the card lingers a moment.
 */
function advanceVoyage(state: SimState, rocket: AssembledRocket, dt: number, realDt: number) {
  if (state.outcome === "heliopause") return;
  const speedC = Math.max(0, rocket.topSpeedC);
  const speed = speedC * LIGHT_C;

  // A single huge warp tick must not leap past a world's neighborhood.
  let advance = speed * dt;
  const limitAU = nextWindowStartAU(metersToAU(state.voyageMeters));
  if (Number.isFinite(limitAU)) {
    const limitM = limitAU * AU_M + 1;
    if (state.voyageMeters < limitM && state.voyageMeters + advance > limitM) {
      advance = limitM - state.voyageMeters;
    }
  }
  const usedDt = speed > 0 ? advance / speed : dt;
  state.time += usedDt;
  state.voyageTime += usedDt;
  state.voyageMeters += advance;

  const edgeM = HELIOPAUSE_AU * AU_M;
  if (state.voyageMeters >= edgeM) {
    state.voyageMeters = edgeM;
    state.flybyId = "heliopause";
    state.flybyLinger = 0;
    setOutcome(state, "heliopause", "edge-of-system");
    state.phaseLabel = "Heliopause — the solar wind ends here";
  } else {
    const au = metersToAU(state.voyageMeters);
    const near = nearbyStop(au);
    if (near) {
      state.flybyId = near.id;
      state.flybyLinger = 0;
      state.phaseLabel = `Passing ${near.name}`;
    } else {
      if (state.flybyId) {
        state.flybyLinger += realDt;
        if (state.flybyLinger >= FLYBY_LINGER) state.flybyId = null;
      }
      state.phaseLabel = `Star road — next ${nextStop(au).name}`;
    }
  }
  state.inSpace = true;
  state.bound = false;
  state.engineOn = speedC > 0;
  state.throttle = 1;
  state.maxSpeed = Math.max(state.maxSpeed, speed);
  state.maxAltitude = Math.max(state.maxAltitude, state.voyageMeters);
}

export function warpFor(state: SimState) {
  if (state.voyage) return Math.max(1, state.cruiseWarp);
  if (!state.airborne) return SIM.warpPad;
  const r = hypot3(state.x, state.y, state.z);
  const altitude = r - PLANET.radius;
  if (altitude < 22_000) return SIM.warpAtmo;
  if (altitude < PLANET.karmanLine) return SIM.warpAtmo + 1.4;
  if (state.outcome === "orbit" || state.outcome === "escape") {
    if (state.apoapsis > 450_000) return 42;
    return SIM.warpOrbit;
  }
  return SIM.warpSpace;
}

export function stepSim(
  state: SimState,
  rocket: AssembledRocket,
  steer: SteerInput,
  realDt: number,
) {
  if (state.outcome === "heliopause") return;
  if (state.outcome && !LIVE_OUTCOMES.has(state.outcome) && state.outcome !== "moon") return;
  if (state.voyage) {
    const tick = Math.min(realDt, 0.08);
    const warp = easedWarp(
      metersToAU(state.voyageMeters),
      rocket.topSpeedC,
      Math.max(1, state.cruiseWarp),
    );
    advanceVoyage(state, rocket, tick * warp, tick);
    return;
  }
  const warp = warpFor(state);
  let budget = Math.min(realDt, 0.05) * warp;
  let steps = 0;
  while (budget > 0 && steps < SIM.maxSubsteps) {
    if (state.voyage) {
      advanceVoyage(state, rocket, budget, budget / warp);
      break;
    }
    if (state.outcome && !LIVE_OUTCOMES.has(state.outcome) && state.outcome !== "moon") break;
    const dt = Math.min(SIM.substep, budget);
    stepOnce(state, rocket, steer, dt);
    budget -= dt;
    steps += 1;
  }
}

export function telemetryOf(state: SimState, rocket: AssembledRocket): Telemetry {
  const r = hypot3(state.x, state.y, state.z);
  const altitude = r - PLANET.radius;
  const speed = hypot3(state.vx, state.vy, state.vz);
  const mass = rocket.dryMass + Math.max(0, state.fuel);
  const twr = (state.engineOn ? rocket.thrust * state.throttle : 0) / Math.max(mass * PLANET.surfaceG, 1);
  const gForce = twr + (state.airborne ? 0.15 : 1);
  const physC = speed / LIGHT_C;
  const climb = state.inSpace
    ? Math.min(1, Math.max(0, (altitude - PLANET.karmanLine) / 40_000))
    : 0;
  const speedC = state.voyage
    ? rocket.topSpeedC
    : physC + (rocket.topSpeedC - physC) * climb * climb;
  const voyageAU = state.voyage ? metersToAU(state.voyageMeters) : 0;
  const nxt = nextStop(voyageAU);
  const edgeRemain = Math.max(0, HELIOPAUSE_AU - voyageAU);
  const flyby = state.flybyId ? FLYBY_INFO[state.flybyId] : undefined;
  return {
    altitude: state.voyage ? state.voyageMeters : altitude,
    speed: state.voyage ? rocket.topSpeedC * LIGHT_C : speed,
    fuelFrac: rocket.fuelMass > 0 ? state.fuel / rocket.fuelMass : 0,
    twr,
    apoapsis: state.apoapsis,
    periapsis: state.periapsis,
    heating: state.heating,
    phaseLabel: state.phaseLabel,
    inSpace: state.inSpace,
    engineOn: state.engineOn,
    gForce,
    headingDeg: (state.theta * 180) / Math.PI,
    time: state.time,
    bound: state.bound,
    speedC,
    topSpeedC: rocket.topSpeedC,
    voyage: state.voyage,
    voyageAU,
    voyageTime: state.voyageTime,
    cruiseWarp: state.cruiseWarp,
    nextStopName: nxt.name,
    nextStopAU: nxt.auFromEarth,
    etaNext: etaSeconds(Math.max(0, nxt.auFromEarth - voyageAU), rocket.topSpeedC),
    etaEdge: etaSeconds(edgeRemain, rocket.topSpeedC),
    flybyId: state.flybyId,
    flybyKid: flyby?.kid ?? "",
    flybyGeek: flyby?.geek ?? "",
  };
}

/** Stretch altitude so kids can see lift-off and a real loop — compress beyond Luna. */
export function visualAltitude(altMeters: number) {
  const alt = Math.max(0, altMeters);
  const near = Math.pow(alt, 0.6) * 0.062 + alt * VISUAL_SCALE * 2.4;
  const moonAlt = MOON.orbitRadius - PLANET.radius;
  if (alt <= moonAlt) return near;
  const nearMoon = Math.pow(moonAlt, 0.6) * 0.062 + moonAlt * VISUAL_SCALE * 2.4;
  return nearMoon + Math.log1p((alt - moonAlt) / moonAlt) * 160;
}

export function visualRadiusForAltitude(altMeters: number) {
  return VISUAL.planetRadius + visualAltitude(altMeters);
}

export function visualPosition(state: SimState) {
  if (state.voyage) {
    return { x: voyageVisualX(metersToAU(state.voyageMeters)), y: 0, z: 0 };
  }
  const r = hypot3(state.x, state.y, state.z);
  if (r < 1) {
    return { x: 0, y: VISUAL.planetRadius, z: 0 };
  }
  const alt = Math.max(0, r - PLANET.radius);
  const scale = visualRadiusForAltitude(alt) / r;
  return {
    x: state.x * scale,
    y: state.y * scale,
    z: state.z * scale,
  };
}

export function visualMoonPosition(time: number) {
  const moon = moonPosition(time);
  const r = hypot3(moon.x, moon.y, moon.z);
  if (r < 1) return { x: 0, y: visualRadiusForAltitude(MOON.orbitRadius - PLANET.radius), z: 0 };
  const alt = Math.max(0, r - PLANET.radius);
  const scale = visualRadiusForAltitude(alt) / r;
  return { x: moon.x * scale, y: moon.y * scale, z: moon.z * scale };
}

export function runHeadless(rocket: AssembledRocket, seconds = 380) {
  const state = createSim();
  resetSim(state, rocket);
  const steer = { pitch: 0 };
  let t = 0;
  while (t < seconds && !state.outcome) {
    stepSim(state, rocket, steer, 1 / 30);
    t += 1 / 30;
  }
  return state;
}
