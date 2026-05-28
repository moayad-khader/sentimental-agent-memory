"use client";

import { useState } from "react";
import type { MemoryResponse, SentimentRecord, FactRecord, PreferenceRecord, EpisodeRecord, AssociationRecord } from "@smg/shared";

interface Props {
  memory: MemoryResponse | null;
  onRefresh: () => void;
}

function ConfBar({ value }: { value: number }) {
  return (
    <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${Math.round(value * 100)}%`, background: "var(--accent)", borderRadius: 2 }} />
    </div>
  );
}

function Pill({ text, color }: { text: string; color: string }) {
  const styles: Record<string, React.CSSProperties> = {
    positive: { background: "#14532d", color: "#86efac" },
    negative: { background: "#450a0a", color: "#fca5a5" },
    neutral:  { background: "var(--border)", color: "var(--text-muted)" },
    emotion:  { background: "#1e1b4b", color: "#a5b4fc" },
    relation: { background: "#1c1917", color: "#a8a29e" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 7px", borderRadius: 10, fontSize: 10,
      fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em",
      ...styles[color],
    }}>
      {text}
    </span>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-dim)",
          textTransform: "uppercase", letterSpacing: ".06em", cursor: "pointer",
          userSelect: "none", background: "var(--surface2)",
        }}
      >
        {title}
        <span style={{
          background: "var(--border)", border: "1px solid var(--border2)",
          borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 600,
        }}>{count}</span>
      </div>
      {!collapsed && <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>{children}</div>}
    </div>
  );
}

function MemItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "8px 12px", fontSize: 12, lineHeight: 1.5,
      borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 3,
    }}>
      {children}
    </div>
  );
}

function Empty() {
  return <div style={{ padding: 12, fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>none</div>;
}

export function MemoryPanel({ memory, onRefresh }: Props) {
  const sentiments: SentimentRecord[] = memory?.sentiments ?? [];
  const facts: FactRecord[] = memory?.facts ?? [];
  const preferences: PreferenceRecord[] = memory?.preferences ?? [];
  const episodes: EpisodeRecord[] = memory?.episodes ?? [];
  const associations: AssociationRecord[] = memory?.associations ?? [];

  return (
    <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", letterSpacing: ".06em", textTransform: "uppercase" }}>
          Memory
        </span>
        <button
          onClick={onRefresh}
          style={{
            background: "transparent", border: "1px solid var(--border2)", borderRadius: 6,
            color: "var(--text-dim)", fontSize: 12, padding: "4px 10px", cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {!memory ? (
          <div style={{ padding: 12, fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
            Send a message to see memory.
          </div>
        ) : (
          <>
            <Section title="Sentiments" count={sentiments.length}>
              {sentiments.length === 0 ? <Empty /> : sentiments.map((s, i) => (
                <MemItem key={i}>
                  <div style={{ fontWeight: 600, color: "#cbd5e1" }}>
                    {s.entityName}{" "}
                    <span style={{ color: "var(--text-dim)", fontWeight: 400, fontSize: 11 }}>{s.entityType}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Pill text={s.sentiment} color={s.sentiment === "positive" ? "positive" : s.sentiment === "negative" ? "negative" : "neutral"} />
                    <Pill text={s.emotion} color="emotion" />
                  </div>
                  <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{s.reason}</div>
                  <ConfBar value={s.confidence} />
                </MemItem>
              ))}
            </Section>

            <Section title="Facts" count={facts.length}>
              {facts.length === 0 ? <Empty /> : facts.map((f, i) => (
                <MemItem key={i}>
                  <div style={{ fontWeight: 600, color: "#cbd5e1" }}>{f.entityName}</div>
                  <div><Pill text={f.relation} color="relation" /></div>
                  <ConfBar value={f.confidence} />
                </MemItem>
              ))}
            </Section>

            <Section title="Preferences" count={preferences.length}>
              {preferences.length === 0 ? <Empty /> : preferences.map((p, i) => (
                <MemItem key={i}>
                  <div style={{ fontWeight: 600, color: "#cbd5e1" }}>{p.entityName}</div>
                  <div><Pill text={p.polarity} color={p.polarity === "positive" ? "positive" : "negative"} /></div>
                  <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{p.reason}</div>
                  <ConfBar value={p.confidence} />
                </MemItem>
              ))}
            </Section>

            <Section title="Episodes" count={episodes.length}>
              {episodes.length === 0 ? <Empty /> : episodes.map((ep, i) => {
                const ts = new Date(ep.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                return (
                  <MemItem key={i}>
                    <div style={{ color: "var(--text-dim)", display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span>{ts}</span>
                      <Pill text={ep.source} color="neutral" />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                      {ep.entities.length === 0
                        ? <span style={{ color: "var(--text-faint)" }}>no entities</span>
                        : ep.entities.map((e) => (
                          <span key={e.id} style={{
                            background: "var(--border)", border: "1px solid var(--border2)",
                            borderRadius: 4, padding: "1px 6px", fontSize: 10, color: "var(--text-muted)",
                          }}>{e.name}</span>
                        ))
                      }
                    </div>
                  </MemItem>
                );
              })}
            </Section>

            <Section title="Associations" count={associations.length}>
              {associations.length === 0 ? <Empty /> : associations.map((a, i) => (
                <MemItem key={i}>
                  <div style={{ fontWeight: 600, color: "#cbd5e1" }}>
                    {a.entityAName} <span style={{ color: "var(--text-faint)" }}>↔</span> {a.entityBName}
                  </div>
                  <div style={{ color: "var(--text-dim)" }}>seen {a.observedCount}×</div>
                  <ConfBar value={a.weight} />
                </MemItem>
              ))}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
