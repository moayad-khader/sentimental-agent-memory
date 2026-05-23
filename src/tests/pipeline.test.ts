import { describe, it, expect } from "vitest";
import { DecayEngine } from "@/modules/memory/domain/decay";
import type { SentimentEdge } from "@/modules/memory/domain/schema/types/edges.types";

const engine = new DecayEngine();

const baseSentiment: SentimentEdge = {
  subjectId: "user-1",
  objectId: "entity-1",
  sentiment: "negative",
  emotion: "frustration",
  reason: "repeated delays",
  confidence: 0.87,
  observedAt: "2026-04-01",
  halfLifeDays: 30,
  decayPolicy: "exponential",
  archived: false,
};

describe("DecayEngine.computeNew", () => {
  it("marks high confidence as not archived", () => {
    const result = engine.computeNew(baseSentiment);
    expect(result.archived).toBe(false);
    expect(result.confidence).toBe(0.87);
  });

  it("archives edge below threshold", () => {
    const result = engine.computeNew({ ...baseSentiment, confidence: 0.1 });
    expect(result.archived).toBe(true);
  });
});

describe("DecayEngine.computeUpdated", () => {
  it("decays confidence over time", () => {
    const now = "2026-05-01";
    const result = engine.computeUpdated(baseSentiment, baseSentiment, now);
    expect(result.confidence).toBeLessThan(baseSentiment.confidence);
  });

  it("reinforces when same sentiment re-expressed", () => {
    const slightlyDecayed: SentimentEdge = { ...baseSentiment, confidence: 0.5, observedAt: "2026-04-15" };
    const incoming: SentimentEdge = { ...baseSentiment, confidence: 0.8 };
    const result = engine.computeUpdated(slightlyDecayed, incoming, "2026-04-16");
    expect(result.confidence).toBeGreaterThan(slightlyDecayed.confidence);
  });

  it("replaces confidence when sentiment direction changes", () => {
    const positive: SentimentEdge = { ...baseSentiment, sentiment: "positive", emotion: "satisfaction" };
    const result = engine.computeUpdated(baseSentiment, positive, "2026-05-01");
    expect(result.sentiment).toBe("positive");
    expect(result.confidence).toBe(positive.confidence);
  });

  it("archives when incoming confidence is below threshold after direction change", () => {
    const old: SentimentEdge = { ...baseSentiment, observedAt: "2025-01-01" };
    const incomingWeak: SentimentEdge = { ...baseSentiment, sentiment: "positive", emotion: "satisfaction", confidence: 0.1 };
    const result = engine.computeUpdated(old, incomingWeak, "2026-05-01");
    expect(result.archived).toBe(true);
  });
});

describe("ExtractionResultSchema", () => {
  it("parses valid extraction output", async () => {
    const { ExtractionResultSchema } = await import("@/modules/memory/domain/schema/extraction");
    const valid = {
      entities: [{ name: "Vendor X", type: "Organization", aliases: [] }],
      facts: [{ subjectName: "user", relation: "worked_with", objectName: "Vendor X", confidence: 0.9 }],
      preferences: [],
      sentiments: [{
        subjectName: "user",
        targetName: "Vendor X",
        sentiment: "negative",
        emotion: "frustration",
        reason: "repeated delays",
        confidence: 0.87,
      }],
    };
    expect(() => ExtractionResultSchema.parse(valid)).not.toThrow();
  });

  it("rejects unknown emotion", async () => {
    const { ExtractionResultSchema } = await import("@/modules/memory/domain/schema/extraction");
    const invalid = {
      entities: [],
      facts: [],
      preferences: [],
      sentiments: [{
        subjectName: "user",
        targetName: "X",
        sentiment: "negative",
        emotion: "hatred",
        reason: "test",
        confidence: 0.9,
      }],
    };
    expect(() => ExtractionResultSchema.parse(invalid)).toThrow();
  });
});
