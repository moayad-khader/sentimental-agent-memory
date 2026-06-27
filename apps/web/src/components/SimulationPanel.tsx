"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TickResult } from "@smg/shared";

interface Props {
  lastTick: TickResult | null;
  simulating: boolean;
  onRunTick: () => void;
}

type Polarity = "positive" | "negative" | "neutral" | "mixed";

const SENT: Record<Polarity, { text: string; bar: string }> = {
  positive: { text: "text-emerald-600", bar: "bg-emerald-400" },
  negative: { text: "text-red-600",     bar: "bg-red-400"     },
  neutral:  { text: "text-stone-500",   bar: "bg-stone-300"   },
  mixed:    { text: "text-amber-600",   bar: "bg-amber-400"   },
};
const sc = (s: string) => SENT[s as Polarity] ?? SENT.neutral;

function DriftRow({ d, idx }: { d: TickResult["drifts"][0]; idx: number }) {
  const beforePct = Math.round(d.before.confidence * 100);
  const afterPct  = Math.round(d.after.confidence * 100);
  const delta     = afterPct - beforePct;
  const flipped   = d.before.sentiment !== d.after.sentiment;
  const after     = sc(d.after.sentiment);
  const before    = sc(d.before.sentiment);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.07, duration: 0.22, ease: "easeOut" }}
      className={cn("px-4 py-3.5 hover:bg-stone-50 transition-colors", idx > 0 && "border-t border-[#f0ede8]")}
    >
      {/* Entity + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[13px] font-semibold text-zinc-800 leading-tight">{d.entityName}</span>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {flipped && (
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: idx * 0.07 + 0.15 }}
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
            >
              flipped
            </motion.span>
          )}
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.07 + 0.1 }}
            className="text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5"
          >
            {d.emotion}
          </motion.span>
        </div>
      </div>

      {/* Before → After */}
      <div className="flex items-center gap-1.5 mb-2 text-[12px]">
        <span className={cn("tabular-nums", before.text)}>{d.before.sentiment} {beforePct}%</span>
        <span className="text-stone-300">→</span>
        <span className={cn("font-semibold tabular-nums", after.text)}>{d.after.sentiment} {afterPct}%</span>
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.07 + 0.18 }}
          className={cn(
            "ml-auto text-[12px] font-bold tabular-nums",
            delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-stone-400"
          )}
        >
          {delta > 0 ? "+" : ""}{delta}%
        </motion.span>
      </div>

      {/* Bar */}
      <div className="relative h-1.5 rounded-full bg-stone-100 overflow-hidden mb-1.5">
        <div className={cn("absolute inset-y-0 left-0 rounded-full opacity-25", before.bar)}
          style={{ width: `${beforePct}%` }} />
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full", after.bar)}
          initial={{ width: `${beforePct}%` }}
          animate={{ width: `${afterPct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: idx * 0.07 + 0.1 }}
        />
      </div>

      {/* Source */}
      {d.influencedBy.length > 0 && (
        <p className="text-[10px] text-stone-400">
          via {[...new Set(d.influencedBy)].join(", ")}
        </p>
      )}
    </motion.div>
  );
}

export function SimulationPanel({ lastTick, simulating, onRunTick }: Props) {
  const drifts = lastTick?.drifts ?? [];
  const flips  = drifts.filter(d => d.before.sentiment !== d.after.sentiment).length;

  return (
    <div className="w-[268px] flex flex-col overflow-hidden border-l border-[#e4e0d8] bg-white h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-[#e4e0d8] shrink-0" style={{ height: 47 }}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">Propagation</span>
        <motion.button
          onClick={onRunTick}
          disabled={simulating}
          whileHover={!simulating ? { scale: 1.04 } : {}}
          whileTap={!simulating ? { scale: 0.94 } : {}}
          animate={simulating ? {
            boxShadow: [
              "0 0 0 0px rgba(124,58,237,0.35)",
              "0 0 0 6px rgba(124,58,237,0)",
            ],
          } : {}}
          transition={simulating ? { duration: 1, repeat: Infinity, ease: "easeOut" } : { type: "spring", stiffness: 400, damping: 20 }}
          className={cn(
            "text-[12px] font-semibold px-3 py-1 rounded-md transition-colors",
            simulating
              ? "bg-violet-100 text-violet-400 cursor-not-allowed"
              : "bg-violet-600 text-white hover:bg-violet-700"
          )}
        >
          {simulating ? "running…" : "Run tick"}
        </motion.button>
      </div>

      {/* Stats strip */}
      <AnimatePresence>
        {lastTick && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex border-b border-[#f0ede8] shrink-0 overflow-hidden"
          >
            {[
              { label: "Agents", val: lastTick.totalAgents, color: "text-zinc-700" },
              { label: "Drifts", val: drifts.length,        color: drifts.length > 0 ? "text-violet-700" : "text-stone-400" },
              { label: "Flips",  val: flips,                color: flips > 0 ? "text-amber-600" : "text-stone-400" },
            ].map((s, i) => (
              <div key={i} className={cn("flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5", i > 0 && "border-l border-[#f0ede8]")}>
                <motion.span
                  key={s.val}
                  initial={{ scale: 1.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 18, delay: i * 0.06 }}
                  className={cn("text-[15px] font-bold tabular-nums leading-none", s.color)}
                >
                  {s.val}
                </motion.span>
                <span className="text-[9px] uppercase tracking-wider text-stone-400">{s.label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!lastTick ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.55, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-10 h-10 rounded-full border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-300 text-xl select-none"
              >
                ○
              </motion.div>
              <div>
                <p className="text-[13px] text-stone-600 font-medium mb-1">No tick run yet</p>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Hit <span className="font-semibold text-stone-500">Run tick</span> to propagate sentiment through the entity network via CO_OCCURS edges.
                </p>
              </div>
            </motion.div>
          ) : drifts.length === 0 ? (
            <motion.div
              key="equilibrium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center"
            >
              <motion.span
                animate={{ rotate: [0, 180, 360], scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="text-3xl text-stone-200 select-none inline-block"
              >◇</motion.span>
              <div>
                <p className="text-[13px] text-stone-600 font-medium mb-1">Equilibrium</p>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Agents are stable. Send more messages to strengthen associations, then run another tick.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="drifts" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="px-4 py-2 border-b border-[#f0ede8]">
                <span className="text-[10px] text-stone-400 tabular-nums">
                  {new Date(lastTick.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              {drifts.map((d, i) => <DriftRow key={i} d={d} idx={i} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
