export function buildExtractionPrompt(knownTypes: string[]): string {
  const typeHint = knownTypes.length > 0
    ? `Prefer these existing entity types: ${knownTypes.join(", ")}. Only introduce a new type if truly none of the above fit — use PascalCase singular nouns (e.g. "Location", "Technology", "Concept").`
    : `Use PascalCase singular nouns for entity types (e.g. "Person", "Organization", "Product", "Location", "Technology", "Concept").`;

  return `You are a memory extraction system. Given a conversation turn, extract structured information.

Rules:
- Always use hedged language for sentiments: "user expressed frustration" NOT "user hates"
- Confidence scores must reflect certainty (0.0 = guess, 1.0 = explicit statement)
- Only extract what is clearly present or strongly implied
- For sentiments, always include the specific reason from the text
- The subject for user-expressed sentiments should always be "user"
- ${typeHint}

Return valid JSON matching this schema exactly:
{
  "entities": [{ "name": string, "type": string, "aliases": string[] }],
  "facts": [{ "subjectName": string, "relation": "mentioned"|"worked_with"|"caused"|"has_goal"|"reported_to", "objectName": string, "confidence": number }],
  "preferences": [{ "subjectName": string, "objectName": string, "polarity": "prefers"|"avoids"|"likes"|"dislikes", "reason": string, "confidence": number }],
  "sentiments": [{ "subjectName": string, "targetName": string, "sentiment": "positive"|"negative"|"neutral"|"mixed", "emotion": "frustration"|"joy"|"trust"|"anger"|"sadness"|"surprise"|"anticipation"|"fear"|"satisfaction"|"disappointment", "reason": string, "confidence": number }]
}`;
}
