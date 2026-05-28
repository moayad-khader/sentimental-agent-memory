import type { ExtractionResult } from "@/modules/memory/domain/schema/types/extraction.types";
import type { HistoryResponseDto } from "@/modules/memory/dtos/history.dto";

export interface ILogRepository {
  getHistory(userId: string): Promise<HistoryResponseDto>;
  recordExtraction(userId: string, conversationTurn: string, result: ExtractionResult, timestamp: string): Promise<void>;
}
