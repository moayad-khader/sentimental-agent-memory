"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MemoryResponse, TickResult } from "@smg/shared";
import { getMemory, sendChat, runSimulation } from "@/lib/api";
import { MemoryPanel } from "./MemoryPanel";

interface Message {
  role: "user" | "agent";
  text: string;
}

export function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", text: "Hey! I remember everything we talk about. What's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("mo");
  const [userName, setUserName] = useState("Moayad");
  const [useMemory, setUseMemory] = useState(true);
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const [online, setOnline] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [lastTick, setLastTick] = useState<TickResult | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollBottom(); }, [messages]);

  const loadMemory = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getMemory(userId);
      setMemory(data);
      setOnline(true);
    } catch { setOnline(false); }
  }, [userId]);

  useEffect(() => { loadMemory(); }, [loadMemory]);

  async function simulate() {
    if (!userId || simulating) return;
    setSimulating(true);
    try {
      const result = await runSimulation(userId);
      setLastTick(result);
      if (result.drifts.length > 0) await loadMemory();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages((prev) => [...prev, { role: "agent", text: `Simulation error: ${msg}` }]);
    } finally {
      setSimulating(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || !userId || !userName || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await sendChat({ userId, userName, message: text, useMemory });
      setMessages((prev) => [...prev, { role: "agent", text: res.response }]);
      setOnline(true);
      if (useMemory) await loadMemory();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages((prev) => [...prev, { role: "agent", text: `Error: ${msg}` }]);
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 20px", background: "var(--surface)",
        borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: online ? "var(--green)" : "var(--red)", flexShrink: 0,
        }} />
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", letterSpacing: ".04em" }}>
          SMG Agent
        </h1>

        {/* Memory toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16 }}>
          <button
            onClick={() => setUseMemory((v) => !v)}
            style={{
              position: "relative", width: 36, height: 20, cursor: "pointer",
              background: "none", border: "none", padding: 0,
            }}
            title="Toggle sentimental memory"
          >
            <div style={{
              position: "absolute", inset: 0,
              background: useMemory ? "var(--accent)" : "var(--border2)",
              borderRadius: 10, transition: "background .2s",
            }} />
            <div style={{
              position: "absolute", top: 3, left: 3, width: 14, height: 14,
              background: "#fff", borderRadius: "50%", transition: "transform .2s",
              transform: useMemory ? "translateX(16px)" : "none",
            }} />
          </button>
          <span style={{
            fontSize: 12, cursor: "pointer",
            color: useMemory ? "#a5b4fc" : "var(--text-dim)",
          }}>
            {useMemory ? "Memory on" : "Memory off"}
          </span>
        </div>

        {/* Simulate button */}
        {useMemory && (
          <button
            onClick={simulate}
            disabled={simulating}
            title="Run one ABM tick — sentiments spread through co-occurrence network"
            style={{
              marginLeft: 8,
              background: simulating ? "var(--border2)" : "#1e1b4b",
              border: "1px solid #3730a3",
              borderRadius: 6,
              color: simulating ? "var(--text-dim)" : "#a5b4fc",
              fontSize: 12,
              padding: "4px 10px",
              cursor: simulating ? "not-allowed" : "pointer",
              transition: "all .15s",
              flexShrink: 0,
            }}
          >
            {simulating ? "Simulating…" : "Run tick"}
          </button>
        )}

        {/* Identity inputs */}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {[
            { id: "userId", value: userId, setter: setUserId, placeholder: "user id" },
            { id: "userName", value: userName, setter: setUserName, placeholder: "user name" },
          ].map(({ id, value, setter, placeholder }) => (
            <input
              key={id}
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={placeholder}
              style={{
                background: "var(--border)", border: "1px solid var(--border2)",
                borderRadius: 6, padding: "5px 10px", fontSize: 13,
                color: "var(--text)", width: 130, outline: "none",
              }}
            />
          ))}
        </div>
      </header>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Chat */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, borderRight: "1px solid var(--border)" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, maxWidth: "78%",
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                flexDirection: m.role === "user" ? "row-reverse" : "row",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
                  background: m.role === "user" ? "var(--accent)" : "var(--border)",
                  color: m.role === "user" ? "#fff" : "var(--text-muted)",
                  border: m.role === "agent" ? "1px solid var(--border2)" : "none",
                }}>
                  {m.role === "user" ? (userName[0] || "U").toUpperCase() : "AI"}
                </div>
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  background: m.role === "user" ? "var(--accent)" : "var(--surface2)",
                  color: m.role === "user" ? "#fff" : "#cbd5e1",
                  border: m.role === "agent" ? "1px solid var(--border)" : "none",
                  borderBottomRightRadius: m.role === "user" ? 4 : 12,
                  borderBottomLeftRadius: m.role === "agent" ? 4 : 12,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10, alignSelf: "flex-start" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 11,
                  fontWeight: 700, background: "var(--border)", color: "var(--text-muted)",
                  border: "1px solid var(--border2)",
                }}>AI</div>
                <div style={{
                  padding: "10px 14px", borderRadius: 12, fontSize: 14,
                  color: "var(--text-faint)", fontStyle: "italic",
                  background: "var(--surface2)", border: "1px solid var(--border)",
                }}>Thinking…</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            display: "flex", gap: 8, padding: "14px 16px",
            borderTop: "1px solid var(--border)", background: "var(--bg)",
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={loading}
              style={{
                flex: 1, background: "var(--border)", border: "1px solid var(--border2)",
                borderRadius: 8, padding: "10px 12px", fontSize: 14,
                color: "var(--text)", resize: "none", outline: "none",
                fontFamily: "inherit", lineHeight: 1.5, maxHeight: 120,
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? "var(--border2)" : "var(--accent)",
                border: "none", borderRadius: 8, width: 40, height: 40,
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, alignSelf: "flex-end", transition: "background .15s",
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="#fff">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        {useMemory && (
          <div style={{ display: "flex", flexDirection: "column", width: 340, flexShrink: 0, overflow: "hidden" }}>
            <MemoryPanel memory={memory} onRefresh={loadMemory} />
            {lastTick && <TickPanel tick={lastTick} onDismiss={() => setLastTick(null)} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tick result panel ─────────────────────────────────────────────────────────

function TickPanel({ tick, onDismiss }: { tick: TickResult; onDismiss: () => void }) {
  const valenceBar = (valence: number) => {
    const pct = Math.round(Math.abs(valence) * 100);
    const color = valence > 0 ? "#86efac" : valence < 0 ? "#fca5a5" : "#94a3b8";
    return (
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width .3s" }} />
      </div>
    );
  };

  return (
    <div style={{
      borderTop: "1px solid var(--border)", background: "var(--surface)",
      flexShrink: 0, maxHeight: 280, overflowY: "auto",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, background: "var(--surface2)", zIndex: 1,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Last tick — {tick.drifts.length} drift{tick.drifts.length !== 1 ? "s" : ""}
        </span>
        <button onClick={onDismiss} style={{
          background: "none", border: "none", color: "var(--text-dim)",
          cursor: "pointer", fontSize: 13, lineHeight: 1,
        }}>✕</button>
      </div>

      {tick.drifts.length === 0 ? (
        <div style={{ padding: 12, fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
          No sentiment drift — agents are in equilibrium.
        </div>
      ) : (
        tick.drifts.map((d, i) => (
          <div key={i} style={{
            padding: "8px 12px", borderTop: i > 0 ? "1px solid var(--border)" : "none",
            fontSize: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{d.entityName}</span>
              <span style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase" }}>{d.emotion}</span>
            </div>
            <div style={{ color: "var(--text-dim)", marginTop: 2, fontSize: 11 }}>
              {d.before.sentiment} {Math.round(d.before.confidence * 100)}%
              {" → "}
              <span style={{ color: d.after.sentiment === "positive" ? "#86efac" : d.after.sentiment === "negative" ? "#fca5a5" : "#94a3b8" }}>
                {d.after.sentiment} {Math.round(d.after.confidence * 100)}%
              </span>
            </div>
            {valenceBar(d.after.valence)}
            <div style={{ color: "var(--text-faint)", fontSize: 10, marginTop: 3 }}>
              via {d.influencedBy.join(", ")}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
