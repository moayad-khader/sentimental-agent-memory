import type { ExtractionLog } from "@/modules/memory/infrastructure/persistence/relational/entities/extraction-log.entity";

export interface HistoryResponseDto {
  extractions: ExtractionLog[];
}
