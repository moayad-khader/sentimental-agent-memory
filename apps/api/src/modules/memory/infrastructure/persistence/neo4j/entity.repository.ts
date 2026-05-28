import { randomUUID } from "crypto";
import type { Transaction } from "neo4j-driver";
import { similarity } from "@/common/utils/similarity";
import { Neo4jClient } from "@/database/neo4j/client";
import { DecayEngine } from "@/modules/memory/domain/decay";
import { HebbianEngine } from "@/modules/memory/domain/hebbian";
import type { IEntityRepository } from "@/modules/memory/infrastructure/persistence/entity-repository.abstract";
import type { ExtractedEntity } from "@/modules/memory/domain/schema/types/extraction.types";
import type { UserNode, EntityNode, EpisodeNode } from "@/modules/memory/domain/schema/types/nodes.types";
import type { FactEdge, PreferenceEdge, SentimentEdge } from "@/modules/memory/domain/schema/types/edges.types";
import { FUZZY_MATCH_THRESHOLD } from "@/config/constants";

export class EntityRepository implements IEntityRepository {
  constructor(
    private neo4j: Neo4jClient,
    private decay: DecayEngine,
    private hebbian: HebbianEngine
  ) {}

  // ── entity resolution ────────────────────────────────────────────

  private async loadExisting(): Promise<EntityNode[]> {
    const session = this.neo4j.getSession();
    try {
      const result = await session.run("MATCH (e:Entity) RETURN e");
      return result.records.map((r) => {
        const node = r.get("e").properties;
        return { id: node.id, name: node.name, type: node.type, aliases: node.aliases ?? [] };
      });
    } finally {
      await session.close();
    }
  }

  async resolve(extracted: ExtractedEntity[]): Promise<EntityNode[]> {
    const existing = await this.loadExisting();
    const resolved: EntityNode[] = [];

    for (const candidate of extracted) {
      let matched: EntityNode | undefined;

      for (const known of [...existing, ...resolved]) {
        const nameSim = similarity(candidate.name, known.name);
        const aliasSim = known.aliases.reduce(
          (best, alias) => Math.max(best, similarity(candidate.name, alias)),
          0
        );
        if (Math.max(nameSim, aliasSim) >= FUZZY_MATCH_THRESHOLD) {
          matched = known;
          break;
        }
      }

      if (matched) {
        resolved.push({
          ...matched,
          aliases: Array.from(
            new Set([
              ...matched.aliases,
              ...candidate.aliases,
              candidate.name !== matched.name ? candidate.name : "",
            ])
          ).filter(Boolean),
        });
      } else {
        resolved.push({ id: randomUUID(), name: candidate.name, type: candidate.type, aliases: candidate.aliases });
      }
    }

    return resolved;
  }

  // ── graph writes ─────────────────────────────────────────────────

  async upsertUser(user: UserNode): Promise<void> {
    const session = this.neo4j.getSession();
    try {
      await session.run(`MERGE (u:User { id: $id }) SET u.name = $name`, { id: user.id, name: user.name });
    } finally {
      await session.close();
    }
  }

  async upsertEntities(entities: EntityNode[]): Promise<void> {
    const session = this.neo4j.getSession();
    try {
      for (const entity of entities) {
        await session.run(
          `MERGE (e:Entity { id: $id }) SET e.name = $name, e.type = $type, e.aliases = $aliases`,
          { id: entity.id, name: entity.name, type: entity.type, aliases: entity.aliases }
        );
      }
    } finally {
      await session.close();
    }
  }

  async upsertFacts(facts: FactEdge[]): Promise<void> {
    const session = this.neo4j.getSession();
    try {
      for (const fact of facts) {
        await session.run(
          `MATCH (s { id: $subjectId }), (o { id: $objectId })
           MERGE (s)-[r:FACT { relation: $relation }]->(o)
           SET r.confidence = $confidence, r.observedAt = $observedAt`,
          { subjectId: fact.subjectId, objectId: fact.objectId, relation: fact.relation, confidence: fact.confidence, observedAt: fact.observedAt }
        );
      }
    } finally {
      await session.close();
    }
  }

  async upsertPreferences(preferences: PreferenceEdge[]): Promise<void> {
    const session = this.neo4j.getSession();
    try {
      for (const pref of preferences) {
        await session.run(
          `MATCH (s { id: $subjectId }), (o { id: $objectId })
           MERGE (s)-[r:PREFERS { polarity: $polarity }]->(o)
           SET r.reason = $reason, r.confidence = $confidence, r.observedAt = $observedAt`,
          { subjectId: pref.subjectId, objectId: pref.objectId, polarity: pref.polarity, reason: pref.reason, confidence: pref.confidence, observedAt: pref.observedAt }
        );
      }
    } finally {
      await session.close();
    }
  }

  async upsertSentiments(sentiments: SentimentEdge[], now: string): Promise<void> {
    const session = this.neo4j.getSession();
    try {
      for (const incoming of sentiments) {
        const tx = session.beginTransaction();
        try {
          const existing = await this.getExistingSentiment(incoming.subjectId, incoming.objectId, incoming.emotion, tx);
          const final = existing
            ? this.decay.computeUpdated(existing, incoming, now)
            : this.decay.computeNew(incoming);

          await tx.run(
            `MATCH (s { id: $subjectId }), (o { id: $objectId })
             MERGE (s)-[r:SENTIMENT { emotion: $emotion }]->(o)
             SET r.sentiment = $sentiment, r.reason = $reason,
                 r.confidence = $confidence, r.observedAt = $observedAt,
                 r.halfLifeDays = $halfLifeDays, r.decayPolicy = $decayPolicy, r.archived = $archived`,
            {
              subjectId: final.subjectId, objectId: final.objectId,
              sentiment: final.sentiment, emotion: final.emotion, reason: final.reason,
              confidence: final.confidence, observedAt: final.observedAt,
              halfLifeDays: final.halfLifeDays, decayPolicy: final.decayPolicy, archived: final.archived,
            }
          );
          await tx.commit();
        } catch (e) {
          await tx.rollback();
          throw e;
        }
      }
    } finally {
      await session.close();
    }
  }

  async upsertEpisode(episode: EpisodeNode, entityIds: string[]): Promise<void> {
    const session = this.neo4j.getSession();
    const tx = session.beginTransaction();
    try {
      await tx.run(
        `MERGE (ep:Episode { id: $id })
         SET ep.userId = $userId, ep.timestamp = $timestamp, ep.source = $source`,
        { id: episode.id, userId: episode.userId, timestamp: episode.timestamp, source: episode.source }
      );
      if (entityIds.length > 0) {
        await tx.run(
          `MATCH (ep:Episode { id: $episodeId })
           UNWIND $entityIds AS entityId
           MATCH (e:Entity { id: entityId })
           MERGE (ep)-[:CONTAINS]->(e)`,
          { episodeId: episode.id, entityIds }
        );
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      await session.close();
    }
  }

  async upsertCoOccurrences(entityIds: string[], now: string): Promise<void> {
    if (entityIds.length < 2) return;
    const pairs = this.hebbian.pairs(entityIds);
    const session = this.neo4j.getSession();
    try {
      await session.run(
        `UNWIND $pairs AS pair
         MATCH (a:Entity { id: pair[0] }), (b:Entity { id: pair[1] })
         MERGE (a)-[r:CO_OCCURS]->(b)
         ON CREATE SET r.weight = $delta, r.observedCount = 1, r.lastSeen = $now
         ON MATCH SET r.weight = CASE WHEN r.weight + $delta > 1.0 THEN 1.0 ELSE r.weight + $delta END,
                      r.observedCount = r.observedCount + 1, r.lastSeen = $now`,
        { pairs, delta: this.hebbian.delta, now }
      );
    } finally {
      await session.close();
    }
  }

  // ── private helpers ───────────────────────────────────────────────

  private async getExistingSentiment(
    subjectId: string,
    objectId: string,
    emotion: string,
    tx: Transaction
  ): Promise<SentimentEdge | null> {
    const result = await tx.run(
      `MATCH (s { id: $subjectId })-[r:SENTIMENT { emotion: $emotion }]->(o { id: $objectId }) RETURN r`,
      { subjectId, objectId, emotion }
    );
    if (result.records.length === 0) return null;
    const r = result.records[0].get("r").properties;
    return {
      subjectId, objectId,
      sentiment: r.sentiment, emotion: r.emotion, reason: r.reason,
      confidence: r.confidence, observedAt: r.observedAt,
      halfLifeDays: r.halfLifeDays ?? 30,
      decayPolicy: r.decayPolicy ?? "exponential",
      archived: r.archived ?? false,
    };
  }
}
