"use client";

import { formatKm, formatLightSpeed, formatSpeed } from "@/lib/rocket-lab/report";
import { formatAU, formatDuration, lightTimeSeconds } from "@/lib/rocket-lab/voyage";
import { cn } from "@/lib/utils";
import type { Telemetry } from "@/lib/rocket-lab/types";

/**
 * What stays on screen when the panels have faded: one calm line of where you
 * are, and the card for whichever world you are passing. Sized for a TV across the room.
 */
export function ZenTicker({
  telemetry,
  visible,
  tvMode,
  relaunchIn,
}: {
  telemetry: Telemetry;
  visible: boolean;
  tvMode: boolean;
  relaunchIn: number | null;
}) {
  const voyage = telemetry.voyage;
  const atEdge = telemetry.flybyId === "heliopause" && telemetry.etaNext < 1;
  const stats = voyage
    ? [
        `${formatAU(telemetry.voyageAU)} from Terra`,
        formatLightSpeed(telemetry.speedC),
        atEdge
          ? "the end of the road"
          : `next ${telemetry.nextStopName} in ${formatDuration(telemetry.etaNext)}`,
        `a message home takes ${formatDuration(lightTimeSeconds(telemetry.voyageAU))}`,
      ].join(" · ")
    : `${formatKm(telemetry.altitude)} up · ${formatSpeed(telemetry.speed)}`;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/60 via-black/25 to-transparent px-6 pt-28 pb-8 transition-opacity duration-[1600ms] ease-out sm:pb-10",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="max-w-3xl text-center">
        <p className="font-mono text-[11px] tracking-[0.24em] text-cyan-200/70 uppercase">
          {voyage ? "Star road" : "Climb"}
          {tvMode ? " · TV mode" : ""}
        </p>
        <p
          className="mt-1.5 text-2xl text-white/95 drop-shadow-md sm:text-4xl"
          style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
        >
          {telemetry.phaseLabel}
        </p>
        {telemetry.flybyId ? (
          <>
            <p className="mt-3 text-base leading-relaxed text-white/90 sm:text-xl">
              {telemetry.flybyKid}
            </p>
            <p className="mt-1.5 font-mono text-xs leading-relaxed text-cyan-100/75 sm:text-sm">
              {telemetry.flybyGeek}
            </p>
          </>
        ) : null}
        <p className="mt-3 font-mono text-xs text-white/60 sm:text-sm">{stats}</p>
        {relaunchIn !== null ? (
          <p className="mt-2 font-mono text-xs text-amber-200/85 sm:text-sm">
            Next launch in {relaunchIn} s
          </p>
        ) : null}
      </div>
    </div>
  );
}
