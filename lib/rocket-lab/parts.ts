import { G0, PLANET } from "./constants";
import type {
  AssembledRocket,
  BodyId,
  EngineId,
  FinId,
  NoseId,
  PaintId,
  PartOption,
  RocketDesign,
} from "./types";

export const NOSES: PartOption<NoseId>[] = [
  {
    id: "needle",
    kidName: "Pointy Cone",
    geekName: "Low-drag ogive",
    blurb: "Slips through air like a dart. Best for going fast.",
    mass: 70,
    length: 1.6,
    comFromTail: 0,
    area: 0.22,
    cd: 0.22,
    copFromTail: 0,
  },
  {
    id: "dome",
    kidName: "Round Helmet",
    geekName: "Blunt sphere-cone",
    blurb: "Friendly and OK. A little more air-push than pointy.",
    mass: 95,
    length: 1.35,
    comFromTail: 0,
    area: 0.28,
    cd: 0.48,
    copFromTail: 0,
  },
  {
    id: "cube",
    kidName: "Block Head",
    geekName: "Flat-plate nose",
    blurb: "Looks silly. Pushes a wall of air. Easy to wobble.",
    mass: 130,
    length: 1.1,
    comFromTail: 0,
    area: 0.55,
    cd: 1.15,
    copFromTail: 0,
  },
  {
    id: "saucer",
    kidName: "Flying Pancake",
    geekName: "High-drag disc",
    blurb: "Great for UFOs, bad for rockets. Huge drag.",
    mass: 160,
    length: 0.7,
    comFromTail: 0,
    area: 1.35,
    cd: 1.85,
    copFromTail: 0,
  },
  {
    id: "shuttle",
    kidName: "Shuttle Beak",
    geekName: "Spaceplane ogive",
    blurb: "A real runway nose. A bit fat, but it can fly.",
    mass: 110,
    length: 1.7,
    comFromTail: 0,
    area: 0.34,
    cd: 0.55,
    copFromTail: 0,
  },
  {
    id: "spike",
    kidName: "Heat Spike",
    geekName: "Sharp aeroshell",
    blurb: "Future-steel needle. Slices air like it owes you money.",
    mass: 85,
    length: 2.05,
    comFromTail: 0,
    area: 0.16,
    cd: 0.16,
    copFromTail: 0,
  },
  {
    id: "hammer",
    kidName: "Hammer Head",
    geekName: "Inverted blunt cap",
    blurb: "Looks like a flying mallet. Air hates this.",
    mass: 175,
    length: 1.05,
    comFromTail: 0,
    area: 0.72,
    cd: 1.35,
    copFromTail: 0,
  },
];

export const BODIES: PartOption<BodyId>[] = [
  {
    id: "slim",
    kidName: "Pencil Tank",
    geekName: "Low-area stack",
    blurb: "Light and skinny. Less fuel, less air-push.",
    mass: 260,
    fuelMass: 980,
    length: 6.4,
    comFromTail: 0,
    area: 0.11,
    cd: 0.32,
    copFromTail: 0,
  },
  {
    id: "classic",
    kidName: "Rocket Tube",
    geekName: "Standard stack",
    blurb: "The balanced choice — fuel, strength, and shape.",
    mass: 430,
    fuelMass: 2280,
    length: 8.2,
    comFromTail: 0,
    area: 0.2,
    cd: 0.42,
    copFromTail: 0,
  },
  {
    id: "chubby",
    kidName: "Big Belly",
    geekName: "Wide propellant tank",
    blurb: "Lots of fuel, but heavy. Needs a strong engine.",
    mass: 720,
    fuelMass: 3100,
    length: 7.4,
    comFromTail: 0,
    area: 0.48,
    cd: 0.7,
    copFromTail: 0,
  },
  {
    id: "crate",
    kidName: "Cargo Box",
    geekName: "Bluff fuselage",
    blurb: "A flying refrigerator. Heavy drag, wobbly air-flow.",
    mass: 880,
    fuelMass: 2050,
    length: 6.2,
    comFromTail: 0,
    area: 0.92,
    cd: 1.25,
    copFromTail: 0,
  },
  {
    id: "starship",
    kidName: "Stainless Barrel",
    geekName: "Methalox stack",
    blurb: "A fat future tanker. Lots of fuel, tiles on one side.",
    mass: 680,
    fuelMass: 3450,
    length: 9.4,
    comFromTail: 0,
    area: 0.4,
    cd: 0.5,
    copFromTail: 0,
  },
  {
    id: "glider",
    kidName: "Spaceplane",
    geekName: "Lifting-body fuselage",
    blurb: "Wants to be an airplane. Draggy, but very cool.",
    mass: 610,
    fuelMass: 1680,
    length: 7.8,
    comFromTail: 0,
    area: 0.72,
    cd: 0.88,
    copFromTail: 0,
  },
  {
    id: "orb",
    kidName: "Bubble Ship",
    geekName: "Spherical habitat",
    blurb: "A flying marble. Windows everywhere. Air is not impressed.",
    mass: 840,
    fuelMass: 2680,
    length: 5.6,
    comFromTail: 0,
    area: 1.15,
    cd: 1.12,
    copFromTail: 0,
  },
];

export const FINS: PartOption<FinId>[] = [
  {
    id: "none",
    kidName: "No Fins",
    geekName: "Unstable stack",
    blurb: "Like an arrow with no feathers. It will spin.",
    mass: 0,
    length: 0.2,
    comFromTail: 0,
    area: 0.02,
    cd: 0.02,
    copFromTail: 0,
  },
  {
    id: "stubs",
    kidName: "Tiny Tabs",
    geekName: "Minimal strakes",
    blurb: "A little help. Might stay straight if you go slow.",
    mass: 35,
    length: 0.6,
    comFromTail: 0,
    area: 0.08,
    cd: 0.08,
    copFromTail: 0,
  },
  {
    id: "classic",
    kidName: "Arrow Fins",
    geekName: "Tail fins",
    blurb: "Keeps the tail in back. This is how rockets fly straight.",
    mass: 55,
    length: 1.1,
    comFromTail: 0,
    area: 0.18,
    cd: 0.12,
    copFromTail: 0,
  },
  {
    id: "wings",
    kidName: "Airplane Wings",
    geekName: "High-span airfoils",
    blurb: "Wings belong on planes. They drag a rocket down.",
    mass: 140,
    length: 1.4,
    comFromTail: 0,
    area: 0.85,
    cd: 0.62,
    copFromTail: 0,
  },
  {
    id: "grid",
    kidName: "Grid Fins",
    geekName: "Lattice landing fins",
    blurb: "The waffle irons. Steer on the way down — and up.",
    mass: 70,
    length: 0.9,
    comFromTail: 0,
    area: 0.22,
    cd: 0.2,
    copFromTail: 0,
  },
  {
    id: "ringfin",
    kidName: "Halo Ring",
    geekName: "Annular tail",
    blurb: "A hoop around the tail. Super straight, a little drag.",
    mass: 95,
    length: 0.85,
    comFromTail: 0,
    area: 0.28,
    cd: 0.24,
    copFromTail: 0,
  },
  {
    id: "petal",
    kidName: "Petal Sails",
    geekName: "Deployable vanes",
    blurb: "Flower petals. Pretty, wobbly, and they catch air.",
    mass: 120,
    length: 1.5,
    comFromTail: 0,
    area: 0.7,
    cd: 0.58,
    copFromTail: 0,
  },
];

export const ENGINES: PartOption<EngineId>[] = [
  {
    id: "sparkler",
    kidName: "Sparkler",
    geekName: "Low-thrust motor",
    blurb: "Cute fizz. Too weak to lift a heavy rocket.",
    mass: 90,
    length: 1.15,
    comFromTail: 0,
    area: 0.08,
    cd: 0.4,
    copFromTail: 0,
    thrust: 15_800,
    isp: 255,
  },
  {
    id: "workhorse",
    kidName: "Workhorse",
    geekName: "Sustainer engine",
    blurb: "Strong, efficient, and made for orbit.",
    mass: 175,
    length: 1.45,
    comFromTail: 0,
    area: 0.12,
    cd: 0.45,
    copFromTail: 0,
    thrust: 49_500,
    isp: 332,
  },
  {
    id: "thunder",
    kidName: "Thunder Booster",
    geekName: "High-thrust, thirsty",
    blurb: "Huge kick! Burns fuel fast. Great for heavy ships.",
    mass: 310,
    length: 1.7,
    comFromTail: 0,
    area: 0.2,
    cd: 0.5,
    copFromTail: 0,
    thrust: 96_000,
    isp: 268,
  },
  {
    id: "cluster",
    kidName: "Nine Bells",
    geekName: "Octaweb cluster",
    blurb: "A whole choir of engines. Realistic future kick.",
    mass: 390,
    length: 1.55,
    comFromTail: 0,
    area: 0.28,
    cd: 0.48,
    copFromTail: 0,
    thrust: 88_000,
    isp: 308,
  },
  {
    id: "ion",
    kidName: "Whisper Ion",
    geekName: "High-Isp electric",
    blurb: "Sips fuel for years. Too shy to lift a heavy ship.",
    mass: 125,
    length: 1.2,
    comFromTail: 0,
    area: 0.1,
    cd: 0.28,
    copFromTail: 0,
    thrust: 22_400,
    isp: 1880,
  },
  {
    id: "pulse",
    kidName: "Star Pulse",
    geekName: "Pulsed fusion mock",
    blurb: "Kaboom-kaboom. Wild shove. Drinks the tank.",
    mass: 355,
    length: 1.85,
    comFromTail: 0,
    area: 0.24,
    cd: 0.52,
    copFromTail: 0,
    thrust: 118_000,
    isp: 248,
  },
    {
    id: "torch",
    kidName: "Sun Torch",
    geekName: "Antimatter torch",
    blurb: "Almost-real speed king. About a fifth of light in empty space.",
    mass: 340,
    length: 1.7,
    comFromTail: 0,
    area: 0.18,
    cd: 0.4,
    copFromTail: 0,
    thrust: 90_000,
    isp: 390,
  },
  {
    id: "photon",
    kidName: "Photon Heart",
    geekName: "Fairy-tale light drive",
    blurb: "A dream engine. In space it is light itself — 1.0 c.",
    mass: 210,
    length: 1.4,
    comFromTail: 0,
    area: 0.12,
    cd: 0.28,
    copFromTail: 0,
    thrust: 92_000,
    isp: 2400,
  },
];

export const PAINTS: { id: PaintId; kidName: string; hex: string; stripe: string }[] =
  [
    { id: "sunset", kidName: "Sunset", hex: "#ff7a3c", stripe: "#fff7ed" },
    { id: "mint", kidName: "Mint Comet", hex: "#34d399", stripe: "#ecfeff" },
    { id: "banana", kidName: "Banana", hex: "#f5c518", stripe: "#1f2937" },
    { id: "berry", kidName: "Blueberry", hex: "#7c8cff", stripe: "#eef2ff" },
    { id: "cherry", kidName: "Cherry", hex: "#fb7185", stripe: "#fff1f2" },
    { id: "chrome", kidName: "Stainless", hex: "#c5d0dc", stripe: "#1c1917" },
    { id: "nebula", kidName: "Nebula", hex: "#a78bfa", stripe: "#f5d0fe" },
    { id: "lava", kidName: "Reentry", hex: "#fb4c2f", stripe: "#0f172a" },
    { id: "ghost", kidName: "Ghost", hex: "#e2e8f0", stripe: "#334155" },
  ];

export const DEFAULT_DESIGN: RocketDesign = {
  nose: "needle",
  body: "classic",
  fins: "classic",
  engine: "workhorse",
  paint: "sunset",
};

export const PRESETS: { id: string; name: string; tag: string; design: RocketDesign }[] =
  [
    {
      id: "orbit",
      name: "Orbit Express",
      tag: "Good design",
      design: {
        nose: "needle",
        body: "classic",
        fins: "classic",
        engine: "workhorse",
        paint: "sunset",
      },
    },
    {
      id: "wobble",
      name: "Wobble Cube",
      tag: "Will crash",
      design: {
        nose: "cube",
        body: "classic",
        fins: "none",
        engine: "workhorse",
        paint: "banana",
      },
    },
    {
      id: "moon",
      name: "Moon Ranger",
      tag: "Aim for Luna",
      design: {
        nose: "needle",
        body: "chubby",
        fins: "classic",
        engine: "workhorse",
        paint: "mint",
      },
    },
    {
      id: "steel",
      name: "Stainless Bird",
      tag: "0.23 c",
      design: {
        nose: "spike",
        body: "starship",
        fins: "grid",
        engine: "torch",
        paint: "chrome",
      },
    },
    {
      id: "light",
      name: "Light Bird",
      tag: "1.0 c",
      design: {
        nose: "spike",
        body: "classic",
        fins: "ringfin",
        engine: "photon",
        paint: "ghost",
      },
    },
    {
      id: "nine",
      name: "Nine Bells",
      tag: "Cluster",
      design: {
        nose: "dome",
        body: "classic",
        fins: "grid",
        engine: "cluster",
        paint: "lava",
      },
    },
    {
      id: "shuttle",
      name: "Runway Bird",
      tag: "Spaceplane",
      design: {
        nose: "shuttle",
        body: "glider",
        fins: "wings",
        engine: "workhorse",
        paint: "berry",
      },
    },
    {
      id: "whisper",
      name: "Whisper Probe",
      tag: "Ion",
      design: {
        nose: "spike",
        body: "slim",
        fins: "ringfin",
        engine: "ion",
        paint: "ghost",
      },
    },
    {
      id: "disco",
      name: "Bubble Disco",
      tag: "Wild",
      design: {
        nose: "saucer",
        body: "orb",
        fins: "petal",
        engine: "pulse",
        paint: "nebula",
      },
    },
    {
      id: "mallet",
      name: "Sky Mallet",
      tag: "Will flop",
      design: {
        nose: "hammer",
        body: "orb",
        fins: "none",
        engine: "thunder",
        paint: "banana",
      },
    },
    {
      id: "brick",
      name: "Sky Brick",
      tag: "Too draggy",
      design: {
        nose: "saucer",
        body: "crate",
        fins: "wings",
        engine: "sparkler",
        paint: "cherry",
      },
    },
  ];

export function getNose(id: NoseId) {
  return NOSES.find((p) => p.id === id) ?? NOSES[0];
}
export function getBody(id: BodyId) {
  return BODIES.find((p) => p.id === id) ?? BODIES[1];
}
export function getFins(id: FinId) {
  return FINS.find((p) => p.id === id) ?? FINS[2];
}
export function getEngine(id: EngineId) {
  return ENGINES.find((p) => p.id === id) ?? ENGINES[1];
}
export function getPaint(id: PaintId) {
  return PAINTS.find((p) => p.id === id) ?? PAINTS[0];
}

export function assembleRocket(design: RocketDesign): AssembledRocket {
  const nose = getNose(design.nose);
  const body = getBody(design.body);
  const fins = getFins(design.fins);
  const engine = getEngine(design.engine);

  const engineLen = engine.length;
  const bodyLen = body.length;
  const noseLen = nose.length;
  const length = engineLen + bodyLen + noseLen;

  const engineCom = engineLen * 0.35;
  const bodyCom = engineLen + bodyLen * 0.48;
  const noseCom = engineLen + bodyLen + noseLen * 0.55;
  const finCom = engineLen + 0.35;

  const fuelMass = body.fuelMass ?? 0;
  const dryMass = nose.mass + body.mass + fins.mass + engine.mass;
  const wetMass = dryMass + fuelMass;

  const dryCom =
    (engine.mass * engineCom +
      body.mass * bodyCom +
      nose.mass * noseCom +
      fins.mass * finCom) /
    Math.max(dryMass, 1);

  const fuelCom = engineLen + bodyLen * 0.45;
  const comFromTail =
    (dryMass * dryCom + fuelMass * fuelCom) / Math.max(wetMass, 1);

  const engineCop = engineLen * 0.2;
  const bodyCop = engineLen + bodyLen * 0.5;
  const noseCop = engineLen + bodyLen + noseLen * 0.7;
  const finCop = engineLen * 0.15 + 0.2;

  const noseCopMul: Record<string, number> = {
    saucer: 2.6,
    cube: 2.1,
    hammer: 2.25,
    dome: 1.35,
    shuttle: 1.22,
    spike: 0.92,
    needle: 1.05,
  };
  const finCopMul: Record<string, number> = {
    none: 0,
    classic: 7.4,
    wings: 4.2,
    grid: 6.6,
    ringfin: 8.1,
    petal: 3.5,
    stubs: 2.4,
  };
  const noseCopArea = nose.area * (noseCopMul[nose.id] ?? 1.05);
  const bodyCopArea = body.area * (body.id === "orb" ? 1.25 : body.id === "glider" ? 1.1 : 0.9);
  const finCopArea = fins.id === "none" ? 0.015 : fins.area * (finCopMul[fins.id] ?? 2.4);
  const engineCopArea = engine.area * 0.35;
  const copArea = noseCopArea + bodyCopArea + finCopArea + engineCopArea;
  const copFromTail =
    (noseCopArea * noseCop +
      bodyCopArea * bodyCop +
      finCopArea * finCop +
      engineCopArea * engineCop) /
    Math.max(copArea, 1e-6);

  const cdA =
    nose.cd * nose.area +
    body.cd * body.area +
    fins.cd * fins.area +
    engine.cd * engine.area * 0.25;

  const thrust = engine.thrust ?? 0;
  const isp = engine.isp ?? 280;
  const twr = thrust / Math.max(wetMass * PLANET.surfaceG, 1);
  const deltaV = isp * G0 * Math.log(wetMass / Math.max(dryMass, 1));
  const stabilityCalibers = (comFromTail - copFromTail) / Math.max(length, 1);
  const inertia = (wetMass * length * length) / 12;
  const topSpeedC = vacuumSpeedC(design, cdA);

  return {
    design,
    dryMass,
    fuelMass,
    length,
    comFromTail,
    copFromTail,
    stabilityCalibers,
    cdA,
    refArea: nose.area + body.area,
    thrust,
    isp,
    twr,
    deltaV,
    inertia,
    stable: stabilityCalibers > 0.08,
    canLiftOff: twr > 1.05,
    topSpeedC,
  };
}

const ENGINE_CRUISE_C: Record<EngineId, number> = {
  sparkler: 7e-6,
  workhorse: 1.1e-5,
  thunder: 1.4e-5,
  cluster: 2.2e-5,
  ion: 0.055,
  pulse: 0.13,
  torch: 0.2,
  photon: 1,
};

function vacuumSpeedC(design: RocketDesign, cdA: number) {
  if (design.engine === "photon") return 1;
  let c = ENGINE_CRUISE_C[design.engine];
  if (design.nose === "spike") c *= 1.08;
  else if (design.nose === "needle") c *= 1.03;
  else if (design.nose === "saucer" || design.nose === "hammer" || design.nose === "cube") c *= 0.7;
  if (design.body === "starship") c *= 1.06;
  else if (design.body === "slim") c *= 1.04;
  else if (design.body === "orb" || design.body === "crate" || design.body === "glider") c *= 0.78;
  if (design.fins === "grid" || design.fins === "ringfin") c *= 1.02;
  else if (design.fins === "petal" || design.fins === "wings") c *= 0.84;
  c *= Math.max(0.72, 1 - Math.max(0, cdA - 0.35) * 0.12);
  return Math.min(0.24, c);
}

export function designHint(rocket: AssembledRocket): {
  lift: string;
  straight: string;
  sleek: string;
  fuel: string;
  speed: string;
} {
  return {
    lift: rocket.canLiftOff
      ? rocket.twr > 1.5
        ? "Engine can lift this ship. Nice!"
        : "It should lift off — but just barely."
      : "Too heavy for this engine. Gravity will win on the pad.",
    straight: rocket.stable
      ? rocket.stabilityCalibers > 0.14
        ? "Fins should keep it flying like an arrow."
        : "A bit wobbly, but maybe OK."
      : "Center of pressure is too far forward. It will spin.",
    sleek:
      rocket.cdA < 0.35
        ? "Sneaky shape. Air should slip past."
        : rocket.cdA < 0.8
          ? "A little draggy. Might still make it."
          : "That shape shoves a ton of air. Hard to go fast.",
    fuel:
      rocket.design.engine === "ion"
        ? rocket.canLiftOff
          ? "Ion sips fuel — if this skinny ship actually leaves the pad."
          : "Ion is a space engine. Too polite to beat gravity on a heavy ship."
        : rocket.deltaV > 3600
          ? "Plenty of go-juice for orbit — leftover can push toward Luna."
          : rocket.deltaV > 2800
            ? "Might reach space. Orbit needs extra sideways speed."
            : "Not much fuel. This one may fall back down.",
    speed:
      rocket.topSpeedC >= 0.99
        ? "Photon Heart is a fairy tale — light speed itself. Pluto is about five hours."
        : rocket.topSpeedC >= 0.15
          ? "Sun Torch is the almost-real speed king — about a fifth of light in empty space."
          : rocket.topSpeedC >= 0.04
            ? "Star-drive territory. Watch “vs light” once you leave the air."
            : "Chemical engines crawl next to light. Stainless Bird or Light Bird for the long road.",
  };
}
