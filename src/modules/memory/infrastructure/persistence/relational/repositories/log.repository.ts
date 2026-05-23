import { randomUUID } from "crypto";
import type { DataSource } from "typeorm";
import { ExtractionLog } from "@/modules/memory/infrastructure/persistence/relational/entities/extraction-log.entity";
import { SentimentLog } from "@/modules/memory/infrastructure/persistence/relational/entities/sentiment-log.entity";
import { FactLog } from "@/modules/memory/infrastructure/persistence/relational/entities/fact-log.entity";
import { PreferenceLog } from "@/modules/memory/infrastructure/persistence/relational/entities/preference-log.entity";
import type { ILogRepository } from "@/modules/memory/infrastructure/persistence/log-repository.abstract";
import type { ExtractionResult } from "@/modules/memory/domain/schema/types/extraction.types";
import type { SentimentEdge, FactEdge, PreferenceEdge } from "@/modules/memory/domain/schema/types/edges.types";
import type { EntityNode } from "@/modules/memory/domain/schema/types/nodes.types";

export class LogRepository implements ILogRepository {
  constructor(private dataSource: DataSource) {}

  async getHistory(userId: string) {
    const [extractions, sentiments, facts, preferences] = await Promise.all([
      this.dataSource.getRepository(ExtractionLog).find({
        where: { extraction_log_user_id: userId },
        order: { extraction_log_extracted_at: "DESC" },
      }),
      this.dataSource.getRepository(SentimentLog).find({
        where: { sentiment_log_user_id: userId },
        order: { sentiment_log_recorded_at: "DESC" },
      }),
      this.dataSource.getRepository(FactLog).find({
        where: { fact_log_user_id: userId },
        order: { fact_log_recorded_at: "DESC" },
      }),
      this.dataSource.getRepository(PreferenceLog).find({
        where: { preference_log_user_id: userId },
        order: { preference_log_recorded_at: "DESC" },
      }),
    ]);
    return { extractions, sentiments, facts, preferences };
  }

  async recordExtraction(
    userId: string,
    conversationTurn: string,
    result: ExtractionResult,
    now: string
  ): Promise<void> {
    await this.dataSource.getRepository(ExtractionLog).insert({
      extraction_log_id: randomUUID(),
      extraction_log_user_id: userId,
      extraction_log_conversation: conversationTurn,
      extraction_log_extracted_at: now,
      extraction_log_entities_count: result.entities.length,
      extraction_log_facts_count: result.facts.length,
      extraction_log_preferences_count: result.preferences.length,
      extraction_log_sentiments_count: result.sentiments.length,
      extraction_log_raw_json: result as unknown as object,
    });
  }

  async recordSentiments(
    userId: string,
    sentiments: SentimentEdge[],
    resolved: EntityNode[],
    now: string
  ): Promise<void> {
    if (sentiments.length === 0) return;
    await this.dataSource.getRepository(SentimentLog).insert(
      sentiments.map((s) => ({
        sentiment_log_id: randomUUID(),
        sentiment_log_user_id: userId,
        sentiment_log_entity_id: s.objectId,
        sentiment_log_entity_name: resolved.find((e) => e.id === s.objectId)?.name ?? s.objectId,
        sentiment_log_sentiment: s.sentiment,
        sentiment_log_emotion: s.emotion,
        sentiment_log_reason: s.reason,
        sentiment_log_confidence: s.confidence,
        sentiment_log_observed_at: s.observedAt,
        sentiment_log_archived: s.archived,
        sentiment_log_recorded_at: now,
      }))
    );
  }

  async recordFacts(
    userId: string,
    facts: FactEdge[],
    resolved: EntityNode[],
    now: string
  ): Promise<void> {
    if (facts.length === 0) return;
    await this.dataSource.getRepository(FactLog).insert(
      facts.map((f) => ({
        fact_log_id: randomUUID(),
        fact_log_user_id: userId,
        fact_log_entity_id: f.objectId,
        fact_log_entity_name: resolved.find((e) => e.id === f.objectId)?.name ?? f.objectId,
        fact_log_relation: f.relation,
        fact_log_confidence: f.confidence,
        fact_log_observed_at: f.observedAt,
        fact_log_recorded_at: now,
      }))
    );
  }

  async recordPreferences(
    userId: string,
    preferences: PreferenceEdge[],
    resolved: EntityNode[],
    now: string
  ): Promise<void> {
    if (preferences.length === 0) return;
    await this.dataSource.getRepository(PreferenceLog).insert(
      preferences.map((p) => ({
        preference_log_id: randomUUID(),
        preference_log_user_id: userId,
        preference_log_entity_id: p.objectId,
        preference_log_entity_name: resolved.find((e) => e.id === p.objectId)?.name ?? p.objectId,
        preference_log_polarity: p.polarity,
        preference_log_reason: p.reason,
        preference_log_confidence: p.confidence,
        preference_log_observed_at: p.observedAt,
        preference_log_recorded_at: now,
      }))
    );
  }
}
