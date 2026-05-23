import { DEFAULT_HALF_LIFE_DAYS } from "@/config/constants";
import type { ExtractionResult } from "@/modules/memory/domain/schema/types/extraction.types";
import type { EntityNode } from "@/modules/memory/domain/schema/types/nodes.types";
import type { FactEdge, PreferenceEdge, SentimentEdge } from "@/modules/memory/domain/schema/types/edges.types";
import type { MemoryExtractor } from "@/modules/memory/extraction/extractor";
import type { IEntityRepository } from "@/modules/memory/infrastructure/persistence/entity-repository.abstract";
import type { IMemoryRepository } from "@/modules/memory/infrastructure/persistence/memory-repository.abstract";
import type { ILogRepository } from "@/modules/memory/infrastructure/persistence/log-repository.abstract";
import type { IngestRequest } from "@/modules/memory/dtos/ingest.dto";
import type { MemoryResponseDto } from "@/modules/memory/dtos/memory.dto";
import type { HistoryResponseDto } from "@/modules/memory/dtos/history.dto";

export class MemoryService {
  constructor(
    private readonly extractor: MemoryExtractor,
    private readonly entityRepository: IEntityRepository,
    private readonly memoryRepository: IMemoryRepository,
    private readonly logRepository: ILogRepository
  ) {}

  async ingest(options: IngestRequest): Promise<ExtractionResult> {
    const { userId, userName, conversationTurn } = options;
    const now = new Date().toISOString().split("T")[0];

    await this.entityRepository.upsertUser({ id: userId, name: userName });

    const extraction = await this.extractor.extract(conversationTurn);
    const resolved = await this.entityRepository.resolve(extraction.entities);

    await this.entityRepository.upsertEntities(resolved);

    const { facts, preferences, sentiments } = this.buildEdges(extraction, resolved, userId, now);

    await Promise.all([
      this.entityRepository.upsertFacts(facts),
      this.entityRepository.upsertPreferences(preferences),
      this.entityRepository.upsertSentiments(sentiments, now),
      this.logRepository.recordExtraction(userId, conversationTurn, extraction, now),
      this.logRepository.recordFacts(userId, facts, resolved, now),
      this.logRepository.recordPreferences(userId, preferences, resolved, now),
      this.logRepository.recordSentiments(userId, sentiments, resolved, now),
    ]);

    return extraction;
  }

  async getMemory(userId: string): Promise<MemoryResponseDto> {
    return this.memoryRepository.getMemory(userId);
  }

  async getHistory(userId: string): Promise<HistoryResponseDto> {
    return this.logRepository.getHistory(userId);
  }

  private resolvedNameToId(name: string, resolved: EntityNode[]): string | undefined {
    return resolved.find(
      (e) =>
        e.name.toLowerCase() === name.toLowerCase() ||
        e.aliases.some((a) => a.toLowerCase() === name.toLowerCase())
    )?.id;
  }

  private buildEdges(
    extraction: ExtractionResult,
    resolved: EntityNode[],
    userId: string,
    now: string
  ): { facts: FactEdge[]; preferences: PreferenceEdge[]; sentiments: SentimentEdge[] } {
    const facts: FactEdge[] = extraction.facts.flatMap((f) => {
      const subjectId = f.subjectName.toLowerCase() === "user" ? userId : this.resolvedNameToId(f.subjectName, resolved);
      const objectId = this.resolvedNameToId(f.objectName, resolved);
      if (!subjectId || !objectId) return [];
      return [{ subjectId, objectId, relation: f.relation, confidence: f.confidence, observedAt: now }];
    });

    const preferences: PreferenceEdge[] = extraction.preferences.flatMap((p) => {
      const subjectId = p.subjectName.toLowerCase() === "user" ? userId : this.resolvedNameToId(p.subjectName, resolved);
      const objectId = this.resolvedNameToId(p.objectName, resolved);
      if (!subjectId || !objectId) return [];
      return [{ subjectId, objectId, polarity: p.polarity, reason: p.reason, confidence: p.confidence, observedAt: now }];
    });

    const sentiments: SentimentEdge[] = extraction.sentiments.flatMap((s) => {
      const subjectId = s.subjectName.toLowerCase() === "user" ? userId : this.resolvedNameToId(s.subjectName, resolved);
      const objectId = this.resolvedNameToId(s.targetName, resolved);
      if (!subjectId || !objectId) return [];
      return [{
        subjectId, objectId,
        sentiment: s.sentiment, emotion: s.emotion, reason: s.reason,
        confidence: s.confidence, observedAt: now,
        halfLifeDays: DEFAULT_HALF_LIFE_DAYS,
        decayPolicy: "exponential" as const,
        archived: false,
      }];
    });

    return { facts, preferences, sentiments };
  }
}
