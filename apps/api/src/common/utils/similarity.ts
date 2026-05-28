import { distance } from "fastest-levenshtein";

export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}
