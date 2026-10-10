"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FlightHud } from "@/components/rocket-lab/flight-hud";
import { HangarPanel } from "@/components/rocket-lab/hangar-panel";
import { HangarStats } from "@/components/rocket-lab/hangar-stats";
import {
  CountdownOverlay,
  IntroOverlay,
  OrbitToast,
  ResultOverlay,
} from "@/components/rocket-lab/mission-overlay";
import { VoyageLegend } from "@/components/rocket-lab/voyage-legend";
import { ZenTicker } from "@/components/rocket-lab/zen-ticker";
import { Button } from "@/components/ui/button";
import { getRocketAudio } from "@/lib/rocket-lab/audio";
import { DEFAULT_DESIGN, assembleRocket } from "@/lib/rocket-lab/parts";
import { buildReport } from "@/lib/rocket-lab/report";
import { cn } from "@/lib/utils";
import { DEFAULT_CRUISE_WARP } from "@/lib/rocket-lab/voyage";
import type {
  MissionPhase,
  MissionReport,
  RocketDesign,
  SimState,
  SteerInput,
  Telemetry,
} from "@/lib/rocket-lab/types";

const RocketCanvas = dynamic(
  () =>
    import("@/components/rocket-lab/scene/rocket-canvas").then(
      (mod) => mod.RocketCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#07101f] text-sm text-cyan-100/70">
        Warming up the launch computers…
      </div>
    ),
  },
);

const ZERO_TELEM: Telemetry = {
  altitude: 0,
  speed: 0,
  fuelFrac: 1,
  twr: 0,
  apoapsis: 0,
  periapsis: 0,
  heating: 0,
  phaseLabel: "On the pad",
  inSpace: false,
  engineOn: false,
  gForce: 1,
  headingDeg: 0,
  time: 0,
  bound: true,
  speedC: 0,
  topSpeedC: 0,
  voyage: false,
  voyageAU: 0,
  voyageTime: 0,
  cruiseWarp: DEFAULT_CRUISE_WARP,
  nextStopName: "Luna",
  nextStopAU: 0,
  etaNext: 0,
  etaEdge: 0,
  flybyId: null,
  flybyKid: "",
  flybyGeek: "",
};

const LIVE_RESULTS = new Set(["orbit", "escape", "moon", "heliopause"]);

/** Panels fade after this long without a touch; TV mode is quicker about it. */
const HUD_IDLE_MS = 20_000;
const HUD_IDLE_TV_MS = 2_200;
/** TV mode loops the journey: a long look at the edge, a short one at a crash. */
const RELAUNCH_AFTER_EDGE_S = 45;
const RELAUNCH_AFTER_FAIL_S = 12;

export function RocketLabApp() {
  const [design, setDesign] = useState<RocketDesign>(DEFAULT_DESIGN);
  const [phase, setPhase] = useState<MissionPhase>("hangar");
  const [running, setRunning] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [count, setCount] = useState<number | "GO" | null>(null);
  const [report, setReport] = useState<MissionReport | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry>(ZERO_TELEM);
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tvMode, setTvMode] = useState(false);
  const [idle, setIdle] = useState(false);
  const [relaunchIn, setRelaunchIn] = useState<number | null>(null);
  const steerRef = useRef<SteerInput>({ pitch: 0 });
  const warpRef = useRef(DEFAULT_CRUISE_WARP);
  const [cruiseWarp, setCruiseWarp] = useState(DEFAULT_CRUISE_WARP);
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const rocket = useMemo(() => assembleRocket(design), [design]);

  useEffect(() => {
    if (phase === "flight") setRunning(true);
  }, [phase]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // ?tv=1 boots straight into the calm layout for a screen on the wall.
    if (new URLSearchParams(window.location.search).get("tv") === "1") {
      setTvMode(true);
      setShowIntro(false);
    }
  }, []);

  const liveResult = Boolean(report?.outcome && LIVE_RESULTS.has(report.outcome));
  const inFlight = phase === "flight" || (phase === "result" && liveResult);

  useEffect(() => {
    const audio = getRocketAudio();
    audio.setMuted(muted);
    audio.tick({
      muted,
      phase,
      voyage: telemetry.voyage,
      engineOn: telemetry.engineOn,
      altitude: telemetry.altitude,
      speedNorm: Math.min(1, telemetry.speed / 900),
      flybyId: telemetry.flybyId,
      inFlight,
    });
  }, [
    muted,
    phase,
    inFlight,
    telemetry.voyage,
    telemetry.engineOn,
    telemetry.altitude,
    telemetry.speed,
    telemetry.flybyId,
  ]);

  useEffect(() => {
    if (!inFlight) return;
    const delay = tvMode ? HUD_IDLE_TV_MS : HUD_IDLE_MS;
    let timer = window.setTimeout(() => setIdle(true), delay);
    const poke = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), delay);
    };
    const events = tvMode
      ? (["pointerdown", "keydown"] as const)
      : (["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const);
    for (const name of events) window.addEventListener(name, poke, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const name of events) window.removeEventListener(name, poke);
    };
  }, [inFlight, tvMode]);
  const hudIdle = idle && inFlight;

  const launch = useCallback(() => {
    if (phase !== "hangar") return;
    const audio = getRocketAudio();
    audio.unlock();
    setReport(null);
    setIdle(false);
    warpRef.current = DEFAULT_CRUISE_WARP;
    setCruiseWarp(DEFAULT_CRUISE_WARP);
    setPhase("countdown");
    setCount(3);
    if (!mutedRef.current) audio.blip(440);
  }, [phase]);

  useEffect(() => {
    if (phase !== "countdown") return;
    const audio = getRocketAudio();
    let n = 3;
    const timers: number[] = [];
    const id = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(id);
        setCount("GO");
        if (!mutedRef.current) audio.blip(660);
        timers.push(
          window.setTimeout(() => {
            setRunning(true);
            setPhase("flight");
            setCount(null);
          }, 420),
        );
      } else {
        setCount(n);
        if (!mutedRef.current) audio.blip(n === 1 ? 520 : 400);
      }
    }, 720);
    return () => {
      window.clearInterval(id);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " " && phase === "hangar") {
        event.preventDefault();
        launch();
      }
      if (event.key === "r" || event.key === "R") {
        setRunning(false);
        setPhase("hangar");
        setReport(null);
        setCount(null);
        setTelemetry(ZERO_TELEM);
        warpRef.current = DEFAULT_CRUISE_WARP;
        setCruiseWarp(DEFAULT_CRUISE_WARP);
      }
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        steerRef.current.pitch = -1;
      }
      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        steerRef.current.pitch = 1;
      }
    };
    const onUp = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "a" ||
        event.key === "A" ||
        event.key === "d" ||
        event.key === "D"
      ) {
        steerRef.current.pitch = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [launch, phase]);

  const onOutcome = useCallback(
    (state: SimState) => {
      const next = buildReport(state, rocket);
      setReport(next);
      setPhase("result");
      const live = Boolean(state.outcome && LIVE_RESULTS.has(state.outcome));
      if (!live) setRunning(false);
      if (mutedRef.current) return;
      if (live) getRocketAudio().cheer();
      else getRocketAudio().thud();
    },
    [rocket],
  );

  const setWarp = (factor: number) => {
    warpRef.current = factor;
    setCruiseWarp(factor);
  };

  const rebuild = useCallback(() => {
    setRunning(false);
    setPhase("hangar");
    setReport(null);
    setIdle(false);
    setTelemetry(ZERO_TELEM);
    warpRef.current = DEFAULT_CRUISE_WARP;
    setCruiseWarp(DEFAULT_CRUISE_WARP);
  }, []);

  const relight = useCallback(() => {
    setReport(null);
    setIdle(false);
    warpRef.current = DEFAULT_CRUISE_WARP;
    setCruiseWarp(DEFAULT_CRUISE_WARP);
    setPhase("countdown");
    setCount(3);
    setRunning(false);
  }, []);

  useEffect(() => {
    // TV mode never sits on a report screen: it counts down and flies again.
    if (!tvMode || phase !== "result") return;
    const total = liveResult ? RELAUNCH_AFTER_EDGE_S : RELAUNCH_AFTER_FAIL_S;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const left = total - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        window.clearInterval(id);
        relight();
      } else {
        setRelaunchIn(left);
      }
    }, 250);
    return () => {
      window.clearInterval(id);
      setRelaunchIn(null);
    };
  }, [tvMode, phase, liveResult, relight]);

  const enterTv = () => {
    setTvMode(true);
    setShowIntro(false);
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      root.requestFullscreen().catch(() => {});
    }
    if (phase === "hangar") launch();
  };

  const exitTv = () => {
    setTvMode(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const fadeWhenIdle = cn(
    "transition-opacity duration-[1400ms] ease-out",
    hudIdle && "pointer-events-none opacity-0",
  );

  return (
    <div className="relative h-dvh overflow-hidden bg-[#07101f] text-white">
      <div
        className="absolute inset-0 h-full w-full bg-[#9ad6fb] [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full"
        role="application"
        aria-label="Rocket view. Drag to look around. Scroll or pinch to zoom."
      >
        <RocketCanvas
          rocket={rocket}
          phase={phase === "result" && liveResult ? "flight" : phase}
          running={running}
          voyage={telemetry.voyage}
          steerRef={steerRef}
          warpRef={warpRef}
          reducedMotion={reducedMotion}
          engineOn={telemetry.engineOn && (running || phase === "flight" || liveResult)}
          onTelemetry={setTelemetry}
          onOutcome={onOutcome}
        />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-4">
        <div
          className={cn(
            "min-w-0 transition-opacity duration-[1400ms]",
            hudIdle && (tvMode ? "opacity-0" : "opacity-40"),
            phase === "hangar" && "hidden sm:block",
          )}
        >
          <p className="hidden font-mono text-[10px] tracking-[0.22em] text-cyan-200/80 uppercase sm:block">
            Family Mission Control
          </p>
          <h1
            className="text-xl font-semibold drop-shadow-md sm:text-3xl"
            style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
          >
            Rocket Lab
          </h1>
        </div>
        <div className={cn("pointer-events-auto ml-auto flex shrink-0 gap-1 sm:gap-1.5", fadeWhenIdle)}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 rounded-full border border-white/15 bg-black/35 px-2.5 text-xs text-white hover:bg-black/50 sm:h-9 sm:px-3 sm:text-sm"
            onClick={() => setShowIntro(true)}
          >
            <span className="sm:hidden">Help</span>
            <span className="hidden sm:inline">How it works</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 rounded-full border border-white/15 bg-black/35 px-2.5 text-xs text-white hover:bg-black/50 sm:h-9 sm:px-3 sm:text-sm"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              const audio = getRocketAudio();
              if (!next) audio.unlock();
              audio.setMuted(next);
            }}
            aria-pressed={muted}
            title="Soft pads for the star road. Rumble on the climb. Mute anytime."
          >
            {muted ? "Mute" : "Sound"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={cn(
              "h-8 rounded-full border px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm",
              tvMode
                ? "border-amber-300/60 bg-amber-400/25 text-white hover:bg-amber-400/35"
                : "border-white/15 bg-black/35 text-white hover:bg-black/50",
            )}
            onClick={tvMode ? exitTv : enterTv}
            aria-pressed={tvMode}
            title="Fullscreen. Panels fade away. The journey loops."
          >
            {tvMode ? "Exit TV" : "TV"}
          </Button>
        </div>
      </header>

      {phase === "hangar" ? (
        <div className="absolute top-14 left-3 z-20 hidden max-w-[calc(100%-1.5rem)] md:block md:top-24">
          <HangarStats rocket={rocket} />
        </div>
      ) : null}

      {phase === "hangar" ? (
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-[min(62dvh,32rem)] flex-col p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-3 md:inset-y-20 md:right-3 md:left-auto md:h-auto md:w-auto md:p-0">
          <HangarPanel
            design={design}
            rocket={rocket}
            onChange={setDesign}
            onLaunch={launch}
            onPreset={setDesign}
          />
        </div>
      ) : null}

      {inFlight ? (
        <div
          className={cn(
            "absolute inset-x-2 top-12 z-20 sm:inset-x-auto sm:left-3 sm:top-24",
            fadeWhenIdle,
          )}
        >
          <FlightHud telemetry={telemetry} />
        </div>
      ) : null}

      {telemetry.voyage && inFlight ? (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:bottom-3 sm:px-3 sm:pb-0",
            fadeWhenIdle,
          )}
        >
          <VoyageLegend telemetry={telemetry} warp={cruiseWarp} onWarp={setWarp} />
        </div>
      ) : null}

      {inFlight ? (
        <ZenTicker
          telemetry={telemetry}
          visible={hudIdle}
          tvMode={tvMode}
          relaunchIn={relaunchIn}
        />
      ) : null}

      {!telemetry.voyage &&
      (phase === "flight" || (phase === "result" && liveResult && report?.outcome !== "moon")) ? (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:hidden">
          <Button
            type="button"
            className="h-12 w-16 rounded-2xl bg-white/15 text-lg"
            onPointerDown={() => {
              steerRef.current.pitch = -1;
            }}
            onPointerUp={() => {
              steerRef.current.pitch = 0;
            }}
            onPointerLeave={() => {
              steerRef.current.pitch = 0;
            }}
          >
            ←
          </Button>
          <Button
            type="button"
            className="h-12 w-16 rounded-2xl bg-white/15 text-lg"
            onPointerDown={() => {
              steerRef.current.pitch = 1;
            }}
            onPointerUp={() => {
              steerRef.current.pitch = 0;
            }}
            onPointerLeave={() => {
              steerRef.current.pitch = 0;
            }}
          >
            →
          </Button>
        </div>
      ) : null}

      {showIntro ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-4">
          <IntroOverlay
            onGo={() => {
              getRocketAudio().unlock();
              setShowIntro(false);
            }}
          />
        </div>
      ) : null}

      {phase === "countdown" && count !== null ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <CountdownOverlay count={count} />
        </div>
      ) : null}

      {phase === "result" && liveResult ? (
        <div
          className={cn(
            "absolute top-20 right-3 z-20 max-w-[calc(100%-1.5rem)] sm:top-24 sm:right-4",
            fadeWhenIdle,
          )}
        >
          <OrbitToast report={report!} onRebuild={rebuild} onRelight={relight} />
        </div>
      ) : null}

      {phase === "result" && report && !liveResult ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center p-4 pb-6 sm:items-center">
          <div className="pointer-events-auto">
            <ResultOverlay report={report} onRebuild={rebuild} onRelight={relight} />
            {tvMode && relaunchIn !== null ? (
              <p className="mt-3 text-center font-mono text-xs text-amber-200/85">
                TV mode · launching again in {relaunchIn} s
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
