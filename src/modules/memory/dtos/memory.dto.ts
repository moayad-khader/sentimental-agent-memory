export interface SentimentRecordDto {
  entityId: string;
  entityName: string;
  entityType: string;
  sentiment: string;
  emotion: string;
  reason: string;
  confidence: number;
  observedAt: string;
}

export interface FactRecordDto {
  entityId: string;
  entityName: string;
  relation: string;
  confidence: number;
  observedAt: string;
}

export interface PreferenceRecordDto {
  entityId: string;
  entityName: string;
  polarity: string;
  reason: string;
  confidence: number;
  observedAt: string;
}

export interface MemoryResponseDto {
  sentiments: SentimentRecordDto[];
  facts: FactRecordDto[];
  preferences: PreferenceRecordDto[];
}
