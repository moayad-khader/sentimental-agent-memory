import { randomUUID } from "crypto";
import type { DataSource } from "typeorm";
import { HebbianEngine } from "@/modules/memory/domain/hebbian";
import type { IStoreRepository } from "@/modules/memory/infrastructure/persistence/store-repository.abstract";
import type { UserNode, EntityNode, EpisodeNode } from "@/modules/memory/domain/schema/types/nodes.types";
import type { FactEdge, PreferenceEdge, SentimentEdge } from "@/modules/memory/domain/schema/types/edges.types";

export class StoreRepository implements IStoreRepository {
  constructor(
    private readonly ds: DataSource,
    private readonly hebbian: HebbianEngine
  ) {}

  async upsertUser(user: UserNode): Promise<void> {
    await this.ds.query(
      `INSERT INTO smg_users (user_id, name, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at`,
      [user.id, user.name, new Date().toISOString()]
    );
  }

  async upsertEntities(entities: EntityNode[]): Promise<void> {
    if (entities.length === 0) return;
    const now = new Date().toISOString();
    for (const e of entities) {
      await this.ds.query(
        `INSERT INTO smg_entities (entity_id, name, type, aliases, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (entity_id) DO UPDATE
         SET name = EXCLUDED.name, type = EXCLUDED.type, aliases = EXCLUDED.aliases, updated_at = EXCLUDED.updated_at`,
        [e.id, e.name, e.type, JSON.stringify(e.aliases), now]
      );
    }
  }

  async upsertSentiments(sentiments: SentimentEdge[]): Promise<void> {
    if (sentiments.length === 0) return;
    const now = new Date().toISOString();
    for (const s of sentiments) {
      await this.ds.query(
        `INSERT INTO smg_sentiments
           (sentiment_id, user_id, entity_id, sentiment, emotion, reason, confidence, half_life_days, decay_policy, archived, observed_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (user_id, entity_id, emotion) DO UPDATE
         SET sentiment = EXCLUDED.sentiment, reason = EXCLUDED.reason, confidence = EXCLUDED.confidence,
             half_life_days = EXCLUDED.half_life_days, decay_policy = EXCLUDED.decay_policy,
             archived = EXCLUDED.archived, observed_at = EXCLUDED.observed_at, updated_at = EXCLUDED.updated_at`,
        [randomUUID(), s.subjectId, s.objectId, s.sentiment, s.emotion, s.reason,
         s.confidence, s.halfLifeDays, s.decayPolicy, s.archived, s.observedAt, now]
      );
    }
  }

  async upsertFacts(facts: FactEdge[]): Promise<void> {
    if (facts.length === 0) return;
    const now = new Date().toISOString();
    for (const f of facts) {
      await this.ds.query(
        `INSERT INTO smg_facts (fact_id, subject_id, object_entity_id, relation, confidence, observed_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (subject_id, object_entity_id, relation) DO UPDATE
         SET confidence = EXCLUDED.confidence, observed_at = EXCLUDED.observed_at, updated_at = EXCLUDED.updated_at`,
        [randomUUID(), f.subjectId, f.objectId, f.relation, f.confidence, f.observedAt, now]
      );
    }
  }

  async upsertPreferences(preferences: PreferenceEdge[]): Promise<void> {
    if (preferences.length === 0) return;
    const now = new Date().toISOString();
    for (const p of preferences) {
      await this.ds.query(
        `INSERT INTO smg_preferences (preference_id, user_id, entity_id, polarity, reason, confidence, observed_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, entity_id, polarity) DO UPDATE
         SET reason = EXCLUDED.reason, confidence = EXCLUDED.confidence,
             observed_at = EXCLUDED.observed_at, updated_at = EXCLUDED.updated_at`,
        [randomUUID(), p.subjectId, p.objectId, p.polarity, p.reason, p.confidence, p.observedAt, now]
      );
    }
  }

  async upsertEpisode(episode: EpisodeNode, entityIds: string[]): Promise<void> {
    await this.ds.query(
      `INSERT INTO smg_episodes (episode_id, user_id, source, occurred_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (episode_id) DO NOTHING`,
      [episode.id, episode.userId, episode.source, episode.timestamp]
    );
    for (const entityId of entityIds) {
      await this.ds.query(
        `INSERT INTO smg_episode_entities (episode_id, entity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [episode.id, entityId]
      );
    }
  }

  async upsertCoOccurrences(entityIds: string[], now: string): Promise<void> {
    if (entityIds.length < 2) return;
    const pairs = this.hebbian.pairs(entityIds);
    for (const [a, b] of pairs) {
      await this.ds.query(
        `INSERT INTO smg_co_occurrences (entity_a_id, entity_b_id, weight, observed_count, last_seen)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (entity_a_id, entity_b_id) DO UPDATE
         SET weight = LEAST(1.0, smg_co_occurrences.weight + $3),
             observed_count = smg_co_occurrences.observed_count + 1,
             last_seen = $4`,
        [a, b, this.hebbian.delta, now]
      );
    }
  }
}
