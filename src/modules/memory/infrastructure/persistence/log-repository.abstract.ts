import type { ExtractionResult } from "@/modules/memory/domain/schema/types/extraction.types";
import type { SentimentEdge, FactEdge, PreferenceEdge } from "@/modules/memory/domain/schema/types/edges.types";
import type { EntityNode } from "@/modules/memory/domain/schema/types/nodes.types";
import type { HistoryResponseDto } from "@/modules/memory/dtos/history.dto";

export interface ILogRepository {
  getHistory(userId: string): Promise<HistoryResponseDto>;
  recordExtraction(userId: string, conversationTurn: string, result: ExtractionResult, now: string): Promise<void>;
  recordSentiments(userId: string, sentiments: SentimentEdge[], resolved: EntityNode[], now: string): Promise<void>;
  recordFacts(userId: string, facts: FactEdge[], resolved: EntityNode[], now: string): Promise<void>;
  recordPreferences(userId: string, preferences: PreferenceEdge[], resolved: EntityNode[], now: string): Promise<void>;
}
