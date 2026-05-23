import type { ExtractionLog } from "@/modules/memory/infrastructure/persistence/relational/entities/extraction-log.entity";
import type { SentimentLog } from "@/modules/memory/infrastructure/persistence/relational/entities/sentiment-log.entity";
import type { FactLog } from "@/modules/memory/infrastructure/persistence/relational/entities/fact-log.entity";
import type { PreferenceLog } from "@/modules/memory/infrastructure/persistence/relational/entities/preference-log.entity";

export interface HistoryResponseDto {
  extractions: ExtractionLog[];
  sentiments: SentimentLog[];
  facts: FactLog[];
  preferences: PreferenceLog[];
}
