import { randomUUID } from "crypto";
import type { DataSource } from "typeorm";
import { ExtractionLog } from "@/modules/memory/infrastructure/persistence/relational/entities/extraction-log.entity";
import type { ILogRepository } from "@/modules/memory/infrastructure/persistence/log-repository.abstract";
import type { ExtractionResult } from "@/modules/memory/domain/schema/types/extraction.types";

export class LogRepository implements ILogRepository {
  constructor(private dataSource: DataSource) {}

  async getHistory(userId: string) {
    const extractions = await this.dataSource.getRepository(ExtractionLog).find({
      where: { extraction_log_user_id: userId },
      order: { extraction_log_occurred_at: "DESC" },
    });
    return { extractions };
  }

  async recordExtraction(
    userId: string,
    conversationTurn: string,
    result: ExtractionResult,
    timestamp: string
  ): Promise<void> {
    await this.dataSource.getRepository(ExtractionLog).insert({
      extraction_log_id: randomUUID(),
      extraction_log_user_id: userId,
      extraction_log_conversation: conversationTurn,
      extraction_log_occurred_at: timestamp,
      extraction_log_entities_count: result.entities.length,
      extraction_log_facts_count: result.facts.length,
      extraction_log_preferences_count: result.preferences.length,
      extraction_log_sentiments_count: result.sentiments.length,
      extraction_log_raw_json: result as unknown as object,
    });
  }
}
