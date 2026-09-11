/**
 * Procedural Rocket Lab sound: one shared AudioContext, soft pads for hours of
 * star-road watching, and a few quiet SFX. No music files — everything is
 * oscillators + filtered noise so mute stays instant and the bundle stays tiny.
 */

export type AudioScene = {
  muted: boolean;
  phase: "hangar" | "countdown" | "flight" | "result";
  voyage: boolean;
  engineOn: boolean;
  altitude: number;
  /** 0..1 how hard the ship is pushing through air. */
  speedNorm: number;
  flybyId: string | null;
  inFlight: boolean;
};

type PadVoice = {
  osc: OscillatorNode;
  gain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
};

const SPACE_NOTES = [65.41, 98.0, 130.81, 155.56, 196.0]; // C2 G2 C3 Eb3 G3
const HANGAR_NOTES = [98.0, 146.83, 196.0]; // G2 D3 G3 — a touch warmer on the pad

export class RocketAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hangarGain: GainNode | null = null;
  private spaceGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private flybyGain: GainNode | null = null;
  private pads: PadVoice[] = [];
  private spacePads: PadVoice[] = [];
  private rumble: OscillatorNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private wind: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private shimmerTimer: number | null = null;
  private lastFlyby: string | null = null;
  private started = false;
  private muted = false;

  /** Call from a click/keydown so the browser unlocks audio. */
  unlock() {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    const master = this.master;
    const ctx = this.ctx;
    if (!master || !ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.08);
  }

  /** Soft countdown / UI tones. */
  blip(freq: number) {
    if (this.muted) return;
    const ctx = this.ensure();
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  }

  cheer() {
    if (this.muted) return;
    this.blip(523);
    window.setTimeout(() => this.blip(659), 90);
    window.setTimeout(() => this.blip(784), 180);
  }

  thud() {
    if (this.muted) return;
    const ctx = this.ensure();
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.35);
    filter.type = "lowpass";
    filter.frequency.value = 180;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  /** Drive continuous beds from the live mission state. */
  tick(scene: AudioScene) {
    if (scene.muted !== this.muted) this.setMuted(scene.muted);
    if (scene.muted) return;
    if (!scene.inFlight && scene.phase === "hangar") {
      this.ensureBeds();
      this.fadeBed(this.hangarGain, 0.045, 1.4);
      this.fadeBed(this.spaceGain, 0.0, 2.2);
      this.fadeBed(this.rumbleGain, 0.0, 0.6);
      this.fadeBed(this.windGain, 0.0, 0.6);
      return;
    }
    if (scene.phase === "countdown") {
      this.ensureBeds();
      this.fadeBed(this.hangarGain, 0.02, 0.8);
      this.fadeBed(this.spaceGain, 0.0, 1.0);
      return;
    }
    if (!scene.inFlight) {
      this.fadeBed(this.hangarGain, 0.0, 1.5);
      this.fadeBed(this.spaceGain, 0.0, 2.0);
      this.fadeBed(this.rumbleGain, 0.0, 0.5);
      this.fadeBed(this.windGain, 0.0, 0.5);
      return;
    }

    this.ensureBeds();
    const climb = !scene.voyage;
    // Hangar pad slips away; space bed rises once you leave the air.
    this.fadeBed(this.hangarGain, climb ? 0.012 : 0.0, 2.0);
    this.fadeBed(this.spaceGain, climb ? 0.018 : 0.07, climb ? 3.0 : 4.0);

    if (climb && scene.engineOn) {
      const thrust = 0.035 + scene.speedNorm * 0.07;
      this.fadeBed(this.rumbleGain, thrust, 0.35);
      if (this.rumbleFilter) {
        this.rumbleFilter.frequency.setTargetAtTime(
          90 + scene.speedNorm * 140,
          this.ctx!.currentTime,
          0.25,
        );
      }
    } else {
      this.fadeBed(this.rumbleGain, 0.0, 0.8);
    }

    if (climb) {
      const air =
        scene.altitude < 52_000
          ? Math.min(0.055, 0.008 + scene.speedNorm * 0.05) *
            Math.max(0, 1 - scene.altitude / 55_000)
          : 0;
      this.fadeBed(this.windGain, air, 0.5);
      if (this.windFilter) {
        this.windFilter.frequency.setTargetAtTime(
          400 + scene.speedNorm * 1800,
          this.ctx!.currentTime,
          0.3,
        );
      }
    } else {
      this.fadeBed(this.windGain, 0.0, 1.2);
    }

    if (scene.flybyId && scene.flybyId !== this.lastFlyby) {
      this.lastFlyby = scene.flybyId;
      this.flybySwell();
    }
    if (!scene.flybyId) this.lastFlyby = null;
  }

  dispose() {
    if (this.shimmerTimer !== null) window.clearTimeout(this.shimmerTimer);
    this.shimmerTimer = null;
    try {
      this.ctx?.close();
    } catch {
      /* already closed */
    }
    this.ctx = null;
    this.started = false;
    this.pads = [];
    this.spacePads = [];
    if (shared === this) shared = null;
  }

  private ensure() {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return ctx;
  }

  private ensureBeds() {
    const ctx = this.ensure();
    const master = this.master;
    if (!ctx || !master || this.started) return;
    this.started = true;

    this.hangarGain = ctx.createGain();
    this.hangarGain.gain.value = 0;
    this.hangarGain.connect(master);
    this.pads = HANGAR_NOTES.map((hz, i) =>
      this.makePad(hz, this.hangarGain!, 0.022 / (1 + i * 0.15), 0.07 + i * 0.02),
    );

    this.spaceGain = ctx.createGain();
    this.spaceGain.gain.value = 0;
    this.spaceGain.connect(master);
    this.spacePads = SPACE_NOTES.map((hz, i) =>
      this.makePad(hz, this.spaceGain!, 0.028 / (1 + i * 0.12), 0.04 + i * 0.018),
    );
    // Soft cosmic hush under the pads.
    const hush = this.makeNoise(ctx, 8);
    const hushFilter = ctx.createBiquadFilter();
    hushFilter.type = "bandpass";
    hushFilter.frequency.value = 420;
    hushFilter.Q.value = 0.5;
    const hushGain = ctx.createGain();
    hushGain.gain.value = 0.012;
    hush.connect(hushFilter);
    hushFilter.connect(hushGain);
    hushGain.connect(this.spaceGain);
    hush.start();

    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    this.rumbleGain.connect(master);
    this.rumble = ctx.createOscillator();
    this.rumble.type = "sawtooth";
    this.rumble.frequency.value = 48;
    this.rumbleFilter = ctx.createBiquadFilter();
    this.rumbleFilter.type = "lowpass";
    this.rumbleFilter.frequency.value = 110;
    this.rumble.connect(this.rumbleFilter);
    this.rumbleFilter.connect(this.rumbleGain);
    this.rumble.start();

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.windGain.connect(master);
    this.wind = this.makeNoise(ctx, 2);
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 800;
    this.windFilter.Q.value = 0.7;
    this.wind.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.wind.start();

    this.flybyGain = ctx.createGain();
    this.flybyGain.gain.value = 1;
    this.flybyGain.connect(master);

    this.scheduleShimmer();
  }

  private makePad(hz: number, dest: GainNode, level: number, lfoRate: number): PadVoice {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    const gain = ctx.createGain();
    gain.gain.value = level;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = lfoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = level * 0.35;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    lfo.start();
    return { osc, gain, lfo, lfoGain };
  }

  private makeNoise(ctx: AudioContext, seconds: number) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  private fadeBed(node: GainNode | null, target: number, seconds: number) {
    if (!node || !this.ctx) return;
    const now = this.ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setTargetAtTime(Math.max(0, target), now, Math.max(0.05, seconds / 4));
  }

  /** Quiet high tone that drifts in every half-minute or so — like a distant star. */
  private scheduleShimmer() {
    if (this.shimmerTimer !== null) window.clearTimeout(this.shimmerTimer);
    const wait = 18_000 + Math.random() * 28_000;
    this.shimmerTimer = window.setTimeout(() => {
      this.shimmerTimer = null;
      if (!this.muted && this.spaceGain && this.ctx && this.spaceGain.gain.value > 0.01) {
        this.playShimmer();
      }
      this.scheduleShimmer();
    }, wait);
  }

  private playShimmer() {
    const ctx = this.ctx;
    const dest = this.spaceGain;
    if (!ctx || !dest) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880 + Math.random() * 1400;
    const peak = 0.008 + Math.random() * 0.008;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 2.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 8 + Math.random() * 4);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 14);
  }

  private flybySwell() {
    const ctx = this.ctx;
    const dest = this.flybyGain;
    if (!ctx || !dest || this.muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(165, ctx.currentTime + 2.8);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 6);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/** Singleton shared by the app so countdown blips and beds share one context. */
let shared: RocketAudio | null = null;

export function getRocketAudio() {
  if (!shared) shared = new RocketAudio();
  return shared;
}
