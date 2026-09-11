"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BODIES,
  ENGINES,
  FINS,
  NOSES,
  PAINTS,
  PRESETS,
} from "@/lib/rocket-lab/parts";
import type {
  BodyId,
  EngineId,
  FinId,
  NoseId,
  PaintId,
  RocketDesign,
} from "@/lib/rocket-lab/types";

export function HangarPanel({
  design,
  onChange,
  onLaunch,
  onPreset,
}: {
  design: RocketDesign;
  onChange: (next: RocketDesign) => void;
  onLaunch: () => void;
  onPreset: (next: RocketDesign) => void;
}) {
  return (
    <aside className="pointer-events-auto flex h-full max-h-full w-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0b1628]/88 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-md md:w-[420px]">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.22em] text-cyan-200/80 uppercase">
          Hangar · Mission Control
        </p>
        <h2
          className="text-xl font-semibold text-white"
          style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
        >
          Build your rocket
        </h2>
        <p className="mt-1 text-sm text-white/70">
          Pick parts. Reach space and the ship locks onto a road past Pluto.
          Stainless Bird is ~0.23 c. Light Bird is a 1.0 c dream.
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 rounded-full border border-white/10 bg-white/8 text-xs text-white hover:bg-white/14"
                onClick={() => onPreset(preset.design)}
              >
                {preset.name}
                <span className="text-white/50">· {preset.tag}</span>
              </Button>
            ))}
          </div>

          <PartRow
            label="Nose"
            options={NOSES}
            value={design.nose}
            onPick={(nose) => onChange({ ...design, nose })}
          />
          <PartRow
            label="Body"
            options={BODIES}
            value={design.body}
            onPick={(body) => onChange({ ...design, body })}
          />
          <PartRow
            label="Fins"
            options={FINS}
            value={design.fins}
            onPick={(fins) => onChange({ ...design, fins })}
          />
          <PartRow
            label="Engine"
            options={ENGINES}
            value={design.engine}
            onPick={(engine) => onChange({ ...design, engine })}
          />

          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-cyan-200/70 uppercase">
              Paint
            </p>
            <div className="flex flex-wrap gap-2">
              {PAINTS.map((paint) => (
                <button
                  key={paint.id}
                  type="button"
                  aria-pressed={design.paint === paint.id}
                  aria-label={paint.kidName}
                  onClick={() => onChange({ ...design, paint: paint.id as PaintId })}
                  className={cn(
                    "size-9 rounded-full border-2 transition",
                    design.paint === paint.id
                      ? "scale-110 border-white"
                      : "border-white/20 hover:border-white/60",
                  )}
                  style={{ background: paint.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-white/10 p-3">
        <Button
          type="button"
          onClick={onLaunch}
          className="h-12 w-full rounded-2xl bg-orange-400 text-base font-semibold text-orange-950 hover:bg-orange-300"
          style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
        >
          3…2…1… Launch!
        </Button>
        <p className="mt-1.5 text-center text-[11px] text-white/50">
          Reach space → locked path to the heliopause
          <br />
          Cruise starts at 1× · Drag to look · Scroll to zoom
        </p>
      </div>
    </aside>
  );
}

function PartRow<Id extends NoseId | BodyId | FinId | EngineId>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { id: Id; kidName: string; blurb: string }[];
  value: Id;
  onPick: (id: Id) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-cyan-200/70 uppercase">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(option.id)}
              className={cn(
                "rounded-2xl border px-2.5 py-2 text-left transition",
                active
                  ? "border-orange-300/80 bg-orange-400/15 text-white"
                  : "border-white/10 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/8",
              )}
            >
              <span className="block text-sm font-medium">{option.kidName}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/55">
                {option.blurb}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
