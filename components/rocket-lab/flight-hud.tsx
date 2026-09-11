"use client";

import { ATMOSPHERE_LAYERS, layerAt } from "@/lib/rocket-lab/atmosphere";
import { PLANET } from "@/lib/rocket-lab/constants";
import { formatKm, formatLightSpeed, formatSpeed } from "@/lib/rocket-lab/report";
import { formatAU, formatDuration, lightTimeSeconds } from "@/lib/rocket-lab/voyage";
import { cn } from "@/lib/utils";
import type { Telemetry } from "@/lib/rocket-lab/types";

export function FlightHud({ telemetry }: { telemetry: Telemetry }) {
  if (telemetry.voyage) {
    return (
      <div className="pointer-events-none flex w-full max-w-xl flex-col gap-2">
        <div className="rounded-2xl border border-white/15 bg-[#071018]/75 px-4 py-3 backdrop-blur-md">
          <p className="font-mono text-[10px] tracking-[0.2em] text-cyan-200/80 uppercase">
            Cruise
          </p>
          <p
            className="text-lg text-white"
            style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
          >
            {telemetry.phaseLabel}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs text-cyan-50 sm:grid-cols-3">
            <Meter label="From Terra" value={formatAU(telemetry.voyageAU)} />
            <Meter label="Vs light" value={formatLightSpeed(telemetry.speedC)} />
            <Meter label="Story time" value={formatDuration(telemetry.voyageTime)} />
            <Meter label="Next" value={telemetry.nextStopName} />
            <Meter label="ETA next" value={formatDuration(telemetry.etaNext)} />
            <Meter label="Light-lag next" value={formatDuration(lightTimeSeconds(Math.max(0, telemetry.nextStopAU - telemetry.voyageAU)))} />
          </div>
          {telemetry.flybyId ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-white/90">{telemetry.flybyKid}</p>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-cyan-100/75">
                {telemetry.flybyGeek}
              </p>
              <p className="mt-2 text-[11px] text-amber-100/80">
                Warp eases off inside a world’s neighborhood, then picks back up.
              </p>
            </>
          ) : telemetry.speedC >= 0.99 ? (
            <p className="mt-2 text-[11px] text-cyan-200/85">
              Photon Heart: this is light speed. A radio call and the ship arrive together.
            </p>
          ) : telemetry.speedC >= 0.04 ? (
            <p className="mt-2 text-[11px] text-cyan-200/85">
              Star drive {formatLightSpeed(telemetry.speedC)}. Light is still faster — that’s
              the lag number.
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-amber-200/80">
              Chemical crawl. Warp a lot, or rebuild with Sun Torch / Photon Heart.
            </p>
          )}
          <p className="mt-2 text-[11px] text-white/40">
            Drag to look around · Scroll to zoom · Path is locked
          </p>
        </div>
      </div>
    );
  }

  const layer = layerAt(telemetry.altitude);

  return (
    <div className="pointer-events-none flex w-full max-w-xl flex-col gap-2">
      <div className="rounded-2xl border border-white/15 bg-[#071018]/75 px-4 py-3 backdrop-blur-md">
        <p className="font-mono text-[10px] tracking-[0.2em] text-cyan-200/80 uppercase">
          Telemetry
        </p>
        <p
          className="text-lg text-white"
          style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
        >
          {telemetry.phaseLabel}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {ATMOSPHERE_LAYERS.map((item) => {
            const active = item.id === layer.id;
            return (
              <span
                key={item.id}
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase",
                  active ? "text-slate-950" : "bg-white/10 text-white/45",
                )}
                style={active ? { background: item.accent } : undefined}
              >
                {item.kidName}
              </span>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-white/70">
          <span className="text-white/90">{layer.geekName}.</span> {layer.blurb}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs text-cyan-50 sm:grid-cols-3">
          <Meter label="Height" value={formatKm(telemetry.altitude)} />
          <Meter label="Speed" value={formatSpeed(telemetry.speed)} />
          <Meter label="Vs light" value={formatLightSpeed(telemetry.speedC)} />
          <Meter label="Highest" value={formatKm(telemetry.apoapsis)} />
          <Meter label="Lowest" value={formatKm(telemetry.periapsis)} />
          <Meter label="Top c" value={formatLightSpeed(telemetry.topSpeedC)} />
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between font-mono text-[10px] tracking-wide text-white/55 uppercase">
            <span>Fuel</span>
            <span>{Math.round(telemetry.fuelFrac * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
              style={{ width: `${Math.max(0, Math.min(100, telemetry.fuelFrac * 100))}%` }}
            />
          </div>
        </div>
        {telemetry.inSpace ? (
          <p className="mt-2 text-sm text-emerald-300">
            {telemetry.bound
              ? `You crossed ~${PLANET.karmanLine / 1000} km — that's space!`
              : "Terra cannot pull you back — that's escape!"}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-white/40">
          Drag to look around · Scroll or pinch to zoom
        </p>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-white/45">{label}</div>
      <div className="text-sm text-white">{value}</div>
    </div>
  );
}
