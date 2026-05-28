import type { AgentState, NetworkEdge, SentimentDrift, TickResult } from "./agent";

export interface PropagationConfig {
  /** How strongly neighbors pull a sentiment per tick. Default 0.02 (2%). */
  influenceRate: number;
  /** Min CO_OCCURS weight for an edge to carry influence. Default 0.2. */
  minEdgeWeight: number;
  /** Minimum absolute valence change to record as a drift. Default 0.001. */
  minDriftThreshold: number;
}

const DEFAULTS: PropagationConfig = {
  influenceRate: 0.02,
  minEdgeWeight: 0.2,
  minDriftThreshold: 0.001,
};

function fromValence(v: number): { sentiment: "positive" | "negative" | "neutral"; confidence: number } {
  const confidence = Math.min(1, Math.max(0, Math.abs(v)));
  const sentiment = v > 0.05 ? "positive" : v < -0.05 ? "negative" : "neutral";
  return { sentiment, confidence };
}

export function runTick(
  userId: string,
  agents: Map<string, AgentState>,
  edges: NetworkEdge[],
  config: Partial<PropagationConfig> = {}
): TickResult {
  const cfg = { ...DEFAULTS, ...config };
  const drifts: SentimentDrift[] = [];
  const timestamp = new Date().toISOString();

  // Build undirected adjacency list from CO_OCCURS edges
  const adjacency = new Map<string, Array<{ entityId: string; weight: number }>>();
  for (const edge of edges) {
    if (edge.weight < cfg.minEdgeWeight) continue;
    for (const [a, b] of [[edge.entityAId, edge.entityBId], [edge.entityBId, edge.entityAId]] as [string, string][]) {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a)!.push({ entityId: b, weight: edge.weight });
    }
  }

  for (const [entityId, agent] of agents) {
    const neighbors = adjacency.get(entityId) ?? [];
    if (neighbors.length === 0) continue;

    for (const [emotion, current] of agent.sentiments) {
      // Collect neighbor valences for this emotion
      const influences: { valence: number; weight: number; name: string }[] = [];

      for (const { entityId: nId, weight } of neighbors) {
        const neighbor = agents.get(nId);
        if (!neighbor) continue;
        const ns = neighbor.sentiments.get(emotion);
        if (!ns) continue;
        influences.push({ valence: ns.valence, weight, name: neighbor.entityName });
      }

      if (influences.length === 0) continue;

      const totalWeight = influences.reduce((s, n) => s + n.weight, 0);
      const weightedAvg = influences.reduce((s, n) => s + n.valence * n.weight, 0) / totalWeight;

      const newValence = current.valence + cfg.influenceRate * (weightedAvg - current.valence);
      if (Math.abs(newValence - current.valence) < cfg.minDriftThreshold) continue;

      const { sentiment: newSentiment, confidence: newConfidence } = fromValence(newValence);

      // Mutate in place so later agents in the same tick see updated values
      agent.sentiments.set(emotion, {
        ...current,
        valence: newValence,
        sentiment: newSentiment,
        confidence: newConfidence,
      });

      drifts.push({
        entityId,
        entityName: agent.entityName,
        emotion,
        before: { sentiment: current.sentiment, confidence: current.confidence },
        after: { sentiment: newSentiment, confidence: newConfidence, valence: newValence },
        influencedBy: influences.map((n) => n.name),
      });
    }
  }

  return { userId, timestamp, totalAgents: agents.size, drifts };
}
