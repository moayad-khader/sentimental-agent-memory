import type { Emotion } from "./schema/types/edges.types";

const SALIENCE: Record<Emotion, number> = {
  anger:          1.20,
  fear:           1.20,
  frustration:    1.10,
  sadness:        1.05,
  disappointment: 1.05,
  surprise:       1.00,
  joy:            0.95,
  trust:          0.90,
  satisfaction:   0.90,
  anticipation:   0.85,
};

export function applySalience(emotion: Emotion, confidence: number): number {
  return Math.min(1.0, confidence * (SALIENCE[emotion] ?? 1.0));
}
