import { PLANET } from "./constants";

export type AtmosphereLayerId = "ground" | "tropo" | "strato" | "space";

export type AtmosphereLayer = {
  id: AtmosphereLayerId;
  kidName: string;
  geekName: string;
  blurb: string;
  /** Exclusive upper bound in meters. */
  maxAlt: number;
  accent: string;
  sky: string;
};

export const ATMOSPHERE_LAYERS: AtmosphereLayer[] = [
  {
    id: "ground",
    kidName: "Ground",
    geekName: "Surface",
    blurb: "Still in the thick air next to the planet.",
    maxAlt: 800,
    accent: "#fbbf24",
    sky: "#9ad6fb",
  },
  {
    id: "tropo",
    kidName: "Thick sky",
    geekName: "Troposphere",
    blurb: "Weather sky — clouds and most of the air live here.",
    maxAlt: 12_000,
    accent: "#38bdf8",
    sky: "#3a6cc8",
  },
  {
    id: "strato",
    kidName: "Stratosphere",
    geekName: "Thin high air",
    blurb: "Air gets thin and the sky turns purple-dark.",
    maxAlt: PLANET.karmanLine,
    accent: "#c4b5fd",
    sky: "#1c1456",
  },
  {
    id: "space",
    kidName: "Space",
    geekName: "Above the Karman line",
    blurb: `Past ~${PLANET.karmanLine / 1000} km there is almost no air.`,
    maxAlt: Number.POSITIVE_INFINITY,
    accent: "#fde68a",
    sky: "#03050c",
  },
];

export function layerAt(altitude: number): AtmosphereLayer {
  for (const layer of ATMOSPHERE_LAYERS) {
    if (altitude < layer.maxAlt) return layer;
  }
  return ATMOSPHERE_LAYERS[ATMOSPHERE_LAYERS.length - 1];
}

/** Physical altitudes (m) used to place the 3D sky / space shells. */
export const LAYER_SHELL_ALTS = {
  clouds: 6_000,
  tropo: 12_000,
  strato: PLANET.karmanLine,
  space: PLANET.atmosphereTop,
} as const;

export type SkyKeyframe = {
  alt: number;
  /** Straight up. */
  sky: string;
  /** Along the horizon — paler and hazier low down. */
  horizon: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  star: number;
  /** Warm glow around the Sun in the dome: thick air scatters, vacuum does not. */
  haze: number;
  amb: number;
  sun: number;
  hemi: number;
};

/** Climb the sky: day blue → twilight → indigo → space black. */
export const SKY_KEYFRAMES: SkyKeyframe[] = [
  { alt: 0, sky: "#4aa4ee", horizon: "#a3d0f5", fog: "#b3dbf7", fogNear: 88, fogFar: 470, star: 0, haze: 1, amb: 0.84, sun: 2.62, hemi: 1.08 },
  { alt: 2_400, sky: "#4097e8", horizon: "#93c6f2", fog: "#9fcff3", fogNear: 96, fogFar: 500, star: 0, haze: 0.95, amb: 0.78, sun: 2.4, hemi: 0.98 },
  { alt: 7_200, sky: "#3380cf", horizon: "#7db5e5", fog: "#7fb9e7", fogNear: 115, fogFar: 560, star: 0.03, haze: 0.85, amb: 0.68, sun: 2.12, hemi: 0.82 },
  { alt: 12_000, sky: "#3161bf", horizon: "#729cd6", fog: "#6c9bdc", fogNear: 145, fogFar: 640, star: 0.12, haze: 0.7, amb: 0.55, sun: 1.78, hemi: 0.62 },
  { alt: 18_000, sky: "#3b42a6", horizon: "#7b74c4", fog: "#6a6cc0", fogNear: 185, fogFar: 760, star: 0.3, haze: 0.55, amb: 0.42, sun: 1.42, hemi: 0.42 },
  { alt: 28_000, sky: "#2b1e76", horizon: "#6c4a9b", fog: "#4d3690", fogNear: 250, fogFar: 920, star: 0.5, haze: 0.38, amb: 0.3, sun: 1.12, hemi: 0.26 },
  { alt: 40_000, sky: "#150f47", horizon: "#3e2b77", fog: "#2a1c66", fogNear: 330, fogFar: 1180, star: 0.74, haze: 0.2, amb: 0.2, sun: 0.98, hemi: 0.14 },
  { alt: 52_000, sky: "#08071c", horizon: "#221b49", fog: "#120d2c", fogNear: 460, fogFar: 1700, star: 0.92, haze: 0.08, amb: 0.14, sun: 1.1, hemi: 0.08 },
  { alt: 85_000, sky: "#02030a", horizon: "#04060f", fog: "#03050c", fogNear: 2400, fogFar: 16000, star: 1, haze: 0, amb: 0.09, sun: 1.45, hemi: 0.04 },
];

export type AtmosphereLook = {
  t: number;
  i: number;
  star: number;
  haze: number;
  amb: number;
  sun: number;
  hemi: number;
  fogNear: number;
  fogFar: number;
};

export function smooth01(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function lookOf(k: SkyKeyframe, i: number, t: number): AtmosphereLook {
  return { t, i, star: k.star, haze: k.haze, amb: k.amb, sun: k.sun, hemi: k.hemi, fogNear: k.fogNear, fogFar: k.fogFar };
}

export function sampleAtmosphere(altitude: number): AtmosphereLook {
  const alt = Math.max(0, altitude);
  const last = SKY_KEYFRAMES.length - 1;
  if (alt <= SKY_KEYFRAMES[0].alt) return lookOf(SKY_KEYFRAMES[0], 0, 0);
  if (alt >= SKY_KEYFRAMES[last].alt) return lookOf(SKY_KEYFRAMES[last], last - 1, 1);
  let i = 0;
  while (i < last && alt > SKY_KEYFRAMES[i + 1].alt) i += 1;
  const a = SKY_KEYFRAMES[i];
  const b = SKY_KEYFRAMES[i + 1];
  const t = smooth01((alt - a.alt) / Math.max(1, b.alt - a.alt));
  return {
    t,
    i,
    star: a.star + (b.star - a.star) * t,
    haze: a.haze + (b.haze - a.haze) * t,
    amb: a.amb + (b.amb - a.amb) * t,
    sun: a.sun + (b.sun - a.sun) * t,
    hemi: a.hemi + (b.hemi - a.hemi) * t,
    fogNear: a.fogNear + (b.fogNear - a.fogNear) * t,
    fogFar: a.fogFar + (b.fogFar - a.fogFar) * t,
  };
}
