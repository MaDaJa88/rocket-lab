"use client";

import { designHint } from "@/lib/rocket-lab/parts";
import { formatLightSpeed } from "@/lib/rocket-lab/report";
import type { AssembledRocket } from "@/lib/rocket-lab/types";

export function HangarStats({ rocket }: { rocket: AssembledRocket }) {
  const hints = designHint(rocket);
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
