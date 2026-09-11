/** Per-frame sky state written by the flight rig, read by the dome and the stars. */
export type LookState = {
  /** Meters above Terra (voyage pins this high so the sky is space). */
  altitude: number;
  /** 0 = daylight hides stars, 1 = full night sky. */
  star: number;
};
