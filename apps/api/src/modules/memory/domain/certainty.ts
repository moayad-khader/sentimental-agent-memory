const STRONG_CERTAINTY = /\b(always|never|definitely|absolutely|completely|totally|hate|love|amazing|terrible|horrible|incredible|worst|best|despise|furious|thrilled|devastated)\b/i;
const HEDGE           = /\b(think|feel like|seems?|appears?|kind of|sort of|maybe|might|could be|probably|i guess|perhaps|somewhat|a bit|slightly)\b/i;
const STRONG_HEDGE    = /\b(not sure|might be wrong|possibly|i'm not certain|unclear|hard to say|not entirely)\b/i;

export function applyCertainty(text: string, confidence: number): number {
  if (STRONG_HEDGE.test(text)) return Math.min(1, confidence * 0.60);
  if (HEDGE.test(text))        return Math.min(1, confidence * 0.75);
  if (STRONG_CERTAINTY.test(text)) return Math.min(1, confidence * 1.10);
  return confidence;
}
