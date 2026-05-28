import type { Neo4jClient } from "@/database/neo4j/client";
import type { AgentState, AgentSentiment, NetworkEdge } from "../domain/agent";

export interface SentimentUpdate {
  objectId: string;
  emotion: string;
  sentiment: string;
  confidence: number;
}

export class SimulationRepository {
  constructor(private neo4j: Neo4jClient) {}

  async getAgentStates(userId: string): Promise<Map<string, AgentState>> {
    const session = this.neo4j.getSession();
    try {
      const result = await session.run(
        `MATCH (u:User {id: $userId})-[s:SENTIMENT]->(e:Entity)
         WHERE NOT s.archived
         RETURN e.id AS entityId, e.name AS entityName,
                s.emotion AS emotion, s.sentiment AS sentiment, s.confidence AS confidence`,
        { userId }
      );

      const agents = new Map<string, AgentState>();
      for (const r of result.records) {
        const entityId = r.get("entityId") as string;
        const entityName = r.get("entityName") as string;
        const emotion = r.get("emotion") as string;
        const sentiment = r.get("sentiment") as AgentSentiment["sentiment"];
        const confidence = r.get("confidence") as number;
        const valence = sentiment === "positive" ? confidence : sentiment === "negative" ? -confidence : 0;

        if (!agents.has(entityId)) {
          agents.set(entityId, { entityId, entityName, sentiments: new Map() });
        }
        agents.get(entityId)!.sentiments.set(emotion, { emotion, sentiment, confidence, valence });
      }

      return agents;
    } finally {
      await session.close();
    }
  }

  async getCoOccurrences(entityIds: string[], minWeight = 0.1): Promise<NetworkEdge[]> {
    if (entityIds.length < 2) return [];
    const session = this.neo4j.getSession();
    try {
      const result = await session.run(
        `MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity)
         WHERE a.id IN $entityIds AND b.id IN $entityIds AND r.weight >= $minWeight
         RETURN a.id AS entityAId, b.id AS entityBId, r.weight AS weight`,
        { entityIds, minWeight }
      );
      return result.records.map((r) => ({
        entityAId: r.get("entityAId") as string,
        entityBId: r.get("entityBId") as string,
        weight: r.get("weight") as number,
      }));
    } finally {
      await session.close();
    }
  }

  async applySentimentUpdates(userId: string, updates: SentimentUpdate[]): Promise<void> {
    if (updates.length === 0) return;
    const session = this.neo4j.getSession();
    try {
      await session.run(
        `UNWIND $updates AS u
         MATCH (user:User {id: $userId})-[r:SENTIMENT {emotion: u.emotion}]->(e:Entity {id: u.objectId})
         SET r.confidence = u.confidence, r.sentiment = u.sentiment`,
        { userId, updates }
      );
    } finally {
      await session.close();
    }
  }
}
