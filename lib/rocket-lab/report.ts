import { PLANET } from "./constants";
import type { AssembledRocket, FlightOutcome, MissionReport, SimState } from "./types";

function km(meters: number) {
  return `${Math.max(0, meters / 1000).toFixed(0)} km`;
}

export function buildReport(state: SimState, rocket: AssembledRocket): MissionReport {
  const outcome = state.outcome ?? "crash";
  const common = {
    outcome,
    maxAltitude: state.maxAltitude,
    maxSpeed: state.maxSpeed,
    time: state.time,
  };

  if (outcome === "orbit") {
    return {
      ...common,
      maxAltitude: Math.max(state.maxAltitude, state.apoapsis),
      title: "You made orbit!",
      kid: `Your rocket went high AND fast sideways. Gravity still pulls, but you keep missing the ground — that’s a loop around Terra. Highest ${km(state.apoapsis)}, lowest ${km(state.periapsis)}. Hold ← → after this to push for the Moon.`,
      geek: `Nearly circular bound orbit around ${PLANET.name}: periapsis ${km(state.periapsis)}, apoapsis ${km(state.apoapsis)}, e=${state.eccentricity.toFixed(2)}. Δv budget was ${(rocket.deltaV / 1000).toFixed(1)} km/s.`,
      tip: "Keep watching — the planet should slide under you. Then hold an arrow to climb toward Luna.",
    };
  }

  if (outcome === "escape") {
    return {
      ...common,
      title: "Free of Terra!",
      kid: "You burned so fast that Terra’s gravity cannot pull you into a loop anymore. That is escape — the path you take if you want the Moon, or the rest of the solar system.",
      geek: `Unbound trajectory (energy ≥ 0). Speed ${formatSpeed(state.maxSpeed)}, altitude ${km(state.maxAltitude)}. Hold the burn toward Luna to try a flyby.`,
      tip: "Escape is on purpose: orbit first, then keep thrusting with the arrows.",
    };
  }

  if (outcome === "moon") {
    return {
      ...common,
      title: "Hello, Luna!",
      kid: "You left Terra’s loop and reached our Moon. Luna is closer here than in real life, so a family rocket can actually get there.",
      geek: `Lunar encounter after ${Math.round(state.time)}s. Peak speed ${formatSpeed(state.maxSpeed)}.`,
      tip: "Orbit Express circles Terra. Moon Ranger is built to push onward.",
    };
  }

  if (outcome === "heliopause") {
    const hours = state.voyageTime / 3600;
    return {
      ...common,
      maxAltitude: state.voyageMeters,
      title: "Edge of the solar system!",
      kid: `You rode the locked star road past Luna, the planets, and Pluto, to where the Sun’s wind fades. Story time ${hours >= 10 ? hours.toFixed(0) : hours.toFixed(1)} hours at ${formatLightSpeed(rocket.topSpeedC)}.`,
      geek: `Heliopause ~120 AU from Terra. Cruise ${formatLightSpeed(rocket.topSpeedC)}. Light itself needs ~17 hours for this trip; a 1.0 c dream ship matches that clock.`,
      tip: "1× is the long watch. Warp to skip emptiness. Chemical ships take years — that’s the point.",
    };
  }

  const byShape = shapeTip(rocket, outcome);

  const table: Record<FlightOutcome, Omit<MissionReport, "outcome" | "maxAltitude" | "maxSpeed" | "time">> = {
    orbit: {
      title: "You made orbit!",
      kid: "",
      geek: "",
      tip: "",
    },
    pad: {
      title: "Stuck on the pad",
      kid: "The engine was not strong enough to beat gravity. Thrust has to be bigger than the rocket’s weight to lift off.",
      geek: `TWR ${rocket.twr.toFixed(2)} — need more than 1.0 at launch. Thrust ${Math.round(rocket.thrust / 1000)} kN vs weight ${Math.round(((rocket.dryMass + rocket.fuelMass) * PLANET.surfaceG) / 1000)} kN.`,
      tip: byShape,
    },
    tumble: {
      title: "It wobbled away!",
      kid: "The rocket spun like a leaf. Fins at the back work like feathers on an arrow and keep the nose going first.",
      geek: `Stability ${rocket.stabilityCalibers.toFixed(2)} calibers (need ~0.10+). Center of pressure sat too far forward of the center of mass.`,
      tip: byShape,
    },
    burnup: {
      title: "Too much air-rub",
      kid: "Going fast through thick air makes heat. A pointy nose slips through; a flat nose smacks the air.",
      geek: `Peak dynamic heating from ½ρv³ on CdA ${rocket.cdA.toFixed(2)} m². Try lower drag before you go hypersonic in the soup.`,
      tip: byShape,
    },
    crash: {
      title: "Bonk — back to Earth",
      kid: `It flew ${formatKm(state.maxAltitude)} up, then gravity won. Rockets must stay straight and keep speeding up.`,
      geek: `Max altitude ${formatKm(state.maxAltitude)}, max speed ${state.maxSpeed.toFixed(0)} m/s. Drag area ${rocket.cdA.toFixed(2)} m².`,
      tip: byShape,
    },
    suborbital: {
      title: "Space… almost!",
      kid: `You got high (${km(state.maxAltitude)}) but not sideways-fast enough. Height is only half of orbit — you also need speed so you keep missing the planet.`,
      geek: `Apoapsis ${km(state.apoapsis)}, periapsis ${km(state.periapsis)}. Circular speed near ${PLANET.targetOrbit / 1000} km is ~2.2 km/s on this world.`,
      tip: byShape,
    },
    spacefall: {
      title: "You touched space!",
      kid: `Above ~${PLANET.karmanLine / 1000} km the sky turns into space. You got there, then fell back. Next time, turn sideways and keep burning.`,
      geek: `Karman line ${PLANET.karmanLine / 1000} km. Periapsis ${km(state.periapsis)} still dips into air, so drag will pull you home.`,
      tip: byShape,
    },
    escape: {
      title: "Free of Terra!",
      kid: "",
      geek: "",
      tip: "",
    },
    moon: {
      title: "Hello, Luna!",
      kid: "",
      geek: "",
      tip: "",
    },
    heliopause: {
      title: "Edge of the solar system!",
      kid: "",
      geek: "",
      tip: "",
    },
  };

  const row = table[outcome];
  return { ...common, ...row };
}

function shapeTip(rocket: AssembledRocket, outcome: FlightOutcome) {
  if (outcome === "pad") {
    if (rocket.design.engine === "sparkler") return "Swap in the Workhorse, Nine Bells, or Thunder — Sparkler is a tiny push.";
    if (rocket.design.engine === "ion") return "Whisper Ion is for space. Pair it with Pencil Tank, or grab Nine Bells / Star Pulse to leave the pad.";
    return "Pick a slimmer body or a bigger engine so thrust beats weight.";
  }
  if (rocket.design.fins === "none") {
    return "Add Arrow Fins, Grid Fins, or a Halo Ring. No fins = the tail can swing around to the front.";
  }
  if (rocket.design.nose === "saucer" || rocket.design.nose === "cube" || rocket.design.nose === "hammer") {
    return "Try the Heat Spike or Pointy Cone. Flat and hammer noses shove air and steal your speed.";
  }
  if (rocket.design.fins === "wings" || rocket.design.fins === "petal") {
    return "Trade those wide petals/wings for Grid Fins or Arrow Fins. Pretty shapes make huge drag.";
  }
  if (rocket.design.body === "crate" || rocket.design.body === "orb" || rocket.design.body === "glider") {
    return "A Stainless Barrel or Rocket Tube slips better. Bubble ships and spaceplanes fight the air.";
  }
  if (rocket.design.engine === "sparkler") {
    return "Sparkler runs out of punch. Workhorse or Nine Bells is the orbit engine.";
  }
  return "Copy Orbit Express or Stainless Bird, then change one part at a time and see what breaks.";
}

export function formatKm(meters: number) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 0) return "0 km";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters > 80_000 ? 0 : 1)} km`;
}

export function formatSpeed(mps: number) {
  if (mps < 1000) return `${Math.round(mps)} m/s`;
  return `${(mps / 1000).toFixed(2)} km/s`;
}

export function formatLightSpeed(frac: number) {
  if (!Number.isFinite(frac) || frac <= 0) return "0 c";
  if (frac >= 0.01) return `${frac.toFixed(2)} c`;
  if (frac >= 0.001) return `${frac.toFixed(3)} c`;
  if (frac >= 1e-5) return `${frac.toFixed(5)} c`;
  return `${frac.toFixed(7)} c`;
}
