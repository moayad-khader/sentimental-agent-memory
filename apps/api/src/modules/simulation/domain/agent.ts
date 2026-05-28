export interface AgentSentiment {
  emotion: string;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
  /** Signed encoding: positive → +confidence, negative → -confidence, neutral → 0 */
  valence: number;
}

export interface AgentState {
  entityId: string;
  entityName: string;
  /** keyed by emotion */
  sentiments: Map<string, AgentSentiment>;
}

export interface NetworkEdge {
  entityAId: string;
  entityBId: string;
  weight: number;
}

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
