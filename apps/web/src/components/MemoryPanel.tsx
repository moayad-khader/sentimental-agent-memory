"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { archiveSentiment, deleteFact, deletePreference } from "@/lib/api";
import type {
  MemoryResponse, SentimentRecord, FactRecord,
  PreferenceRecord, EpisodeRecord, AssociationRecord,
} from "@smg/shared";

// ── helpers ───────────────────────────────────────────────────────────────────

type Polarity = "positive" | "negative" | "mixed" | "neutral";

const POLARITY: Record<Polarity, { dot: string; bar: string; tag: string }> = {
  positive: { dot: "bg-emerald-400", bar: "bg-emerald-400", tag: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  negative: { dot: "bg-red-400",     bar: "bg-red-400",     tag: "text-red-700 bg-red-50 border-red-200"           },
  mixed:    { dot: "bg-amber-400",   bar: "bg-amber-400",   tag: "text-amber-700 bg-amber-50 border-amber-200"     },
  neutral:  { dot: "bg-stone-300",   bar: "bg-stone-300",   tag: "text-stone-500 bg-stone-50 border-stone-200"     },
};
function pol(s: string) { return POLARITY[s as Polarity] ?? POLARITY.neutral; }

function Pct({ value, color }: { value: number; color: string }) {
  const p = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-[3px] rounded-full bg-stone-100">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${p}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-stone-400 w-6 text-right">{p}%</span>
    </div>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <span className={cn("inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide", color)}>
      {text}
    </span>
  );
}

// ── grouped sentiments ────────────────────────────────────────────────────────

type Group = { entityId: string; entityName: string; entityType: string; entries: SentimentRecord[] };

function group(items: SentimentRecord[]): Group[] {
  const m = new Map<string, Group>();
  for (const s of items) {
    if (!m.has(s.entityId)) m.set(s.entityId, { entityId: s.entityId, entityName: s.entityName, entityType: s.entityType, entries: [] });
    m.get(s.entityId)!.entries.push(s);
  }
  return Array.from(m.values());
}

// ── empty ─────────────────────────────────────────────────────────────────────

function Empty({ text }: { text: string }) {
  return <div className="px-5 py-10 text-center text-[12px] text-stone-400">{text}</div>;
}

// ── tabs ──────────────────────────────────────────────────────────────────────

function SentimentsTab({ items, userId, onDeleted }: { items: SentimentRecord[]; userId: string; onDeleted: () => void }) {
  const groups = group(items);
  if (!groups.length) return <Empty text="No sentiments recorded yet" />;

  return (
    <div className="flex flex-col gap-px">
      {groups.map(g => {
        const dominant = g.entries.reduce((a, b) => a.confidence > b.confidence ? a : b);
        const p = pol(dominant.sentiment);
        return (
          <div key={g.entityId} className="px-4 py-3.5 hover:bg-stone-50 transition-colors group/entity">
            <div className="flex items-center gap-2 mb-2.5">
              <span className={cn("w-2 h-2 rounded-full shrink-0", p.dot)} />
              <span className="text-[14px] font-semibold text-zinc-800 leading-none">{g.entityName}</span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider ml-auto">{g.entityType}</span>
            </div>
            <div className="flex flex-col gap-2.5 pl-4">
              {g.entries.map((s, i) => {
                const c = pol(s.sentiment);
                return (
                  <div key={i} className="group/row relative">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tag text={s.sentiment} color={c.tag} />
                      <span className="text-[10px] text-violet-600 font-medium">{s.emotion}</span>
                      <button
                        onClick={async () => { await archiveSentiment(userId, s.entityId, s.emotion); onDeleted(); }}
                        className="ml-auto opacity-0 group-hover/row:opacity-100 text-stone-300 hover:text-red-400 transition-all text-[11px] leading-none"
                        title="Remove"
                      >×</button>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed mb-1">{s.reason}</p>
                    <Pct value={s.confidence} color={c.bar} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FactsTab({ items, userId, onDeleted }: { items: FactRecord[]; userId: string; onDeleted: () => void }) {
  if (!items.length) return <Empty text="No facts recorded yet" />;
  return (
    <div className="flex flex-col gap-px">
      {items.map((f, i) => (
        <div key={i} className="px-4 py-3 hover:bg-stone-50 transition-colors group/row">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-[13px] font-medium text-zinc-800">{f.entityName}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-stone-400 bg-stone-100 rounded px-1.5 py-0.5">
                {f.relation.replace(/_/g, " ")}
              </span>
              <button
                onClick={async () => { await deleteFact(userId, f.entityId, f.relation); onDeleted(); }}
                className="opacity-0 group-hover/row:opacity-100 text-stone-300 hover:text-red-400 transition-all text-[11px] leading-none"
                title="Remove"
              >×</button>
            </div>
          </div>
          <Pct value={f.confidence} color="bg-violet-400" />
        </div>
      ))}
    </div>
  );
}

function PreferencesTab({ items, userId, onDeleted }: { items: PreferenceRecord[]; userId: string; onDeleted: () => void }) {
  if (!items.length) return <Empty text="No preferences recorded yet" />;
  return (
    <div className="flex flex-col gap-px">
      {items.map((p, i) => {
        const positive = ["positive", "likes", "prefers"].includes(p.polarity);
        const c = positive ? POLARITY.positive : POLARITY.negative;
        return (
          <div key={i} className="px-4 py-3 hover:bg-stone-50 transition-colors group/row">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("w-2 h-2 rounded-full shrink-0", c.dot)} />
              <span className="text-[13px] font-medium text-zinc-800">{p.entityName}</span>
              <Tag text={p.polarity} color={c.tag} />
              <button
                onClick={async () => { await deletePreference(userId, p.entityId); onDeleted(); }}
                className="ml-auto opacity-0 group-hover/row:opacity-100 text-stone-300 hover:text-red-400 transition-all text-[11px] leading-none"
                title="Remove"
              >×</button>
            </div>
            {p.reason && <p className="text-[11px] text-stone-500 leading-relaxed pl-4 mb-1">{p.reason}</p>}
            <div className="pl-4"><Pct value={p.confidence} color={c.bar} /></div>
          </div>
        );
      })}
    </div>
  );
}

function EpisodesTab({ items }: { items: EpisodeRecord[] }) {
  if (!items.length) return <Empty text="No episodes recorded yet" />;
  return (
    <div className="flex flex-col gap-px">
      {items.map((ep, i) => {
        const ts = new Date(ep.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        return (
          <div key={i} className="px-4 py-3 hover:bg-stone-50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-stone-400">{ts}</span>
              <span className="text-[10px] text-stone-400 bg-stone-100 rounded px-1.5 py-0.5">{ep.source}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {ep.entities.length === 0
                ? <span className="text-[11px] text-stone-400">—</span>
                : ep.entities.map(e => (
                  <span key={e.id} className="text-[11px] text-zinc-600 bg-stone-50 border border-[#e4e0d8] rounded px-1.5 py-0.5">
                    {e.name}
                  </span>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssociationsTab({ items }: { items: AssociationRecord[] }) {
  if (!items.length) return <Empty text="Send more messages to build associations" />;
  return (
    <div className="flex flex-col gap-px">
      {items.map((a, i) => (
        <div key={i} className="px-4 py-3 hover:bg-stone-50 transition-colors">
          <div className="flex items-center gap-1.5 text-[13px] mb-1.5">
            <span className="font-medium text-zinc-800 truncate">{a.entityAName}</span>
            <span className="text-stone-300 shrink-0 text-xs">—</span>
            <span className="font-medium text-zinc-800 truncate">{a.entityBName}</span>
            <span className="ml-auto text-[10px] text-stone-400 shrink-0">{a.observedCount}×</span>
          </div>
          <Pct value={a.weight} color="bg-violet-300" />
        </div>
      ))}
    </div>
  );
}

// ── panel ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "sentiments",   label: "Sentiments" },
  { key: "facts",        label: "Facts"       },
  { key: "preferences",  label: "Prefs"       },
  { key: "episodes",     label: "Episodes"    },
  { key: "associations", label: "Links"       },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function MemoryPanel({ memory, onRefresh, userId }: { memory: MemoryResponse | null; onRefresh: () => void; userId: string }) {
  const [tab, setTab] = useState<TabKey>("sentiments");

  const sentiments   = memory?.sentiments   ?? [];
  const facts        = memory?.facts        ?? [];
  const preferences  = memory?.preferences  ?? [];
  const episodes     = memory?.episodes     ?? [];
  const associations = memory?.associations ?? [];

  const counts: Record<TabKey, number> = {
    sentiments:   group(sentiments).length,
    facts:        facts.length,
    preferences:  preferences.length,
    episodes:     episodes.length,
    associations: associations.length,
  };

  return (
    <div className="w-[260px] shrink-0 flex flex-col overflow-hidden border-l border-[#e4e0d8] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-[#e4e0d8] shrink-0" style={{ height: 47 }}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">Memory</span>
        <button onClick={onRefresh} className="text-[11px] text-stone-400 hover:text-violet-600 transition-colors">
          refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e4e0d8] shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative flex-1 py-2 text-[10px] font-medium transition-colors",
              tab === t.key ? "text-violet-700" : "text-stone-400 hover:text-stone-600"
            )}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={cn("ml-0.5 text-[9px]", tab === t.key ? "text-violet-400" : "text-stone-300")}>
                {counts[t.key]}
              </span>
            )}
            {tab === t.key && (
              <span className="absolute bottom-0 inset-x-2 h-[2px] bg-violet-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f0ede8]">
        {!memory ? (
          <Empty text="Send a message to start building memory." />
        ) : (
          <>
            {tab === "sentiments"   && <SentimentsTab items={sentiments} userId={userId} onDeleted={onRefresh} />}
            {tab === "facts"        && <FactsTab items={facts} userId={userId} onDeleted={onRefresh} />}
            {tab === "preferences"  && <PreferencesTab items={preferences} userId={userId} onDeleted={onRefresh} />}
            {tab === "episodes"     && <EpisodesTab items={episodes} />}
            {tab === "associations" && <AssociationsTab items={associations} />}
          </>
        )}
      </div>
    </div>
  );
}
