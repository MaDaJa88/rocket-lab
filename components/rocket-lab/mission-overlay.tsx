"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLANET } from "@/lib/rocket-lab/constants";
import { formatKm, formatSpeed } from "@/lib/rocket-lab/report";
import { formatDuration } from "@/lib/rocket-lab/voyage";
import type { MissionReport } from "@/lib/rocket-lab/types";

export function IntroOverlay({ onGo }: { onGo: () => void }) {
  return (
    <div className="pointer-events-auto mx-auto max-w-lg rounded-3xl border border-white/15 bg-[#0b1628]/92 p-6 text-white shadow-2xl backdrop-blur-md">
      <p className="font-mono text-[10px] tracking-[0.22em] text-cyan-200/80 uppercase">
        Rocket Lab
      </p>
      <h1
        className="mt-1 text-3xl font-semibold"
        style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
      >
        Build a rocket. Beat gravity.
      </h1>
      <ol className="mt-4 space-y-3 text-sm text-white/80">
        <li>
          <strong className="text-orange-300">1. Gravity</strong> pulls everything
          toward the planet. A weak engine cannot even leave the pad.
        </li>
        <li>
          <strong className="text-orange-300">2. Air</strong> pushes on chunky
          shapes. Pointy noses and small fins slip through. Cubes and pancake
          hats do not.
        </li>
        <li>
          <strong className="text-orange-300">3. Orbit</strong> is not just
          “going high.” You must also go sideways so fast that you keep missing
          the ground. Space here starts around {PLANET.karmanLine / 1000} km.
        </li>
        <li>
          <strong className="text-orange-300">4. The solar system</strong> is a
          locked star road. Reach space and the ship flies itself past Luna,
          Mars, and the rest, out to the heliopause. The path cannot turn.
          Distances after Luna are real AU. 1× is real time — hours, not a
          montage. Warp skips emptiness and eases off near each world so you
          can watch it pass.
        </li>
      </ol>
      <p className="mt-3 text-xs text-white/55">
        Mix real future ships (stainless stacks, grid fins, Sun Torch) with a
        fairy-tale Photon Heart at 1.0 c. Reach space and the legend along the
        bottom is the trip. Cruise starts at 1×. Warp if the wait is too long.
        Leave it alone and the panels fade; TV mode goes fullscreen and loops
        the journey for an evening.
      </p>
      <Button
        type="button"
        onClick={onGo}
        className="mt-5 h-12 w-full rounded-2xl bg-orange-400 text-base font-semibold text-orange-950 hover:bg-orange-300"
        style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
      >
        Enter the hangar
      </Button>
    </div>
  );
}

export function CountdownOverlay({ count }: { count: number | "GO" }) {
  return (
    <div
      className="pointer-events-none text-center text-7xl font-semibold text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)] sm:text-8xl"
      style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
      aria-live="assertive"
    >
      {count}
    </div>
  );
}

export function ResultOverlay({
  report,
  onRebuild,
  onRelight,
}: {
  report: MissionReport;
  onRebuild: () => void;
  onRelight: () => void;
}) {
  const win = report.outcome === "orbit" || report.outcome === "escape" || report.outcome === "moon";
  return (
    <div className="pointer-events-auto mx-auto w-full max-w-lg rounded-3xl border border-white/15 bg-[#0b1628]/92 p-6 text-white shadow-2xl backdrop-blur-md">
      <p className="font-mono text-[10px] tracking-[0.22em] text-cyan-200/80 uppercase">
        {win ? "Orbit achieved" : "Mission report"}
      </p>
      <h2
        className="mt-1 text-3xl font-semibold"
        style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
      >
        {report.title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-white/85">{report.kid}</p>
      <p className="mt-2 font-mono text-[12px] leading-relaxed text-cyan-100/75">
        {report.geek}
      </p>
      <p className="mt-3 rounded-2xl bg-orange-400/12 px-3 py-2 text-sm text-orange-100">
        Next try: {report.tip}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px] text-white/70">
        <div>
          <dt className="text-white/40">{win ? "Highest" : "Max height"}</dt>
          <dd>{formatKm(report.maxAltitude)}</dd>
        </div>
        <div>
          <dt className="text-white/40">Max speed</dt>
          <dd>{formatSpeed(report.maxSpeed)}</dd>
        </div>
        <div>
          <dt className="text-white/40">Flight time</dt>
          <dd>{Math.round(report.time)}s</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={onRebuild}
          className="h-11 flex-1 rounded-2xl bg-orange-400 font-semibold text-orange-950 hover:bg-orange-300"
        >
          Rebuild
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onRelight}
          className="h-11 flex-1 rounded-2xl border border-white/15 bg-white/10 text-white hover:bg-white/16"
        >
          Launch this rocket again
        </Button>
      </div>
    </div>
  );
}

export function OrbitToast({
  report,
  onRebuild,
  onRelight,
}: {
  report: MissionReport;
  onRebuild: () => void;
  onRelight: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto w-[min(100%,22.5rem)] rounded-2xl border border-white/15 bg-[#071018]/78 text-white shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <p className="font-mono text-[10px] tracking-[0.18em] text-amber-200/85 uppercase">
            {report.outcome === "moon"
              ? "Luna"
              : report.outcome === "escape"
                ? "Escape"
                : report.outcome === "heliopause"
                  ? "Heliopause"
                  : "Orbit achieved"}
          </p>
          <p
            className="truncate text-base leading-tight"
            style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
          >
            {report.title}
          </p>
          <p className="mt-0.5 text-[11px] text-white/50">
            Drag to look around · Scroll to zoom
          </p>
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] text-white/80 hover:bg-white/16"
          aria-expanded={open}
        >
          {open ? "Hide" : "Details"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open ? (
        <div className="space-y-2.5 border-t border-white/10 px-3 py-3">
          <p className="text-sm leading-relaxed text-white/85">{report.kid}</p>
          <p className="font-mono text-[11px] leading-relaxed text-cyan-100/70">{report.geek}</p>
          <p className="rounded-xl bg-orange-400/12 px-2.5 py-1.5 text-xs text-orange-100">
            Next try: {report.tip}
          </p>
          <dl className="grid grid-cols-3 gap-2 font-mono text-[11px] text-white/70">
            <div>
              <dt className="text-white/40">Highest</dt>
              <dd>{formatKm(report.maxAltitude)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Max speed</dt>
              <dd>{formatSpeed(report.maxSpeed)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Time</dt>
              <dd>
                {report.outcome === "heliopause"
                  ? formatDuration(report.time)
                  : `${Math.round(report.time)}s`}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
      <div className="flex gap-2 border-t border-white/10 px-3 py-2.5">
        <Button
          type="button"
          onClick={onRebuild}
          className="h-9 flex-1 rounded-xl bg-orange-400 text-sm font-semibold text-orange-950 hover:bg-orange-300"
        >
          Rebuild
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onRelight}
          className="h-9 flex-1 rounded-xl border border-white/15 bg-white/10 text-sm text-white hover:bg-white/16"
        >
          Launch again
        </Button>
      </div>
    </div>
  );
}
