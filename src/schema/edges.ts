import { z } from "zod";

export const FactRelationSchema = z.enum([
  "mentioned",
  "worked_with",
  "caused",
  "has_goal",
  "reported_to",
]);

export const PreferencePolaritySchema = z.enum([
  "prefers",
  "avoids",
  "likes",
  "dislikes",
]);

export const SentimentValueSchema = z.enum([
  "positive",
  "negative",
  "neutral",
  "mixed",
]);

export const EmotionSchema = z.enum([
  "frustration",
  "joy",
  "trust",
  "anger",
  "sadness",
  "surprise",
  "anticipation",
  "fear",
  "satisfaction",
  "disappointment",
]);

export const DecayPolicySchema = z.enum(["exponential", "linear", "none"]);

export const FactEdgeSchema = z.object({
  subjectId: z.string(),
  objectId: z.string(),
  relation: FactRelationSchema,
  confidence: z.number().min(0).max(1),
  observedAt: z.string(),
});

export const PreferenceEdgeSchema = z.object({
  subjectId: z.string(),
  objectId: z.string(),
  polarity: PreferencePolaritySchema,
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  observedAt: z.string(),
});

export const SentimentEdgeSchema = z.object({
  subjectId: z.string(),
  objectId: z.string(),
  sentiment: SentimentValueSchema,
  emotion: EmotionSchema,
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  observedAt: z.string(),
  halfLifeDays: z.number().default(30),
  decayPolicy: DecayPolicySchema.default("exponential"),
  archived: z.boolean().default(false),
});
