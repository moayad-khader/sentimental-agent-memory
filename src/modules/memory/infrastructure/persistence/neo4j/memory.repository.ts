import type { Neo4jClient } from "@/database/neo4j/client";
import type { QueryResult } from "neo4j-driver";
import type { IMemoryRepository } from "@/modules/memory/infrastructure/persistence/memory-repository.abstract";
import type { MemoryResponseDto } from "@/modules/memory/dtos/memory.dto";

export class MemoryRepository implements IMemoryRepository {
  constructor(private neo4j: Neo4jClient) {}

  async getMemory(userId: string): Promise<MemoryResponseDto> {
    const [sentimentRes, factRes, preferenceRes, episodeRes, associationRes] = await Promise.all([
      this.run(
        `MATCH (u:User {id: $userId})-[r:SENTIMENT]->(e:Entity)
         WHERE NOT r.archived
         RETURN e.id AS entityId, e.name AS entityName, e.type AS entityType,
                r.sentiment AS sentiment, r.emotion AS emotion, r.reason AS reason,
                r.confidence AS confidence, r.observedAt AS observedAt`,
        { userId }
      ),
      this.run(
        `MATCH (u:User {id: $userId})-[r:FACT]->(e:Entity)
         RETURN e.id AS entityId, e.name AS entityName,
                r.relation AS relation, r.confidence AS confidence, r.observedAt AS observedAt`,
        { userId }
      ),
      this.run(
        `MATCH (u:User {id: $userId})-[r:PREFERS]->(e:Entity)
         RETURN e.id AS entityId, e.name AS entityName,
                r.polarity AS polarity, r.reason AS reason,
                r.confidence AS confidence, r.observedAt AS observedAt`,
        { userId }
      ),
      this.run(
        `MATCH (ep:Episode {userId: $userId})-[:CONTAINS]->(e:Entity)
         RETURN ep.id AS episodeId, ep.timestamp AS timestamp, ep.source AS source,
                collect({id: e.id, name: e.name, type: e.type}) AS entities
         ORDER BY ep.timestamp DESC`,
        { userId }
      ),
      this.run(
        `MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity)
         WHERE r.weight > 0.2
         AND EXISTS { MATCH (:User {id: $userId})-[:SENTIMENT|FACT|PREFERS]->(a) }
         RETURN a.id AS entityAId, a.name AS entityAName,
                b.id AS entityBId, b.name AS entityBName,
                r.weight AS weight, r.observedCount AS observedCount, r.lastSeen AS lastSeen
         ORDER BY r.weight DESC`,
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
      episodes: episodeRes.records.map((r) => ({
        episodeId: r.get("episodeId"), timestamp: r.get("timestamp"), source: r.get("source"),
        entities: r.get("entities"),
      })),
      associations: associationRes.records.map((r) => ({
        entityAId: r.get("entityAId"), entityAName: r.get("entityAName"),
        entityBId: r.get("entityBId"), entityBName: r.get("entityBName"),
        weight: r.get("weight"), observedCount: r.get("observedCount"), lastSeen: r.get("lastSeen"),
      })),
    };
  }

  private async run(cypher: string, params: Record<string, unknown>): Promise<QueryResult> {
    const session = this.neo4j.getSession();
    try {
      return await session.run(cypher, params);
    } finally {
      await session.close();
    }
  }
}
