"use client";

import { designHint } from "@/lib/rocket-lab/parts";
import { formatLightSpeed } from "@/lib/rocket-lab/report";
import type { AssembledRocket } from "@/lib/rocket-lab/types";

export function HangarStats({
  rocket,
  compact = false,
}: {
  rocket: AssembledRocket;
  compact?: boolean;
}) {
  const hints = designHint(rocket);

  if (compact) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 font-mono text-[10px] text-cyan-50">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <MiniStat k="TWR" v={rocket.twr.toFixed(2)} ok={rocket.canLiftOff} />
          <MiniStat k="Δv" v={`${(rocket.deltaV / 1000).toFixed(1)} km/s`} ok={rocket.deltaV > 3400} />
          <MiniStat k="c" v={formatLightSpeed(rocket.topSpeedC)} ok={rocket.topSpeedC >= 0.05} />
          <MiniStat k="Fins" v={rocket.stable ? "OK" : "Wobbly"} ok={rocket.stable} />
        </div>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-white/75">
          {hints.lift} {hints.speed}
        </p>
      </div>
    );
  }

  return (
    <div className="pointer-events-none w-[min(100%,22rem)] rounded-2xl border border-white/15 bg-[#071018]/78 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
      <p className="font-mono text-[10px] tracking-[0.2em] text-cyan-200/80 uppercase">
        This build
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px] text-cyan-50">
        <Stat k="Lift (TWR)" v={rocket.twr.toFixed(2)} ok={rocket.canLiftOff} />
        <Stat k="Straight?" v={rocket.stable ? "Yes" : "Wobbly"} ok={rocket.stable} />
        <Stat k="Go-juice" v={`${(rocket.deltaV / 1000).toFixed(1)} km/s`} ok={rocket.deltaV > 3400} />
        <Stat k="Air push" v={rocket.cdA.toFixed(2)} ok={rocket.cdA < 0.5} />
        <Stat
          k="Vs light"
          v={formatLightSpeed(rocket.topSpeedC)}
          ok={rocket.topSpeedC >= 0.05}
          wide
        />
      </dl>
      <ul className="mt-2.5 space-y-1 text-[12px] leading-snug text-white/80">
        <li>• {hints.lift}</li>
        <li>• {hints.straight}</li>
        <li>• {hints.sleek}</li>
        <li>• {hints.fuel}</li>
        <li>• {hints.speed}</li>
      </ul>
    </div>
  );
}

function MiniStat({ k, v, ok }: { k: string; v: string; ok: boolean }) {
  return (
    <span className={ok ? "text-emerald-300" : "text-amber-300"}>
      <span className="text-white/45">{k} </span>
      {v}
    </span>
  );
}

function Stat({
  k,
  v,
  ok,
  wide,
}: {
  k: string;
  v: string;
  ok: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-white/45">{k}</dt>
      <dd className={ok ? "text-sm text-emerald-300" : "text-sm text-amber-300"}>{v}</dd>
    </div>
  );
}
