"use client";

import { cn } from "@/lib/utils";
import type { TickResult } from "@smg/shared";

interface Props {
  lastTick: TickResult | null;
  simulating: boolean;
  onRunTick: () => void;
}

type Polarity = "positive" | "negative" | "neutral" | "mixed";

const SENT: Record<Polarity, { text: string; bar: string; faint: string }> = {
  positive: { text: "text-emerald-600", bar: "bg-emerald-400", faint: "bg-emerald-100" },
  negative: { text: "text-red-600",     bar: "bg-red-400",     faint: "bg-red-100"     },
  neutral:  { text: "text-stone-500",   bar: "bg-stone-300",   faint: "bg-stone-100"   },
  mixed:    { text: "text-amber-600",   bar: "bg-amber-400",   faint: "bg-amber-100"   },
};
const sc = (s: string) => SENT[s as Polarity] ?? SENT.neutral;

function DriftRow({ d, i }: { d: TickResult["drifts"][0]; i: number }) {
  const beforePct = Math.round(d.before.confidence * 100);
  const afterPct  = Math.round(d.after.confidence * 100);
  const delta     = afterPct - beforePct;
  const flipped   = d.before.sentiment !== d.after.sentiment;
  const after     = sc(d.after.sentiment);
  const before    = sc(d.before.sentiment);

  return (
    <div className={cn("px-4 py-3.5 hover:bg-stone-50 transition-colors", i > 0 && "border-t border-[#f0ede8]")}>
      {/* Entity + emotion */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[13px] font-semibold text-zinc-800 leading-tight">{d.entityName}</span>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {flipped && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              flipped
            </span>
          )}
          <span className="text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5">
            {d.emotion}
          </span>
        </div>
      </div>

      {/* Before → After */}
      <div className="flex items-center gap-1.5 mb-2 text-[12px]">
        <span className={cn("tabular-nums", before.text)}>{d.before.sentiment} {beforePct}%</span>
        <span className="text-stone-300">→</span>
        <span className={cn("font-semibold tabular-nums", after.text)}>{d.after.sentiment} {afterPct}%</span>
        <span className={cn(
          "ml-auto text-[12px] font-bold tabular-nums",
          delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-stone-400"
        )}>
          {delta > 0 ? "+" : ""}{delta}%
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-1.5 rounded-full bg-stone-100 overflow-hidden mb-1.5">
        <div className={cn("absolute inset-y-0 left-0 rounded-full opacity-25 transition-all duration-500", before.bar)}
          style={{ width: `${beforePct}%` }} />
        <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700", after.bar)}
          style={{ width: `${afterPct}%` }} />
      </div>

      {/* Source */}
      {d.influencedBy.length > 0 && (
        <p className="text-[10px] text-stone-400">
          via {[...new Set(d.influencedBy)].join(", ")}
        </p>
      )}
    </div>
  );
}

export function SimulationPanel({ lastTick, simulating, onRunTick }: Props) {
  const drifts = lastTick?.drifts ?? [];
  const flips  = drifts.filter(d => d.before.sentiment !== d.after.sentiment).length;

  return (
    <div className="w-[268px] shrink-0 flex flex-col overflow-hidden border-l border-[#e4e0d8] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-[#e4e0d8] shrink-0" style={{ height: 47 }}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">Propagation</span>
        <button
          onClick={onRunTick}
          disabled={simulating}
          className={cn(
            "text-[12px] font-semibold px-3 py-1 rounded-md transition-all",
            simulating
              ? "bg-stone-100 text-stone-400 cursor-not-allowed"
              : "bg-violet-600 text-white hover:bg-violet-700"
          )}
        >
          {simulating ? "running…" : "Run tick"}
        </button>
      </div>

      {/* Stats strip */}
      {lastTick && (
        <div className="flex border-b border-[#f0ede8] shrink-0">
          {[
            { label: "Agents", val: lastTick.totalAgents, color: "text-zinc-700" },
            { label: "Drifts", val: drifts.length,        color: drifts.length > 0 ? "text-violet-700" : "text-stone-400" },
            { label: "Flips",  val: flips,                color: flips > 0 ? "text-amber-600" : "text-stone-400" },
          ].map((s, i) => (
            <div key={i} className={cn("flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5", i > 0 && "border-l border-[#f0ede8]")}>
              <span className={cn("text-[15px] font-bold tabular-nums leading-none", s.color)}>{s.val}</span>
              <span className="text-[9px] uppercase tracking-wider text-stone-400">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!lastTick ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-300 text-xl select-none">
              ○
            </div>
            <div>
              <p className="text-[13px] text-stone-600 font-medium mb-1">No tick run yet</p>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Hit <span className="font-semibold text-stone-500">Run tick</span> to propagate sentiment through the entity network via CO_OCCURS edges.
              </p>
            </div>
          </div>
        ) : drifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <span className="text-3xl text-stone-200 select-none">◇</span>
            <div>
              <p className="text-[13px] text-stone-600 font-medium mb-1">Equilibrium</p>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Agents are stable. Send more messages to strengthen associations, then run another tick.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-[#f0ede8]">
              <span className="text-[10px] text-stone-400 tabular-nums">
                {new Date(lastTick.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
            {drifts.map((d, i) => <DriftRow key={i} d={d} i={i} />)}
          </>
        )}
      </div>
    </div>
  );
}
