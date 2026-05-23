import { Neo4jClient } from "@/storage/neo4j/client.js";
import { DecayEngine } from "@/domain/decay.js";
import type { UserNode, EntityNode } from "@/schema/types/nodes.types.js";
import type { FactEdge, PreferenceEdge, SentimentEdge } from "@/schema/types/edges.types.js";

export class GraphStore {
  constructor(
    private neo4j: Neo4jClient,
    private decay: DecayEngine
  ) {}

  async upsertUser(user: UserNode): Promise<void> {
    const session = this.neo4j.getSession();
    try {
      await session.run(
        `MERGE (u:User { id: $id }) SET u.name = $name`,
        { id: user.id, name: user.name }
      );
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
          {
            subjectId: fact.subjectId,
            objectId: fact.objectId,
            relation: fact.relation,
            confidence: fact.confidence,
            observedAt: fact.observedAt,
          }
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
          {
            subjectId: pref.subjectId,
            objectId: pref.objectId,
            polarity: pref.polarity,
            reason: pref.reason,
            confidence: pref.confidence,
            observedAt: pref.observedAt,
          }
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
           SET r.sentiment = $sentiment,
               r.emotion = $emotion,
               r.reason = $reason,
               r.confidence = $confidence,
               r.observedAt = $observedAt,
               r.halfLifeDays = $halfLifeDays,
               r.decayPolicy = $decayPolicy,
               r.archived = $archived`,
          {
            subjectId: final.subjectId,
            objectId: final.objectId,
            sentiment: final.sentiment,
            emotion: final.emotion,
            reason: final.reason,
            confidence: final.confidence,
            observedAt: final.observedAt,
            halfLifeDays: final.halfLifeDays,
            decayPolicy: final.decayPolicy,
            archived: final.archived,
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
      subjectId,
      objectId,
      sentiment: r.sentiment,
      emotion: r.emotion,
      reason: r.reason,
      confidence: r.confidence,
      observedAt: r.observedAt,
      halfLifeDays: r.halfLifeDays ?? 30,
      decayPolicy: r.decayPolicy ?? "exponential",
      archived: r.archived ?? false,
    };
  }
}
