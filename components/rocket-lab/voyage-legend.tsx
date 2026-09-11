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

  return (
    <div className="pointer-events-auto w-full max-w-5xl rounded-2xl border border-white/15 bg-[#071018]/82 px-3 py-2.5 text-white shadow-2xl backdrop-blur-md sm:px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-mono text-[10px] tracking-[0.18em] text-cyan-200/80 uppercase">
          Star road · Terra → heliopause
        </p>
        <p className="font-mono text-[11px] text-white/70">
          {formatAU(telemetry.voyageAU)} · {formatLightSpeed(telemetry.speedC)} · next{" "}
          {telemetry.nextStopName} in {formatDuration(telemetry.etaNext)}
          {nextRemain > 0 ? ` (${formatAU(nextRemain)})` : ""}
        </p>
      </div>

      <div className="relative mt-3 h-8">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/20" />
        {VOYAGE_STOPS.map((stop) => {
          const left = (stop.auFromEarth / end) * 100;
          const passed = telemetry.voyageAU >= stop.auFromEarth - 1e-6;
          const looking = telemetry.flybyId === stop.id;
          return (
            <div
              key={stop.id}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${left}%` }}
            >
              <span
                className={cn(
                  "rounded-full border border-white/40",
                  looking ? "size-3.5 ring-2 ring-orange-300/80" : "size-2.5",
                )}
                style={{ background: passed || looking ? stop.color : "transparent" }}
              />
              <span
                className={cn(
                  "mt-0.5 max-w-[4.2rem] truncate text-center font-mono text-[9px] tracking-wide uppercase",
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

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-white/55">
          Story {formatDuration(telemetry.voyageTime)} · edge {formatDuration(telemetry.etaEdge)}
          {" · "}
          1× is real time. Worlds are true to each other’s size, drawn {WORLD_SIZE_EXAGGERATION}×
          too big for the gaps.
        </p>
        <div className="flex flex-wrap gap-1">
          {CRUISE_WARPS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.hint}
              aria-pressed={warp === item.factor}
              onClick={() => onWarp(item.factor)}
              className={cn(
                "h-7 rounded-full border px-2 font-mono text-[10px] tracking-wide uppercase",
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
