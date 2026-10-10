"use client";

import {
  CRUISE_WARPS,
  VOYAGE_STOPS,
  WORLD_SIZE_EXAGGERATION,
  formatAU,
  formatDuration,
} from "@/lib/rocket-lab/voyage";
import { formatLightSpeed } from "@/lib/rocket-lab/report";
import { cn } from "@/lib/utils";
import type { Telemetry } from "@/lib/rocket-lab/types";

export function VoyageLegend({
  telemetry,
  warp,
  onWarp,
}: {
  telemetry: Telemetry;
  warp: number;
  onWarp: (factor: number) => void;
}) {
  const end = VOYAGE_STOPS[VOYAGE_STOPS.length - 1].auFromEarth;
  const t = Math.max(0, Math.min(1, telemetry.voyageAU / end));
  const nextRemain = Math.max(0, telemetry.nextStopAU - telemetry.voyageAU);
  const nextStop = VOYAGE_STOPS.find((stop) => stop.auFromEarth > telemetry.voyageAU + 1e-9);

  return (
    <div className="pointer-events-auto w-full max-w-5xl rounded-2xl border border-white/15 bg-[#071018]/88 px-2.5 py-2 text-white shadow-2xl backdrop-blur-md sm:px-4 sm:py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <p className="font-mono text-[10px] tracking-[0.18em] text-cyan-200/80 uppercase">
          Star road
        </p>
        <p className="font-mono text-[10px] text-white/70 sm:text-[11px]">
          {formatAU(telemetry.voyageAU)} · {formatLightSpeed(telemetry.speedC)} ·{" "}
          {telemetry.nextStopName} {formatDuration(telemetry.etaNext)}
          {nextRemain > 0 ? (
            <span className="hidden sm:inline">{` (${formatAU(nextRemain)})`}</span>
          ) : null}
        </p>
      </div>

      <div className="relative mt-2 h-6 sm:mt-3 sm:h-8">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/20" />
        {VOYAGE_STOPS.map((stop) => {
          const left = (stop.auFromEarth / end) * 100;
          const passed = telemetry.voyageAU >= stop.auFromEarth - 1e-6;
          const looking = telemetry.flybyId === stop.id;
          const isNext = nextStop?.id === stop.id;
          const showLabel =
            looking ||
            stop.edge ||
            isNext ||
            (stop.id === "mars" && telemetry.voyageAU < 1);
          return (
            <div
              key={stop.id}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${left}%` }}
            >
              <span
                className={cn(
                  "rounded-full border border-white/40",
                  looking ? "size-3 ring-2 ring-orange-300/80 sm:size-3.5" : "size-2 sm:size-2.5",
                )}
                style={{ background: passed || looking ? stop.color : "transparent" }}
              />
              <span
                className={cn(
                  "mt-0.5 max-w-[3.5rem] truncate text-center font-mono text-[8px] tracking-wide uppercase sm:max-w-[4.2rem] sm:text-[9px]",
                  !showLabel && "hidden sm:inline",
                  looking ? "text-orange-100" : passed ? "text-white/85" : "text-white/40",
                )}
              >
                {stop.name}
              </span>
            </div>
          );
        })}
        <div
          className="absolute top-0 z-10 -translate-x-1/2"
          style={{ left: `${t * 100}%` }}
        >
          <span className="block h-3 w-0.5 bg-orange-300" />
          <span className="sr-only">Ship</span>
        </div>
      </div>

      <div className="mt-1.5 flex flex-col gap-1.5 sm:mt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <p className="hidden text-[11px] text-white/55 sm:block">
          Story {formatDuration(telemetry.voyageTime)} · edge {formatDuration(telemetry.etaEdge)}
          {" · "}
          1× is real time. Worlds are true to each other’s size, drawn {WORLD_SIZE_EXAGGERATION}×
          too big for the gaps.
        </p>
        <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {CRUISE_WARPS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.hint}
              aria-pressed={warp === item.factor}
              onClick={() => onWarp(item.factor)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-2.5 font-mono text-[10px] tracking-wide uppercase sm:h-7 sm:px-2",
                warp === item.factor
                  ? "border-orange-300/80 bg-orange-400/20 text-orange-100"
                  : "border-white/15 bg-white/8 text-white/70 hover:bg-white/14",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
