import { createHash } from "crypto";
import type { DataSource } from "typeorm";
import { HebbianEngine } from "@/modules/memory/domain/hebbian";
import type { IStoreRepository } from "@/modules/memory/infrastructure/persistence/store-repository.abstract";
import type { UserNode, EntityNode, EpisodeNode } from "@/modules/memory/domain/schema/types/nodes.types";
import type { FactEdge, PreferenceEdge, SentimentEdge } from "@/modules/memory/domain/schema/types/edges.types";
import { SmgUser } from "../entities/smg-user.entity";
import { SmgMemoryEntity } from "../entities/smg-entity.entity";
import { SmgSentiment } from "../entities/smg-sentiment.entity";
import { SmgFact } from "../entities/smg-fact.entity";
import { SmgPreference } from "../entities/smg-preference.entity";
import { SmgEpisode } from "../entities/smg-episode.entity";
import { SmgEpisodeEntity } from "../entities/smg-episode-entity.entity";
import { SmgCoOccurrence } from "../entities/smg-co-occurrence.entity";

function deterministicId(...parts: string[]): string {
  const h = createHash("sha256").update(parts.join("|")).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export class StoreRepository implements IStoreRepository {
  constructor(
    private readonly ds: DataSource,
    private readonly hebbian: HebbianEngine
  ) {}

  async upsertUser(user: UserNode): Promise<void> {
    await this.ds.getRepository(SmgUser).upsert(
      { user_id: user.id, name: user.name, updated_at: new Date().toISOString() },
      ["user_id"]
    );
  }

  async upsertEntities(entities: EntityNode[]): Promise<void> {
    if (entities.length === 0) return;
    const now = new Date().toISOString();
    await this.ds.getRepository(SmgMemoryEntity).upsert(
      entities.map(e => ({ entity_id: e.id, name: e.name, type: e.type, aliases: e.aliases, updated_at: now })),
      ["entity_id"]
    );
  }

  async upsertSentiments(sentiments: SentimentEdge[]): Promise<void> {
    if (sentiments.length === 0) return;
    const now = new Date().toISOString();
    await this.ds.getRepository(SmgSentiment).upsert(
      sentiments.map(s => ({
        sentiment_id: deterministicId(s.subjectId, s.objectId, s.emotion),
        subject_id: s.subjectId,
        entity_id: s.objectId,
        sentiment: s.sentiment,
        emotion: s.emotion,
        reason: s.reason,
        confidence: s.confidence,
        half_life_days: s.halfLifeDays,
        decay_policy: s.decayPolicy,
        archived: s.archived,
        observed_at: s.observedAt,
        updated_at: now,
      })),
      ["subject_id", "entity_id", "emotion"]
    );
  }

  async upsertFacts(facts: FactEdge[]): Promise<void> {
    if (facts.length === 0) return;
    const now = new Date().toISOString();
    await this.ds.getRepository(SmgFact).upsert(
      facts.map(f => ({
        fact_id: deterministicId(f.subjectId, f.objectId, f.relation),
        subject_id: f.subjectId,
        object_entity_id: f.objectId,
        relation: f.relation,
        confidence: f.confidence,
        observed_at: f.observedAt,
        updated_at: now,
      })),
      ["subject_id", "object_entity_id", "relation"]
    );
  }

  async upsertPreferences(preferences: PreferenceEdge[]): Promise<void> {
    if (preferences.length === 0) return;
    const now = new Date().toISOString();
    await this.ds.getRepository(SmgPreference).upsert(
      preferences.map(p => ({
        preference_id: deterministicId(p.subjectId, p.objectId, p.polarity),
        subject_id: p.subjectId,
        entity_id: p.objectId,
        polarity: p.polarity,
        reason: p.reason,
        confidence: p.confidence,
        observed_at: p.observedAt,
        updated_at: now,
      })),
      ["subject_id", "entity_id", "polarity"]
    );
  }

  async upsertEpisode(episode: EpisodeNode, entityIds: string[]): Promise<void> {
    await this.ds.getRepository(SmgEpisode).upsert(
      { episode_id: episode.id, user_id: episode.userId, source: episode.source, occurred_at: episode.timestamp },
      ["episode_id"]
    );
    if (entityIds.length === 0) return;
    await this.ds
      .createQueryBuilder()
      .insert()
      .into(SmgEpisodeEntity)
      .values(entityIds.map(entityId => ({ episode_id: episode.id, entity_id: entityId })))
      .orIgnore()
      .execute();
  }

  async upsertCoOccurrences(entityIds: string[], now: string): Promise<void> {
    if (entityIds.length < 2) return;
    const pairs = this.hebbian.pairs(entityIds);
    await this.ds.transaction(async (manager) => {
      const repo = manager.getRepository(SmgCoOccurrence);
      for (const [a, b] of pairs) {
        const existing = await repo.findOne({ where: { entity_a_id: a, entity_b_id: b } });
        if (existing) {
          existing.weight = Math.min(1.0, existing.weight + this.hebbian.delta);
          existing.observed_count += 1;
          existing.last_seen = now;
          await repo.save(existing);
        } else {
          await repo.save({ entity_a_id: a, entity_b_id: b, weight: this.hebbian.delta, observed_count: 1, last_seen: now });
        }
      }
    });
  }
}
