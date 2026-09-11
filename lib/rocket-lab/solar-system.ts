import { PLANET, VISUAL } from "./constants";

/** Luna is closer than the real Moon so a family can actually fly there on this mini-world. */
export const MOON = {
  name: "Luna",
  radius: 164_000,
  surfaceG: 1.62,
  mu: 1.62 * 164_000 ** 2,
  orbitRadius: 3_600_000,
  period: 2 * Math.PI * Math.sqrt(3_600_000 ** 3 / PLANET.mu),
  encounter: 120_000,
} as const;

export const SUN = {
  name: "Sol",
  /** Visual distance from Terra, scene units — not a real AU. */
  visualDistance: 430,
  visualRadius: 16,
  color: "#fff1b8",
} as const;

export type SolarPlanet = {
  id: string;
  name: string;
  au: number;
  color: string;
  visualRadius: number;
  /** Seconds of wall-clock time for one visual lap — slow enough to feel like a sky, not a spinner. */
  visualPeriod: number;
  phase: number;
  ring?: boolean;
  home?: boolean;
};

/** Terra year on screen ~ 3 hours. Other planets keep real period ratios. */
const TERRA_YEAR = 10_800;

export const SOLAR_PLANETS: SolarPlanet[] = [
  { id: "mercury", name: "Mercury", au: 0.39, color: "#c4b8a5", visualRadius: 2.1, visualPeriod: TERRA_YEAR * 0.241, phase: 0.4 },
  { id: "venus", name: "Venus", au: 0.72, color: "#e8d48a", visualRadius: 4.6, visualPeriod: TERRA_YEAR * 0.615, phase: 1.2 },
  { id: "terra", name: "Terra", au: 1, color: "#3d8fd6", visualRadius: VISUAL.planetRadius, visualPeriod: TERRA_YEAR, phase: 0, home: true },
  { id: "mars", name: "Mars", au: 1.52, color: "#d08050", visualRadius: 3.3, visualPeriod: TERRA_YEAR * 1.881, phase: 2.1 },
  { id: "jupiter", name: "Jupiter", au: 5.2, color: "#e0b07a", visualRadius: 13, visualPeriod: TERRA_YEAR * 11.86, phase: 0.7 },
  { id: "saturn", name: "Saturn", au: 9.5, color: "#e6d3a3", visualRadius: 11, visualPeriod: TERRA_YEAR * 29.46, phase: 3.4, ring: true },
  { id: "uranus", name: "Uranus", au: 19.2, color: "#7ec8d4", visualRadius: 7.5, visualPeriod: TERRA_YEAR * 84.01, phase: 5.0 },
  { id: "neptune", name: "Neptune", au: 30, color: "#4f7cff", visualRadius: 7.2, visualPeriod: TERRA_YEAR * 164.8, phase: 1.8 },
];

/** One visual AU — inner planets fit in a zoomed-out sky. */
export const VISUAL_AU = 205;

export function moonPosition(time: number) {
  const n = (2 * Math.PI) / MOON.period;
  const a = MOON.orbitRadius;
  const ang = n * time + 0.55;
  return {
    x: Math.sin(ang) * a,
    y: Math.cos(ang) * a,
    z: 0,
  };
}

export function helioOffset(planet: SolarPlanet, time: number) {
  const ang = (2 * Math.PI * time) / planet.visualPeriod + planet.phase;
  const r = planet.au * VISUAL_AU;
  return { x: Math.cos(ang) * r, z: Math.sin(ang) * r };
}

export function geocentricVisual(planet: SolarPlanet, time: number) {
  const terra = SOLAR_PLANETS.find((item) => item.home)!;
  const self = helioOffset(planet, time);
  const home = helioOffset(terra, time);
  return { x: self.x - home.x, y: 0, z: self.z - home.z };
}

export function sunVisual(time: number) {
  const terra = SOLAR_PLANETS.find((item) => item.home)!;
  const home = helioOffset(terra, time);
  return { x: -home.x, y: 0, z: -home.z };
}

export function circularSpeed(radius: number, mu = PLANET.mu) {
  return Math.sqrt(mu / Math.max(radius, 1));
}

export function escapeSpeed(radius: number, mu = PLANET.mu) {
  return Math.sqrt((2 * mu) / Math.max(radius, 1));
}
