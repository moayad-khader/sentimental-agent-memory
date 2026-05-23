# Sentimental Memory Graph

Most AI agents remember facts. This project gives agents something more: memory of how the user *feels* about those facts, and the understanding that feelings change over time.

When a user says "I was frustrated with Vendor X because they kept delaying deliveries," a standard memory system stores a fact: *user worked with Vendor X*. This system stores the full emotional context as a graph relationship — the sentiment, the specific emotion, the reason, a confidence score, and a decay policy that reduces that confidence if the sentiment is never reinforced.

The result is a memory layer that knows not just what happened, but what it meant to the user at the time, and how likely it still holds true now.

---

## The Core Idea

Sentiment is modeled as a first-class graph relationship, not metadata. Every sentiment edge between a user and an entity carries:

- what kind of sentiment (positive, negative, neutral, mixed)
- the specific emotion (frustration, joy, trust, anger, etc.)
- the reason it was expressed, in hedged language
- a confidence score (0.0–1.0)
- when it was observed
- a decay policy so confidence degrades unless reinforced

This means an agent can look up "how does the user feel about Vendor X right now, accounting for how much time has passed" rather than just "did the user ever mention Vendor X."

---

## Memory Types

Three types of memory are extracted from each conversation turn and stored as graph relationships.

**Facts** — what happened between people, organizations, products, and events.
```
(User)-[:FACT { relation: "worked_with" }]->(Vendor X)
(User)-[:FACT { relation: "has_goal"    }]->(Vendor Management Improvement)
```

**Preferences** — what the user likes, dislikes, prefers, or avoids.
```
(User)-[:PREFERS { polarity: "prefers", reason: "past vendor delays" }]->(Proactive Communication)
```

**Sentiments** — how the user feels about an entity, with decay.
```
(User)-[:SENTIMENT {
  sentiment:    "negative",
  emotion:      "frustration",
  reason:       "repeated delivery delays",
  confidence:   0.87,
  observedAt:   "2026-05-21",
  halfLifeDays: 30,
  decayPolicy:  "exponential",
  archived:     false
}]->(Vendor X)
```

---

## Architecture

```
Conversation Turn
       │
       ▼
  Extractor          calls Gemini 2.0 Flash with a structured JSON schema,
                     returns entities, facts, preferences, and sentiments
       │
       ▼
  Entity Resolver    compares extracted entity names against what already
                     exists in Neo4j using Levenshtein similarity (≥ 0.85
                     threshold). Matches reuse the existing node and merge
                     aliases. New entities get a UUID.
       │
       ▼
  Graph Store        writes everything to Neo4j using MERGE so re-ingesting
                     the same turn is safe. For sentiment edges, reads the
                     existing edge first and applies decay before writing.
       │
       ▼
  Decay Engine       runs at write time, not on a schedule. Decays the
                     stored confidence based on time elapsed, then applies
                     a reinforcement boost if the same sentiment is
                     re-expressed. Edges below 0.15 are archived.
       │
       ▼
  Neo4j              stores the final graph
```

---

## Confidence Decay

Sentiment edges are not permanent. Confidence decays over time according to the chosen policy and is updated whenever a new observation for the same user–entity pair arrives.

**Exponential decay** (default):
```
confidence(t) = confidence₀ × 0.5 ^ (days_elapsed / half_life_days)
```
With the default half-life of 30 days, a sentiment at 0.87 confidence drops to ~0.44 after 30 days, ~0.22 after 60 days, and so on.

**Linear decay**:
```
confidence(t) = max(0, confidence₀ − (confidence₀ / half_life_days) × days_elapsed)
```

**No decay**: confidence stays fixed regardless of time.

### Reinforcement

If the user expresses the same sentiment and emotion again, the decayed confidence receives a +0.15 boost (capped at 1.0). This models the idea that hearing the same feeling twice is stronger evidence than hearing it once.

If the sentiment *direction changes* (e.g., the user now feels positive about something they previously felt negative about), the confidence is replaced by the incoming score rather than being reinforced.

### Archival

Edges with confidence below 0.15 are marked `archived: true` rather than deleted. The history is preserved — the system knows the sentiment existed and faded — but archived edges signal that the feeling is no longer reliable.

---

## Graph Schema in Neo4j

**Node labels:**
```
(:User   { id: string, name: string })
(:Entity { id: string, name: string, type: string, aliases: string[] })
```

Entity types: `Person`, `Organization`, `Product`, `Event`, `Concept`.

**Relationship types:**
```
(:User)-[:FACT     { relation, confidence, observedAt }]->(:Entity)
(:User)-[:PREFERS  { polarity, reason, confidence, observedAt }]->(:Entity)
(:User)-[:SENTIMENT {
  sentiment, emotion, reason,
  confidence, observedAt,
  halfLifeDays, decayPolicy, archived
}]->(:Entity)
```

**Fact relations:** `mentioned`, `worked_with`, `caused`, `has_goal`, `reported_to`

**Preference polarities:** `prefers`, `avoids`, `likes`, `dislikes`

**Sentiment values:** `positive`, `negative`, `neutral`, `mixed`

**Emotions (Plutchik):** `frustration`, `joy`, `trust`, `anger`, `sadness`, `surprise`, `anticipation`, `fear`, `satisfaction`, `disappointment`

**Decay policies:** `exponential`, `linear`, `none`

Uniqueness constraints are created automatically on startup for `User.id` and `Entity.id`.

---

## Project Structure

```
src/
├── models/
│   ├── nodes.ts          UserNode, EntityNode — Zod schemas and TypeScript types
│   └── edges.ts          FactEdge, PreferenceEdge, SentimentEdge — Zod schemas and types
├── extraction/
│   ├── schemas.ts        Zod schemas for the structured JSON Gemini returns
│   └── extractor.ts      Gemini 2.0 Flash call with responseMimeType: application/json
├── graph/
│   ├── client.ts         Neo4j driver singleton, constraint initialisation
│   ├── resolver.ts       Fuzzy entity deduplication against existing graph nodes
│   └── store.ts          Cypher MERGE writes for users, entities, and all edge types
├── decay/
│   └── policy.ts         Decay computation and reinforcement logic
├── pipeline.ts           Orchestrates the full extract → resolve → store flow
└── tests/
    └── pipeline.test.ts  Unit tests for decay, reinforcement, archival, schema validation
```

---

## Setup

**Prerequisites**
- Node.js 18+
- pnpm
- A running Neo4j instance (local, Docker, or Neo4j Aura)
- A Gemini API key

**Install dependencies**
```bash
pnpm install
```

**Configure environment**
```bash
cp .env.example .env
```

Edit `.env`:
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here
GEMINI_API_KEY=your_gemini_api_key_here
```

**Run the demo**
```bash
pnpm dev
```

This runs `src/pipeline.ts`, which ingests the example conversation turn, extracts entities and sentiment via Gemini, resolves entities against the graph, applies decay, and writes everything to Neo4j.

**Run tests**
```bash
pnpm test
```

---

## Using the Pipeline in Your Own Code

```ts
import { ingest } from "./src/pipeline.js";
import { initConstraints, closeDriver } from "./src/graph/client.js";

await initConstraints();

await ingest({
  userId:           "user-abc-123",
  userName:         "Alice",
  conversationTurn: "I was frustrated with Vendor X because they kept delaying our deliveries.",
});

await closeDriver();
```

Call `ingest` once per conversation turn. The same `userId` must be passed each time to accumulate memory for the same user. The pipeline is idempotent — re-ingesting the same text is safe.

---

## Design Guardrails

**Hedged language only.** The Gemini system prompt enforces that sentiment reasons use phrases like "user expressed frustration" rather than "user hates." This keeps stored memory epistemically honest.

**Confidence is always explicit.** Nothing is stored without a confidence score. Gemini is instructed that 0.0 means a guess and 1.0 means an explicit statement.

**Feelings are not permanent.** Every sentiment edge decays by default. A memory from six months ago with no reinforcement carries very little weight.

**Archival over deletion.** Edges that fall below the confidence threshold are marked archived rather than removed. The trace of a past sentiment remains visible in the graph.

**Entity resolution is conservative.** The fuzzy match threshold is 0.85. Below that, an entity is treated as new rather than silently merged with an existing one.

---

## Tech Stack

| Concern | Library |
|---|---|
| Language | TypeScript (ESM) |
| Graph database | Neo4j via `neo4j-driver` |
| LLM | Gemini 2.0 Flash via `@google/genai` |
| Schema validation | Zod |
| Fuzzy matching | `fastest-levenshtein` |
| Runtime | `tsx` |
| Tests | Vitest |
