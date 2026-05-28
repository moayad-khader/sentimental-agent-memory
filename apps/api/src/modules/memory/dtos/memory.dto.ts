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

export interface EpisodeRecordDto {
  episodeId: string;
  timestamp: string;
  source: string;
  entities: Array<{ id: string; name: string; type: string }>;
}

export interface AssociationRecordDto {
  entityAId: string;
  entityAName: string;
  entityBId: string;
  entityBName: string;
  weight: number;
  observedCount: number;
  lastSeen: string;
}

export interface MemoryResponseDto {
  sentiments: SentimentRecordDto[];
  facts: FactRecordDto[];
  preferences: PreferenceRecordDto[];
  episodes: EpisodeRecordDto[];
  associations: AssociationRecordDto[];
}
