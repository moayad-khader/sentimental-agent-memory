import type { Neo4jClient } from "@/database/neo4j/client";
import type { IMemoryRepository } from "@/modules/memory/infrastructure/persistence/memory-repository.abstract";

export class MemoryRepository implements IMemoryRepository {
  constructor(private neo4j: Neo4jClient) {}

  async getMemory(userId: string) {
    const session = this.neo4j.getSession();
    try {
      const [sentimentRes, factRes, preferenceRes] = await Promise.all([
        session.run(
          `MATCH (u:User {id: $userId})-[r:SENTIMENT]->(e:Entity)
           WHERE NOT r.archived
           RETURN e.id AS entityId, e.name AS entityName, e.type AS entityType,
                  r.sentiment AS sentiment, r.emotion AS emotion, r.reason AS reason,
                  r.confidence AS confidence, r.observedAt AS observedAt`,
          { userId }
        ),
        session.run(
          `MATCH (u:User {id: $userId})-[r:FACT]->(e:Entity)
           RETURN e.id AS entityId, e.name AS entityName,
                  r.relation AS relation, r.confidence AS confidence, r.observedAt AS observedAt`,
          { userId }
        ),
        session.run(
          `MATCH (u:User {id: $userId})-[r:PREFERS]->(e:Entity)
           RETURN e.id AS entityId, e.name AS entityName,
                  r.polarity AS polarity, r.reason AS reason,
                  r.confidence AS confidence, r.observedAt AS observedAt`,
          { userId }
        ),
      ]);

      return {
        sentiments: sentimentRes.records.map((r) => ({
          entityId: r.get("entityId"), entityName: r.get("entityName"), entityType: r.get("entityType"),
          sentiment: r.get("sentiment"), emotion: r.get("emotion"), reason: r.get("reason"),
          confidence: r.get("confidence"), observedAt: r.get("observedAt"),
        })),
        facts: factRes.records.map((r) => ({
          entityId: r.get("entityId"), entityName: r.get("entityName"),
          relation: r.get("relation"), confidence: r.get("confidence"), observedAt: r.get("observedAt"),
        })),
        preferences: preferenceRes.records.map((r) => ({
          entityId: r.get("entityId"), entityName: r.get("entityName"),
          polarity: r.get("polarity"), reason: r.get("reason"),
          confidence: r.get("confidence"), observedAt: r.get("observedAt"),
        })),
      };
    } finally {
      await session.close();
    }
  }
}
