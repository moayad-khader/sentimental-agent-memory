"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2 } from "lucide-react";
import type { MemoryResponse, TickResult, ChatResponse } from "@smg/shared";
import { getMemory, sendChat, runSimulation, flushAll } from "@/lib/api";
import { MemoryPanel } from "./MemoryPanel";
import { SimulationPanel } from "./SimulationPanel";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "agent";
  text: string;
  extracted?: ChatResponse["extracted"];
}

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-emerald-400",
  negative: "bg-red-400",
  mixed:    "bg-amber-400",
  neutral:  "bg-stone-300",
};

export function ChatApp() {
  const [messages, setMessages]     = useState<Message[]>([
    { role: "agent", text: "Hey — I'll remember everything we talk about. What's on your mind?" },
  ]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [userId, setUserId]         = useState("mo");
  const [userName, setUserName]     = useState("Moayad");
  const [useMemory, setUseMemory]   = useState(true);
  const [memory, setMemory]         = useState<MemoryResponse | null>(null);
  const [online, setOnline]         = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [lastTick, setLastTick]     = useState<TickResult | null>(null);
  const [flushing, setFlushing]     = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const msgCountRef = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadMemory = useCallback(async () => {
    if (!userId) return;
    try { setMemory(await getMemory(userId)); setOnline(true); }
    catch { setOnline(false); }
  }, [userId]);

  useEffect(() => { loadMemory(); }, [loadMemory]);

  async function send() {
    const text = input.trim();
    if (!text || !userId || !userName || loading) return;
    setInput("");
    setMessages(p => [...p, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await sendChat({ userId, userName, message: text, useMemory });
      setMessages(p => [...p, { role: "agent", text: res.response, extracted: res.extracted }]);
      setOnline(true);
      if (useMemory) {
        await loadMemory();
        msgCountRef.current += 1;
        if (msgCountRef.current % 5 === 0) simulate();
      }
    } catch (e: unknown) {
      setMessages(p => [...p, { role: "agent", text: `Error: ${e instanceof Error ? e.message : "Unknown"}` }]);
      setOnline(false);
    } finally { setLoading(false); }
  }

  async function simulate() {
    if (!userId || simulating) return;
    setSimulating(true);
    try {
      const result = await runSimulation(userId);
      setLastTick(result);
      if (result.drifts.length > 0) await loadMemory();
    } catch (e: unknown) {
      setMessages(p => [...p, { role: "agent", text: `Simulation error: ${e instanceof Error ? e.message : "Unknown"}` }]);
    } finally { setSimulating(false); }
  }

  async function flush() {
    if (!confirm("Delete all memory data from both databases?")) return;
    setFlushing(true);
    try {
      await flushAll();
      setMemory(null);
      setLastTick(null);
      setMessages([{ role: "agent", text: "Cleared. Starting fresh." }]);
    } catch (e: unknown) {
      alert(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally { setFlushing(false); }
  }

  const initial = (userName[0] || "U").toUpperCase();

  return (
    <div className="flex flex-col h-screen" style={{ background: "#f8f7f4" }}>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center gap-0 px-4 bg-white border-b border-[#e4e0d8] shrink-0"
        style={{ height: 48 }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 pr-4 border-r border-[#e4e0d8]">
          <motion.div
            whileHover={{ scale: 1.12, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center shrink-0 cursor-default"
          >
            <span className="text-white font-bold" style={{ fontSize: 8, letterSpacing: "0.05em" }}>A</span>
          </motion.div>
          <span className="font-semibold text-[13px] text-zinc-800 tracking-tight">Affectum</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 px-4 border-r border-[#e4e0d8]">
          <motion.span
            animate={online ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className={cn("w-1.5 h-1.5 rounded-full shrink-0", online ? "bg-emerald-400" : "bg-red-400")}
          />
          <span className={cn("text-[11px]", online ? "text-emerald-600" : "text-red-500")}>
            {online ? "connected" : "offline"}
          </span>
        </div>

        {/* Memory toggle */}
        <div className="flex items-center gap-2.5 px-4 border-r border-[#e4e0d8]">
          <motion.button
            onClick={() => setUseMemory(v => !v)}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "relative rounded-full transition-colors duration-200 focus:outline-none",
              useMemory ? "bg-violet-600" : "bg-stone-200"
            )}
            style={{ width: 30, height: 17 }}
          >
            <motion.span
              animate={{ x: useMemory ? 13 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-[2px] left-[2px] w-[13px] h-[13px] bg-white rounded-full shadow-sm"
            />
          </motion.button>
          <span className={cn("text-[12px] font-medium select-none", useMemory ? "text-violet-700" : "text-stone-400")}>
            {useMemory ? "Memory on" : "Memory off"}
          </span>
        </div>

        <div className="flex-1" />

        {/* User fields */}
        <div className="flex items-center gap-2 px-4 border-l border-[#e4e0d8]">
          {[
            { value: userId,   setter: setUserId,   placeholder: "user id", w: 88 },
            { value: userName, setter: setUserName, placeholder: "name",    w: 96 },
          ].map(({ value, setter, placeholder, w }) => (
            <input
              key={placeholder}
              value={value}
              onChange={e => setter(e.target.value)}
              placeholder={placeholder}
              style={{ width: w }}
              className="bg-[#f8f7f4] border border-[#e4e0d8] rounded-md px-2.5 py-1 text-[12px] text-zinc-700 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400 transition-colors"
            />
          ))}
        </div>

        <motion.button
          onClick={flush}
          disabled={flushing}
          whileHover={{ color: "#ef4444" }}
          whileTap={{ scale: 0.92 }}
          className="flex items-center gap-1 ml-2 text-[11px] text-stone-400 disabled:opacity-40 transition-colors px-2 py-1"
        >
          <Trash2 className="w-3 h-3" />
          {flushing ? "clearing…" : "clear"}
        </motion.button>
      </motion.header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Chat */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-6">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="flex flex-col gap-1.5"
                  >
                    <div className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                      {/* Avatar */}
                      <motion.div
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.06, type: "spring", stiffness: 380, damping: 18 }}
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5",
                          m.role === "user"
                            ? "bg-violet-600 text-white"
                            : "bg-white text-stone-400 border border-[#e4e0d8]"
                        )}
                      >
                        {m.role === "user" ? initial : "·"}
                      </motion.div>

                      {/* Bubble */}
                      <div
                        className={cn(
                          "max-w-[72%] px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
                          m.role === "user"
                            ? "bg-violet-600 text-white rounded-2xl rounded-tr-sm"
                            : "bg-white text-zinc-800 rounded-2xl rounded-tl-sm border border-[#e4e0d8]"
                        )}
                        style={m.role === "agent" ? { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" } : undefined}
                      >
                        {m.text}
                      </div>
                    </div>

                    {m.role === "agent" && m.extracted && m.extracted.entities.length > 0 && (
                      <ExtractionPreview extracted={m.extracted} />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading dots */}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
                    className="flex gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-white border border-[#e4e0d8] flex items-center justify-center text-[11px] text-stone-400 mt-0.5">·</div>
                    <div
                      className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-[#e4e0d8] flex items-center gap-1.5"
                      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                    >
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-stone-300 block"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-[#e4e0d8] bg-white px-4 py-3">
            <div className="max-w-2xl mx-auto flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Write something…  (Enter to send)"
                rows={1}
                disabled={loading}
                className="flex-1 bg-[#f8f7f4] border border-[#e4e0d8] rounded-xl px-3.5 py-2.5 text-[13px] text-zinc-800 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400 transition-all max-h-28 disabled:opacity-40"
              />
              <motion.button
                onClick={send}
                disabled={loading || !input.trim()}
                whileHover={!loading && !!input.trim() ? { scale: 1.08 } : {}}
                whileTap={!loading && !!input.trim() ? { scale: 0.88 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  loading || !input.trim()
                    ? "bg-stone-100 text-stone-300 cursor-not-allowed"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Side panels */}
        <AnimatePresence>
          {useMemory && (
            <>
              <motion.div
                key="memory"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 60, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="shrink-0"
              >
                <MemoryPanel memory={memory} onRefresh={loadMemory} userId={userId} />
              </motion.div>
              <motion.div
                key="simulation"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 60, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.06 }}
                className="shrink-0"
              >
                <SimulationPanel lastTick={lastTick} simulating={simulating} onRunTick={simulate} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Extraction preview ────────────────────────────────────────────────────────

function ExtractionPreview({ extracted }: { extracted: NonNullable<ChatResponse["extracted"]> }) {
  const [open, setOpen] = useState(false);
  const total = extracted.entities.length + extracted.factsCount + extracted.preferencesCount;

  return (
    <div className="ml-10 flex flex-col gap-1">
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.1 }}
        className="flex items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-600 transition-colors w-fit"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className="text-stone-300 inline-block"
        >▸</motion.span>
        learned {total} item{total !== 1 ? "s" : ""}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pl-3 pt-1">
              {extracted.entities.map((e, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 380, damping: 20 }}
                  className="flex items-center gap-1 text-[10px] bg-white border border-[#e4e0d8] rounded-full px-2 py-0.5 text-stone-600"
                >
                  {e.sentiment && (
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SENTIMENT_DOT[e.sentiment] ?? "bg-stone-300")} />
                  )}
                  {e.name}
                  {e.emotion && <span className="text-stone-400">· {e.emotion}</span>}
                </motion.span>
              ))}
              {extracted.factsCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: extracted.entities.length * 0.05 + 0.02 }}
                  className="text-[10px] bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5 text-violet-600"
                >
                  {extracted.factsCount} fact{extracted.factsCount !== 1 ? "s" : ""}
                </motion.span>
              )}
              {extracted.preferencesCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (extracted.entities.length + 1) * 0.05 + 0.02 }}
                  className="text-[10px] bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5 text-violet-600"
                >
                  {extracted.preferencesCount} pref{extracted.preferencesCount !== 1 ? "s" : ""}
                </motion.span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
