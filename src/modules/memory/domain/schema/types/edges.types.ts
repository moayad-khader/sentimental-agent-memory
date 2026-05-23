import type { z } from "zod";
import type {
  FactRelationSchema,
  PreferencePolaritySchema,
  SentimentValueSchema,
  EmotionSchema,
  DecayPolicySchema,
  FactEdgeSchema,
  PreferenceEdgeSchema,
  SentimentEdgeSchema,
} from "@/modules/memory/domain/schema/edges";

export type FactRelation = z.infer<typeof FactRelationSchema>;
export type PreferencePolarity = z.infer<typeof PreferencePolaritySchema>;
export type SentimentValue = z.infer<typeof SentimentValueSchema>;
export type Emotion = z.infer<typeof EmotionSchema>;
export type DecayPolicy = z.infer<typeof DecayPolicySchema>;
export type FactEdge = z.infer<typeof FactEdgeSchema>;
export type PreferenceEdge = z.infer<typeof PreferenceEdgeSchema>;
export type SentimentEdge = z.infer<typeof SentimentEdgeSchema>;
