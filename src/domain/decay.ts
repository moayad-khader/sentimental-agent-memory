import type { SentimentEdge, DecayPolicy } from "@/schema/types/edges.types.js";
import { ARCHIVE_THRESHOLD, REINFORCEMENT_DELTA } from "@/lib/constants.js";

export class DecayEngine {
  private archiveThreshold = ARCHIVE_THRESHOLD;
  private reinforcementDelta = REINFORCEMENT_DELTA;

  private daysBetween(isoA: string, isoB: string): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.abs(new Date(isoB).getTime() - new Date(isoA).getTime()) / msPerDay;
  }

  private applyDecay(confidence: number, policy: DecayPolicy, days: number, halfLifeDays: number): number {
    if (policy === "none") return confidence;
    if (policy === "exponential") return confidence * Math.pow(0.5, days / halfLifeDays);
    if (policy === "linear") return Math.max(0, confidence - (confidence / halfLifeDays) * days);
    return confidence;
  }

  computeNew(incoming: Omit<SentimentEdge, "archived">): SentimentEdge {
    return {
      ...incoming,
      archived: incoming.confidence < this.archiveThreshold,
    };
  }

  computeUpdated(existing: SentimentEdge, incoming: Omit<SentimentEdge, "archived">, now: string): SentimentEdge {
    const days = this.daysBetween(existing.observedAt, now);
    const decayed = this.applyDecay(existing.confidence, existing.decayPolicy, days, existing.halfLifeDays);

    const sameDirection = existing.sentiment === incoming.sentiment && existing.emotion === incoming.emotion;

    const updated = sameDirection
      ? Math.min(1.0, decayed + this.reinforcementDelta)
      : incoming.confidence;

    return {
      ...incoming,
      confidence: updated,
      observedAt: now,
      archived: updated < this.archiveThreshold,
    };
  }
}
