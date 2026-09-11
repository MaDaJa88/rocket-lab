import { LIGHT_C, VISUAL } from "./constants";

export const AU_M = 149_597_870_700;
export const MOON_AU = 384_400_000 / AU_M;
/** Voyager 1 crossed at ~121 AU, Voyager 2 at ~119 AU; the boundary breathes with the solar cycle. */
export const HELIOPAUSE_AU = 120;
export const LIGHT_SECONDS_PER_AU = AU_M / LIGHT_C;

export type VoyageStop = {
  id: string;
  name: string;
  /** Signed AU from Terra: negative is sunward. */
  auFromEarth: number;
  color: string;
  ring?: boolean;
  edge?: boolean;
};

/** Lined up on purpose so distance is the only lesson. */
export const VOYAGE_STOPS: VoyageStop[] = [
  { id: "terra", name: "Terra", auFromEarth: 0, color: "#3d8fd6" },
  { id: "luna", name: "Luna", auFromEarth: MOON_AU, color: "#c9c3b4" },
  { id: "mars", name: "Mars", auFromEarth: 0.524, color: "#d08050" },
  { id: "jupiter", name: "Jupiter", auFromEarth: 4.2, color: "#e0b07a" },
  { id: "saturn", name: "Saturn", auFromEarth: 8.54, color: "#e6d3a3", ring: true },
  { id: "uranus", name: "Uranus", auFromEarth: 18.18, color: "#7ec8d4" },
  { id: "neptune", name: "Neptune", auFromEarth: 29.06, color: "#4f7cff" },
  { id: "pluto", name: "Pluto", auFromEarth: 38.48, color: "#d6c7b0" },
  { id: "heliopause", name: "Heliopause", auFromEarth: HELIOPAUSE_AU, color: "#94a3b8", edge: true },
];

export const INNER_BODIES: VoyageStop[] = [
  { id: "sol", name: "Sol", auFromEarth: -1, color: "#fff1b8" },
  { id: "mercury", name: "Mercury", auFromEarth: -(1 - 0.387), color: "#c4b8a5" },
  { id: "venus", name: "Venus", auFromEarth: -(1 - 0.723), color: "#e8d48a" },
];

/** Scene units per AU after Luna. Linear so Mars→Jupiter emptiness matches the clocks. */
export const VOYAGE_UNITS_PER_AU = 850;
/** Luna sits clear of Terra; its real AU is too small to draw. */
const LUNA_VISUAL_X = 108;
const RAIL_ORIGIN = VISUAL.planetRadius + 10;

/** Real radii, km. */
export const WORLD_RADIUS_KM: Record<string, number> = {
  sol: 695_700,
  mercury: 2_440,
  venus: 6_052,
  terra: 6_371,
  luna: 1_737,
  mars: 3_390,
  jupiter: 69_911,
  saturn: 58_232,
  uranus: 25_362,
  neptune: 24_622,
  pluto: 1_188,
};

/** On the rail every world shares one scale: Jupiter is 60 units, so Terra is 5.5 and Pluto is 1. */
export const WORLD_UNITS_PER_KM = 60 / WORLD_RADIUS_KM.jupiter;

/** How many times too big the worlds are drawn compared with the gaps between them. */
export const WORLD_SIZE_EXAGGERATION = Math.round(
  (AU_M / 1000 / VOYAGE_UNITS_PER_AU) * WORLD_UNITS_PER_KM,
);

export function voyageWorldRadius(id: string) {
  const km = WORLD_RADIUS_KM[id];
  return km ? km * WORLD_UNITS_PER_KM : 2;
}

/** Worlds sit beside the rail so the ship passes them instead of flying through. */
export function railSide(radius: number) {
  return -(radius * 2.1 + 26);
}

/**
 * Sol sits off the road, the way a real departure leaves the Sun to one side.
 * Straight behind us every world would show its night face; from here they
 * show a lit gibbous face with a proper terminator.
 */
export const SUN_RAIL_ANGLE = (65 * Math.PI) / 180;

export function voyageWorldPosition(stop: VoyageStop) {
  const radius = voyageWorldRadius(stop.id);
  if (stop.auFromEarth < 0) {
    const d = -voyageVisualX(stop.auFromEarth);
    return {
      x: -d * Math.cos(SUN_RAIL_ANGLE),
      y: 0,
      z: d * Math.sin(SUN_RAIL_ANGLE),
      radius,
    };
  }
  return {
    x: voyageVisualX(stop.auFromEarth),
    y: 0,
    z: stop.auFromEarth > 0 ? railSide(radius) : 0,
    radius,
  };
}

export const CRUISE_WARPS = [
  { id: "1", label: "1×", hint: "Real time", factor: 1 },
  { id: "10", label: "10×", hint: "Ten times", factor: 10 },
  { id: "60", label: "1 min/s", hint: "One minute per second", factor: 60 },
  { id: "600", label: "10 min/s", hint: "Ten minutes per second", factor: 600 },
  { id: "3600", label: "1 h/s", hint: "One hour per second", factor: 3600 },
  { id: "86400", label: "1 day/s", hint: "One day per second", factor: 86_400 },
] as const;

export const DEFAULT_CRUISE_WARP = 1;

/** Real seconds the card stays up after the ship leaves a neighborhood. */
export const FLYBY_LINGER = 7;
/** Warp eases so crossing a neighborhood takes at least this many real seconds. */
export const FLYBY_MIN_PASS = 8;

export type FlybyInfo = {
  kid: string;
  geek: string;
  /** Half-width of the neighborhood in AU — roughly the world's Hill sphere. */
  nearAU: number;
};

export const FLYBY_INFO: Record<string, FlybyInfo> = {
  luna: {
    kid: "Our Moon. Close enough that a radio hello takes about a second.",
    geek: "384,400 km · 1.3 light-seconds. Drawn closer than it really is; every gap after Luna is real.",
    nearAU: 0.0005,
  },
  mars: {
    kid: "The rusty planet. Smaller than Terra — and even light needs minutes to get here.",
    geek: "0.52 AU from Terra · ~4.4 light-minutes. About half Earth’s width.",
    nearAU: 0.007,
  },
  jupiter: {
    kid: "The giant. You could hide a thousand Terras inside.",
    geek: "4.2 AU · ~35 light-minutes. About 11× Terra’s width. Its gravity owns 0.34 AU around it.",
    nearAU: 0.34,
  },
  saturn: {
    kid: "The one with the hat. Those rings are ice and dust, not a solid plate.",
    geek: "8.5 AU · ~71 light-minutes. Rings are thin as paper and wider than the planet.",
    nearAU: 0.41,
  },
  uranus: {
    kid: "An ice giant that rolls on its side, like a ball on its ear.",
    geek: "18.2 AU · ~2.5 light-hours. Tilted about 98°.",
    nearAU: 0.47,
  },
  neptune: {
    kid: "Deep blue, far away. The last of the giant planets.",
    geek: "29.1 AU · ~4.0 light-hours. Fastest winds in the solar system.",
    nearAU: 0.77,
  },
  pluto: {
    kid: "A tiny ice pebble at the edge of the family photo. Smaller than Luna.",
    geek: "38.5 AU · ~5.3 light-hours. A dwarf planet, not a giant.",
    nearAU: 0.04,
  },
  heliopause: {
    kid: "The Sun’s wind fades here. Behind you is home. Ahead is the rest of the galaxy.",
    geek: "Heliopause ~120 AU · ~17 light-hours from Terra. Voyager 1 took 35 years. Light is quicker.",
    nearAU: 1,
  },
};

export function metersToAU(meters: number) {
  return meters / AU_M;
}

export function auToMeters(au: number) {
  return au * AU_M;
}

/** Near-linear AU rail. HUD numbers are real; Luna is the only visual fudge. */
export function voyageVisualX(auFromEarth: number) {
  const sign = auFromEarth < 0 ? -1 : 1;
  const au = Math.abs(auFromEarth);
  if (au <= MOON_AU) {
    const span = LUNA_VISUAL_X - RAIL_ORIGIN;
    return sign * (RAIL_ORIGIN + (au / MOON_AU) * span);
  }
  return sign * (LUNA_VISUAL_X + (au - MOON_AU) * VOYAGE_UNITS_PER_AU);
}

/** The world whose neighborhood the ship is inside, if any. */
export function nearbyStop(auFromEarth: number) {
  for (const stop of VOYAGE_STOPS) {
    const info = FLYBY_INFO[stop.id];
    if (!info) continue;
    if (Math.abs(auFromEarth - stop.auFromEarth) <= info.nearAU) return stop;
  }
  return null;
}

/** Warp cap so a neighborhood takes at least FLYBY_MIN_PASS real seconds to cross. */
export function easedWarp(auFromEarth: number, speedC: number, cruiseWarp: number) {
  const stop = nearbyStop(auFromEarth);
  if (!stop || speedC <= 0) return cruiseWarp;
  const info = FLYBY_INFO[stop.id];
  const storySeconds = (2 * info.nearAU * LIGHT_SECONDS_PER_AU) / speedC;
  const cap = Math.max(1, storySeconds / FLYBY_MIN_PASS);
  return Math.min(cruiseWarp, cap);
}

/** Next neighborhood edge ahead, so one big warp tick cannot leap over a world. */
export function nextWindowStartAU(auFromEarth: number) {
  for (const stop of VOYAGE_STOPS) {
    const info = FLYBY_INFO[stop.id];
    if (!info) continue;
    const start = stop.auFromEarth - info.nearAU;
    if (start > auFromEarth + 1e-12) return start;
  }
  return Number.POSITIVE_INFINITY;
}

export function nextStop(auFromEarth: number) {
  for (const stop of VOYAGE_STOPS) {
    if (stop.auFromEarth > auFromEarth + 1e-9) return stop;
  }
  return VOYAGE_STOPS[VOYAGE_STOPS.length - 1];
}

export function lastStop(auFromEarth: number) {
  let prev = VOYAGE_STOPS[0];
  for (const stop of VOYAGE_STOPS) {
    if (stop.auFromEarth > auFromEarth + 1e-9) return prev;
    prev = stop;
  }
  return prev;
}

export function etaSeconds(auRemain: number, speedC: number) {
  if (!Number.isFinite(speedC) || speedC <= 0) return Number.POSITIVE_INFINITY;
  return (auRemain * LIGHT_SECONDS_PER_AU) / speedC;
}

export function formatAU(au: number) {
  const mag = Math.abs(au);
  if (mag < 0.00001) return "0 AU";
  if (mag < 0.01) return `${au.toFixed(4)} AU`;
  if (mag < 1) return `${au.toFixed(3)} AU`;
  return `${au.toFixed(2)} AU`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds === Number.POSITIVE_INFINITY) return "forever";
  if (seconds < 90) return `${Math.max(0, Math.round(seconds))} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(seconds < 600 ? 1 : 0)} min`;
  if (seconds < 48 * 3600) return `${(seconds / 3600).toFixed(seconds < 10 * 3600 ? 1 : 0)} h`;
  if (seconds < 365.25 * 86400) return `${(seconds / 86400).toFixed(1)} days`;
  const years = seconds / (365.25 * 86400);
  return `${years >= 10 ? years.toFixed(0) : years.toFixed(1)} yr`;
}

export function lightTimeSeconds(au: number) {
  return Math.abs(au) * LIGHT_SECONDS_PER_AU;
}
