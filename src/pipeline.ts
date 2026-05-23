import { DEFAULT_HALF_LIFE_DAYS } from "@/lib/constants.js";
import type { ExtractionResult } from "@/schema/types/extraction.types.js";
import type { EntityNode } from "@/schema/types/nodes.types.js";
import type { FactEdge, PreferenceEdge, SentimentEdge } from "@/schema/types/edges.types.js";
import type { IngestOptions } from "@/pipeline.types.js";
import type { MemoryExtractor } from "@/extraction/extractor.js";
import type { EntityResolver } from "@/storage/neo4j/resolver.js";
import type { GraphStore } from "@/storage/neo4j/store.js";
import type { PostgresStore } from "@/storage/postgres/store.js";

export class MemoryPipeline {
  constructor(
    private extractor: MemoryExtractor,
    private resolver: EntityResolver,
    private store: GraphStore,
    private history: PostgresStore
  ) {}

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
        subjectId,
        objectId,
        sentiment: s.sentiment,
        emotion: s.emotion,
        reason: s.reason,
        confidence: s.confidence,
        observedAt: now,
        halfLifeDays: DEFAULT_HALF_LIFE_DAYS,
        decayPolicy: "exponential" as const,
        archived: false,
      }];
    });

    return { facts, preferences, sentiments };
  }

  async ingest(options: IngestOptions): Promise<ExtractionResult> {
    const { userId, userName, conversationTurn } = options;
    const now = new Date().toISOString().split("T")[0];

    await this.store.upsertUser({ id: userId, name: userName });

    const extraction = await this.extractor.extract(conversationTurn);
    const resolved = await this.resolver.resolve(extraction.entities);

    await this.store.upsertEntities(resolved);

    const { facts, preferences, sentiments } = this.buildEdges(extraction, resolved, userId, now);

    await Promise.all([
      this.store.upsertFacts(facts),
      this.store.upsertPreferences(preferences),
      this.store.upsertSentiments(sentiments, now),
      this.history.recordExtraction(userId, conversationTurn, extraction, now),
      this.history.recordFacts(userId, facts, resolved, now),
      this.history.recordPreferences(userId, preferences, resolved, now),
      this.history.recordSentiments(userId, sentiments, resolved, now),
    ]);

    return extraction;
  }
}
