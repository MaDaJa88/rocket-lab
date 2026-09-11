/** Mini-Earth: real gravity feel, reachable single-stage orbit for a well-built rocket. */
export const PLANET = {
  name: "Terra",
  radius: 600_000,
  surfaceG: 9.81,
  mu: 9.81 * 600_000 ** 2,
  scaleHeight: 5_500,
  rho0: 1.225,
  karmanLine: 52_000,
  atmosphereTop: 80_000,
  targetOrbit: 108_000,
  rotationPeriod: 24 * 3600,
} as const;

export const VISUAL = {
  planetRadius: 52,
  rocketHeight: 2.35,
  padHeight: 0.08,
} as const;

export const VISUAL_SCALE = VISUAL.planetRadius / PLANET.radius;

export const SIM = {
  substep: 1 / 120,
  maxSubsteps: 96,
  warpPad: 1.6,
  warpAtmo: 2.6,
  warpSpace: 3.4,
  warpOrbit: 16,
  maxHeating: 2.4e7,
  tumbleBreakup: 6.2,
  padSpeed: 2.5,
  crashSpeed: 18,
} as const;

export const G0 = 9.80665;
export const LIGHT_C = 299_792_458;
