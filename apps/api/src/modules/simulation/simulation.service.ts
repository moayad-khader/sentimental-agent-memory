import type { SimulationRepository } from "./infrastructure/simulation.repository";
import { runTick } from "./domain/propagation";
import type { PropagationConfig } from "./domain/propagation";
import type { TickResult } from "./domain/agent";

export class SimulationService {
  constructor(private repo: SimulationRepository) {}

  async tick(userId: string, config?: Partial<PropagationConfig>): Promise<TickResult> {
    const agents = await this.repo.getAgentStates(userId);

    if (agents.size === 0) {
      return { userId, timestamp: new Date().toISOString(), totalAgents: 0, drifts: [] };
    }

    const entityIds = Array.from(agents.keys());
    const edges = await this.repo.getCoOccurrences(entityIds);

    const result = runTick(userId, agents, edges, config);

    await this.repo.applySentimentUpdates(
      userId,
      result.drifts.map((d) => ({
        objectId: d.entityId,
        emotion: d.emotion,
        sentiment: d.after.sentiment,
        confidence: d.after.confidence,
      }))
    );

    return result;
  }
}
