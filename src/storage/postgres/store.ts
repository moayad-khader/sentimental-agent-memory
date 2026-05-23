import pg from "pg";
import { randomUUID } from "crypto";
import { requireEnvString } from "@/lib/env.js";
import { SCHEMA_SQL } from "@/storage/postgres/schema.js";
import type { ExtractionResult } from "@/schema/types/extraction.types.js";
import type { SentimentEdge, FactEdge, PreferenceEdge } from "@/schema/types/edges.types.js";
import type { EntityNode } from "@/schema/types/nodes.types.js";

const { Pool } = pg;

type Param = string | number | boolean | null;

export class PostgresStore {
  private static instance: PostgresStore | null = null;
  private pool: pg.Pool;

  private constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  static getInstance(): PostgresStore {
    if (!PostgresStore.instance) {
      PostgresStore.instance = new PostgresStore(requireEnvString("DATABASE_URL"));
    }
    return PostgresStore.instance;
  }

  async init(): Promise<void> {
    const statements = SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean);
    for (const sql of statements) {
      await this.pool.query(sql);
    }
  }

  private async run(sql: string, params: Param[]): Promise<void> {
    await this.pool.query(sql, params);
  }

  private async all(sql: string, params: Param[]): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async getHistory(userId: string) {
    const [extractions, sentiments, facts, preferences] = await Promise.all([
      this.all(`SELECT * FROM extraction_log WHERE user_id = $1 ORDER BY extracted_at DESC`, [userId]),
      this.all(`SELECT * FROM sentiment_log WHERE user_id = $1 ORDER BY recorded_at DESC`, [userId]),
      this.all(`SELECT * FROM fact_log WHERE user_id = $1 ORDER BY recorded_at DESC`, [userId]),
      this.all(`SELECT * FROM preference_log WHERE user_id = $1 ORDER BY recorded_at DESC`, [userId]),
    ]);
    return { extractions, sentiments, facts, preferences };
  }

  async recordExtraction(
    userId: string,
    conversationTurn: string,
    result: ExtractionResult,
    now: string
  ): Promise<void> {
    await this.run(
      `INSERT INTO extraction_log VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        userId,
        conversationTurn,
        now,
        result.entities.length,
        result.facts.length,
        result.preferences.length,
        result.sentiments.length,
        JSON.stringify(result),
      ]
    );
  }

  async recordSentiments(
    userId: string,
    sentiments: SentimentEdge[],
    resolved: EntityNode[],
    now: string
  ): Promise<void> {
    for (const s of sentiments) {
      const entityName = resolved.find((e) => e.id === s.objectId)?.name ?? s.objectId;
      await this.run(
        `INSERT INTO sentiment_log VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          randomUUID(),
          userId,
          s.objectId,
          entityName,
          s.sentiment,
          s.emotion,
          s.reason,
          s.confidence,
          s.observedAt,
          s.archived,
          now,
        ]
      );
    }
  }

  async recordFacts(
    userId: string,
    facts: FactEdge[],
    resolved: EntityNode[],
    now: string
  ): Promise<void> {
    for (const f of facts) {
      const entityName = resolved.find((e) => e.id === f.objectId)?.name ?? f.objectId;
      await this.run(
        `INSERT INTO fact_log VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), userId, f.objectId, entityName, f.relation, f.confidence, f.observedAt, now]
      );
    }
  }

  async recordPreferences(
    userId: string,
    preferences: PreferenceEdge[],
    resolved: EntityNode[],
    now: string
  ): Promise<void> {
    for (const p of preferences) {
      const entityName = resolved.find((e) => e.id === p.objectId)?.name ?? p.objectId;
      await this.run(
        `INSERT INTO preference_log VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          randomUUID(),
          userId,
          p.objectId,
          entityName,
          p.polarity,
          p.reason,
          p.confidence,
          p.observedAt,
          now,
        ]
      );
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    PostgresStore.instance = null;
  }
}
