import { z } from "zod";

export const ExtractedEntitySchema = z.object({
  name: z.string(),
  type: z.enum(["Person", "Organization", "Product", "Event", "Concept"]),
  aliases: z.array(z.string()).default([]),
});

export const ExtractedFactSchema = z.object({
  subjectName: z.string(),
  relation: z.enum([
    "mentioned",
    "worked_with",
    "caused",
    "has_goal",
    "reported_to",
  ]),
  objectName: z.string(),
  confidence: z.number().min(0).max(1),
});

export const ExtractedPreferenceSchema = z.object({
  subjectName: z.string(),
  objectName: z.string(),
  polarity: z.enum(["prefers", "avoids", "likes", "dislikes"]),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});

export const ExtractedSentimentSchema = z.object({
  subjectName: z.string(),
  targetName: z.string(),
  sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
  emotion: z.enum([
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
  ]),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});

export const ExtractionResultSchema = z.object({
  entities: z.array(ExtractedEntitySchema),
  facts: z.array(ExtractedFactSchema),
  preferences: z.array(ExtractedPreferenceSchema),
  sentiments: z.array(ExtractedSentimentSchema),
});
