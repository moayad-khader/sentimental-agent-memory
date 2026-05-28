import type { ChatRequest, ChatResponse, MemoryResponse, TickResult } from "@smg/shared";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<ChatResponse>;
}

export async function getMemory(userId: string): Promise<MemoryResponse> {
  const res = await fetch(`${BASE}/memory/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<MemoryResponse>;
}

export async function runSimulation(userId: string): Promise<TickResult> {
  const res = await fetch(`${BASE}/simulate/${encodeURIComponent(userId)}`, { method: "POST" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<TickResult>;
}
