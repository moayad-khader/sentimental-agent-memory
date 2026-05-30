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

export async function flushAll(): Promise<void> {
  const res = await fetch(`${BASE}/flush`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
}

export async function archiveSentiment(userId: string, entityId: string, emotion: string): Promise<void> {
  const res = await fetch(`${BASE}/memory/${encodeURIComponent(userId)}/sentiment/${encodeURIComponent(entityId)}/${encodeURIComponent(emotion)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
}

export async function deleteFact(userId: string, entityId: string, relation: string): Promise<void> {
  const res = await fetch(`${BASE}/memory/${encodeURIComponent(userId)}/fact/${encodeURIComponent(entityId)}/${encodeURIComponent(relation)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
}

export async function deletePreference(userId: string, entityId: string): Promise<void> {
  const res = await fetch(`${BASE}/memory/${encodeURIComponent(userId)}/preference/${encodeURIComponent(entityId)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
}
