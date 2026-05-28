// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  userId: string;
  userName: string;
  message: string;
  useMemory: boolean;
}

export interface ChatResponse {
  response: string;
  userId: string;
  useMemory: boolean;
}

// ── Simulation ────────────────────────────────────────────────────────────────

export interface SentimentDrift {
  entityId: string;
  entityName: string;
  emotion: string;
  before: { sentiment: string; confidence: number };
  after: { sentiment: string; confidence: number; valence: number };
  influencedBy: string[];
}

export interface TickResult {
  userId: string;
  timestamp: string;
  totalAgents: number;
  drifts: SentimentDrift[];
}

// ── Memory ────────────────────────────────────────────────────────────────────

export interface SentimentRecord {
  entityId: string;
  entityName: string;
  entityType: string;
  sentiment: string;
  emotion: string;
  reason: string;
  confidence: number;
  observedAt: string;
}

export interface FactRecord {
  entityId: string;
  entityName: string;
  relation: string;
  confidence: number;
  observedAt: string;
}

export interface PreferenceRecord {
  entityId: string;
  entityName: string;
  polarity: string;
  reason: string;
  confidence: number;
  observedAt: string;
}

export interface EpisodeRecord {
  episodeId: string;
  timestamp: string;
  source: string;
  entities: Array<{ id: string; name: string; type: string }>;
}

export interface AssociationRecord {
  entityAId: string;
  entityAName: string;
  entityBId: string;
  entityBName: string;
  weight: number;
  observedCount: number;
  lastSeen: string;
}

export interface MemoryResponse {
  sentiments: SentimentRecord[];
  facts: FactRecord[];
  preferences: PreferenceRecord[];
  episodes: EpisodeRecord[];
  associations: AssociationRecord[];
}
