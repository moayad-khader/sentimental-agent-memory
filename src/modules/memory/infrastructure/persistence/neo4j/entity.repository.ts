import { distance } from "fastest-levenshtein";
import { randomUUID } from "crypto";
import { Neo4jClient } from "@/database/neo4j/client";
import { DecayEngine } from "@/modules/memory/domain/decay";
import type { IEntityRepository } from "@/modules/memory/infrastructure/persistence/entity-repository.abstract";
import type { ExtractedEntity } from "@/modules/memory/domain/schema/types/extraction.types";
import type { UserNode, EntityNode } from "@/modules/memory/domain/schema/types/nodes.types";
import type { FactEdge, PreferenceEdge, SentimentEdge } from "@/modules/memory/domain/schema/types/edges.types";
import { FUZZY_MATCH_THRESHOLD } from "@/config/constants";

export class EntityRepository implements IEntityRepository {
  constructor(
    private neo4j: Neo4jClient,
    private decay: DecayEngine
  ) {}

  // ── entity resolution ────────────────────────────────────────────

  private similarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - distance(a.toLowerCase(), b.toLowerCase()) / maxLen;
  }

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
        const nameSim = this.similarity(candidate.name, known.name);
        const aliasSim = known.aliases.reduce(
          (best, alias) => Math.max(best, this.similarity(candidate.name, alias)),
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
        const existing = await this.getExistingSentiment(incoming.subjectId, incoming.objectId, session);
        const final = existing
          ? this.decay.computeUpdated(existing, incoming, now)
          : this.decay.computeNew(incoming);

        await session.run(
          `MATCH (s { id: $subjectId }), (o { id: $objectId })
           MERGE (s)-[r:SENTIMENT]->(o)
           SET r.sentiment = $sentiment, r.emotion = $emotion, r.reason = $reason,
               r.confidence = $confidence, r.observedAt = $observedAt,
               r.halfLifeDays = $halfLifeDays, r.decayPolicy = $decayPolicy, r.archived = $archived`,
          {
            subjectId: final.subjectId, objectId: final.objectId,
            sentiment: final.sentiment, emotion: final.emotion, reason: final.reason,
            confidence: final.confidence, observedAt: final.observedAt,
            halfLifeDays: final.halfLifeDays, decayPolicy: final.decayPolicy, archived: final.archived,
          }
        );
      }
    } finally {
      await session.close();
    }
  }

  private async getExistingSentiment(
    subjectId: string,
    objectId: string,
    session: ReturnType<Neo4jClient["getSession"]>
  ): Promise<SentimentEdge | null> {
    const result = await session.run(
      `MATCH (s { id: $subjectId })-[r:SENTIMENT]->(o { id: $objectId }) RETURN r`,
      { subjectId, objectId }
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
