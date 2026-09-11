export type NoseId = "needle" | "dome" | "cube" | "saucer" | "shuttle" | "spike" | "hammer";
export type BodyId = "slim" | "classic" | "chubby" | "crate" | "starship" | "glider" | "orb";
export type FinId = "none" | "stubs" | "classic" | "wings" | "grid" | "ringfin" | "petal";
export type EngineId =
  | "sparkler"
  | "workhorse"
  | "thunder"
  | "cluster"
  | "ion"
  | "pulse"
  | "torch"
  | "photon";
export type PaintId = "sunset" | "mint" | "banana" | "berry" | "cherry" | "chrome" | "nebula" | "lava" | "ghost";

export type PartKind = "nose" | "body" | "fins" | "engine";

export interface RocketDesign {
  nose: NoseId;
  body: BodyId;
  fins: FinId;
  engine: EngineId;
  paint: PaintId;
}

export interface PartOption<Id extends string> {
  id: Id;
  kidName: string;
  geekName: string;
  blurb: string;
  mass: number;
  length: number;
  comFromTail: number;
  area: number;
  cd: number;
  copFromTail: number;
  fuelMass?: number;
  thrust?: number;
  isp?: number;
}

export interface AssembledRocket {
  design: RocketDesign;
  dryMass: number;
  fuelMass: number;
  length: number;
  comFromTail: number;
  copFromTail: number;
  stabilityCalibers: number;
  cdA: number;
  refArea: number;
  thrust: number;
  isp: number;
  twr: number;
  deltaV: number;
  inertia: number;
  stable: boolean;
  canLiftOff: boolean;
  /** Top vacuum speed as a fraction of light speed. */
  topSpeedC: number;
}

export type MissionPhase =
  | "hangar"
  | "countdown"
  | "flight"
  | "result";

export type FlightOutcome =
  | "orbit"
  | "escape"
  | "moon"
  | "heliopause"
  | "crash"
  | "pad"
  | "tumble"
  | "burnup"
  | "suborbital"
  | "spacefall";

export interface SimState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Pitch from local vertical toward +X, radians. */
  theta: number;
  omega: number;
  roll: number;
  rollRate: number;
  fuel: number;
  time: number;
  throttle: number;
  maxAltitude: number;
  maxSpeed: number;
  heating: number;
  airborne: boolean;
  outcome: FlightOutcome | null;
  reason: string;
  phaseLabel: string;
  apoapsis: number;
  periapsis: number;
  eccentricity: number;
  inSpace: boolean;
  engineOn: boolean;
  bound: boolean;
  /** Locked outward rail after leaving the air. */
  voyage: boolean;
  voyageMeters: number;
  voyageTime: number;
  cruiseWarp: number;
  /** World whose card is showing; stays a few real seconds after leaving. */
  flybyId: string | null;
  /** Real seconds since the ship left that neighborhood. */
  flybyLinger: number;
}

export interface SteerInput {
  pitch: number;
}

export interface Telemetry {
  altitude: number;
  speed: number;
  fuelFrac: number;
  twr: number;
  apoapsis: number;
  periapsis: number;
  heating: number;
  phaseLabel: string;
  inSpace: boolean;
  engineOn: boolean;
  gForce: number;
  headingDeg: number;
  time: number;
  bound: boolean;
  speedC: number;
  topSpeedC: number;
  voyage: boolean;
  voyageAU: number;
  voyageTime: number;
  cruiseWarp: number;
  nextStopName: string;
  nextStopAU: number;
  etaNext: number;
  etaEdge: number;
  flybyId: string | null;
  flybyKid: string;
  flybyGeek: string;
}

export interface MissionReport {
  outcome: FlightOutcome;
  title: string;
  kid: string;
  geek: string;
  tip: string;
  maxAltitude: number;
  maxSpeed: number;
  time: number;
}
