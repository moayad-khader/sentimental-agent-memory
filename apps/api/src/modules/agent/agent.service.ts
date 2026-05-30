import type { ILLMAdapter } from "@/llm/types";
import type { MemoryService } from "@/modules/memory/memory.service";
import type { MemoryResponseDto } from "@/modules/memory/dtos/memory.dto";
import type { ChatRequest, ChatResponse } from "@/modules/agent/dtos/chat.dto";

export class AgentService {
  constructor(
    private readonly llm: ILLMAdapter,
    private readonly memoryService: MemoryService
  ) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { userId, userName, message, useMemory = true } = request;

    let systemPrompt: string;
    if (useMemory) {
      const memory = await this.memoryService.getMemory(userId);
      systemPrompt = this.buildSystemPrompt(userName, memory);
    } else {
      systemPrompt = this.buildBaseSystemPrompt(userName);
    }

    const response = await this.llm.generate({ systemPrompt, userMessage: message });

    let extracted: ChatResponse["extracted"];
    if (useMemory) {
      const result = await this.memoryService.ingest({
        userId, userName, conversationTurn: message, source: "conversation",
      });
      extracted = {
        entities: result.entities.map(e => {
          const s = result.sentiments.find(s => s.targetName === e.name);
          return { name: e.name, type: e.type, sentiment: s?.sentiment, emotion: s?.emotion };
        }),
        factsCount: result.facts.length,
        preferencesCount: result.preferences.length,
      };
    }

    return { response, userId, useMemory, extracted };
  }

  private buildBaseSystemPrompt(userName: string): string {
    return `You are a helpful AI assistant chatting with ${userName}. Respond naturally and helpfully.`;
  }

  private buildSystemPrompt(userName: string, memory: MemoryResponseDto): string {
    const context = this.formatMemory(userName, memory);
    return `You are a personal AI assistant who genuinely knows and remembers ${userName}.

Respond naturally and warmly, drawing on what you know about them. Never say phrases like "according to my data" or "your memory shows" — just respond as someone who was there and remembers. Keep responses conversational and grounded.

${context}`;
  }

  private formatMemory(userName: string, memory: MemoryResponseDto): string {
    const sections: string[] = [`## What you know about ${userName}`];
    let hasContent = false;

    if (memory.sentiments.length > 0) {
      hasContent = true;
      sections.push("\n**Feelings & emotions** (how they feel about people and things):");
      const sorted = [...memory.sentiments].sort((a, b) => b.confidence - a.confidence);
      for (const s of sorted) {
        const pct = Math.round(s.confidence * 100);
        sections.push(`  • ${s.emotion} toward ${s.entityName} [${pct}%] — "${s.reason}"`);
      }
    }

    if (memory.facts.length > 0) {
      hasContent = true;
      sections.push("\n**Facts you know:**");
      for (const f of memory.facts) {
        sections.push(`  • ${f.entityName} ${f.relation} (${Math.round(f.confidence * 100)}%)`);
      }
    }

    if (memory.preferences.length > 0) {
      hasContent = true;
      sections.push("\n**Preferences:**");
      for (const p of memory.preferences) {
        const verb = p.polarity === "positive" ? "likes" : "dislikes";
        sections.push(`  • ${userName} ${verb} ${p.entityName} — ${p.reason}`);
      }
    }

    const recentEpisodes = memory.episodes.slice(0, 5);
    if (recentEpisodes.length > 0) {
      hasContent = true;
      sections.push("\n**Recent interactions** (most recent first):");
      for (const ep of recentEpisodes) {
        const date = ep.timestamp.split("T")[0];
        const entities = ep.entities.map((e) => e.name).join(", ");
        sections.push(`  • [${ep.source}] ${date}: ${entities}`);
      }
    }

    const strongLinks = memory.associations
      .filter((a) => a.weight > 0.2)
      .slice(0, 5);
    if (strongLinks.length > 0) {
      hasContent = true;
      sections.push("\n**People & things that come up together:**");
      for (const a of strongLinks) {
        sections.push(`  • ${a.entityAName} ↔ ${a.entityBName} (strength: ${Number(a.weight).toFixed(2)})`);
      }
    }

    if (!hasContent) {
      sections.push("\n_No memory yet — treat this as a first meeting and learn about them._");
    }

    return sections.join("\n");
  }
}
