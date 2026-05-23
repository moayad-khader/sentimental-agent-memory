import type { z } from "zod";
import type {
  ExtractedEntitySchema,
  ExtractedFactSchema,
  ExtractedPreferenceSchema,
  ExtractedSentimentSchema,
  ExtractionResultSchema,
} from "@/schema/extraction.js";

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;
export type ExtractedFact = z.infer<typeof ExtractedFactSchema>;
export type ExtractedPreference = z.infer<typeof ExtractedPreferenceSchema>;
export type ExtractedSentiment = z.infer<typeof ExtractedSentimentSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
