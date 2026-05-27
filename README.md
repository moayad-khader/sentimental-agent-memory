# Sentimental Memory Graph

Most AI agents remember facts. This project gives agents something more: memory of how the user *feels* about those facts, the understanding that feelings change over time, and the ability to form associations between things that appear together.

When a user says "I was frustrated with Vendor X because they kept delaying deliveries," a standard memory system stores a fact: *user worked with Vendor X*. This system stores the full emotional context as a graph relationship — the sentiment, the specific emotion, the reason, a confidence score, and a decay policy that reduces that confidence if the sentiment is never reinforced.

The result is a memory layer that knows not just what happened, but what it meant to the user at the time, how likely it still holds true now, and what other concepts were present in the same moment.

---

## The Core Idea

Four brain-like primitives work together:

**Decaying synaptic weights.** Sentiment confidence degrades over time via exponential or linear decay, just as neural connections weaken without reinforcement. Re-expressing the same emotion boosts confidence back up (Long-Term Potentiation). Edges that fall below the threshold are archived rather than deleted.

**Emotion-keyed edges.** Each `(user, entity, emotion)` triple gets its own sentiment edge. Fear and joy about the same thing coexist simultaneously — one does not overwrite the other.

**Emotional salience.** High-intensity emotions (anger, fear) are encoded at higher initial confidence than low-intensity ones (anticipation, satisfaction), mirroring how the amygdala boosts encoding strength for emotionally charged events.

**Hebbian co-activation.** Entities that appear together in the same conversation turn form a `CO_OCCURS` edge whose weight strengthens with each co-occurrence — neurons that fire together, wire together.

---

## Memory Types

Five types of memory are extracted and stored per conversation turn.

**Facts** — what happened between people, organizations, products, and events.
```
(User)-[:FACT { relation: "worked_with" }]->(Vendor X)
(User)-[:FACT { relation: "has_goal"    }]->(Vendor Management Improvement)
```

**Preferences** — what the user likes, dislikes, prefers, or avoids.
```
(User)-[:PREFERS { polarity: "prefers", reason: "past vendor delays" }]->(Proactive Communication)
```

**Sentiments** — how the user feels about an entity, per emotion, with decay.
```
(User)-[:SENTIMENT {
  emotion:      "frustration",
  sentiment:    "negative",
  reason:       "repeated delivery delays",
  confidence:   0.96,
  observedAt:   "2026-05-21",
  halfLifeDays: 30,
  decayPolicy:  "exponential",
  archived:     false
}]->(Vendor X)

(User)-[:SENTIMENT {
  emotion:      "anticipation",
  sentiment:    "positive",
  reason:       "new vendor shortlist in progress",
  confidence:   0.72,
  ...
}]->(Vendor X)
```
Both edges exist simultaneously. Frustration and anticipation toward the same entity are independent relationships.

**Episodes** — a record of each conversation turn as a node, linked to every entity mentioned in it.
```
(Episode { id, userId, timestamp, source: "standup" })-[:CONTAINS]->(Vendor X)
(Episode)-[:CONTAINS]->(Alice)
(Episode)-[:CONTAINS]->(Sprint Planning)
```
Episodes preserve the temporal narrative: which entities were present together, and when.

**Associations** — Hebbian co-activation links between entities.
```
(Vendor X)-[:CO_OCCURS { weight: 0.4, observedCount: 4, lastSeen: "2026-05-26" }]->(Delivery Delays)
```
Weight starts at `HEBBIAN_DELTA` on first co-occurrence and increments each time, capped at 1.0.

---

## Architecture

```
POST /ingest
       │
       ▼
  IngestHandler      validates request body (userId, userName, conversationTurn, source?)
       │
       ▼
  MemoryService      orchestrates the full pipeline
       │
       ├──▶ MemoryExtractor     calls Gemini 2.0 Flash with a structured JSON schema,
       │                        returns entities, facts, preferences, and sentiments
       │
       ├──▶ EntityRepository    resolves extracted entity names against Neo4j using
       │    (resolve)           Levenshtein similarity (≥ 0.85). Matches reuse the
       │                        existing node and merge aliases. New entities get a UUID.
       │
       ├──▶ EntityRepository    writes users, entities, facts, preferences, and
       │    (upsert*)           sentiments to Neo4j via MERGE. Sentiment edges are
       │                        keyed by (subject, object, emotion) so each emotion
       │                        maintains its own independent decay track.
       │
       ├──▶ DecayEngine         runs at write time. Decays stored confidence by time
       │                        elapsed, then applies reinforcement if the same emotion
       │                        is re-expressed. Edges below 0.15 are archived.
       │
       ├──▶ SalienceEngine      applied before writing: multiplies confidence by an
       │                        emotion-intensity factor (anger/fear → ×1.20,
       │                        anticipation → ×0.85). Capped at 1.0.
       │
       ├──▶ EntityRepository    creates an Episode node for the turn and CONTAINS
       │    (upsertEpisode)     edges to every resolved entity — a single batched
       │                        UNWIND query.
       │
       ├──▶ HebbianEngine       generates all entity pairs in the turn, then upserts
       │    (upsertCoOccurrences) CO_OCCURS edges via a single UNWIND query. Weight
       │                        increments by HEBBIAN_DELTA on each co-occurrence.
       │
       └──▶ LogRepository       writes a full audit trail to PostgreSQL — one row per
                                extraction, plus rows for every fact, preference, and
                                sentiment written in this turn.
```

---

## Confidence Decay

Sentiment edges are not permanent. Confidence decays over time according to the chosen policy and is updated whenever a new observation for the same `(user, entity, emotion)` triple arrives.

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

### Emotional Salience

Before an edge is written, confidence is multiplied by an intensity factor derived from the emotion type:

| Multiplier | Emotions |
|---|---|
| ×1.20 | `anger`, `fear` |
| ×1.10 | `frustration` |
| ×1.05 | `sadness`, `disappointment` |
| ×1.00 | `surprise` |
| ×0.95 | `joy` |
| ×0.90 | `trust`, `satisfaction` |
| ×0.85 | `anticipation` |

A Gemini-extracted confidence of 0.80 for `anger` is stored as 0.96. The same score for `anticipation` is stored as 0.68. The result is that intense, explicit emotions carry more weight in the graph from the start.

### Reinforcement

If the user expresses the same sentiment and emotion again, the decayed confidence receives a +0.15 boost (capped at 1.0). This models the idea that hearing the same feeling twice is stronger evidence than hearing it once.

If the sentiment *direction changes* (e.g., the user now feels positive about something they previously felt negative about), the confidence is replaced by the incoming score rather than being reinforced.

### Archival

Edges with confidence below 0.15 are marked `archived: true` rather than deleted. The history is preserved — the system knows the sentiment existed and faded — but archived edges are excluded from live memory reads.

---

## HTTP API

| Method | Path | Description |
|---|---|---|
| `POST` | `/ingest` | Extract memory from a conversation turn and write to Neo4j + PostgreSQL |
| `GET` | `/memory/:userId` | Read the live memory graph for a user from Neo4j |
| `GET` | `/history/:userId` | Read the full audit log for a user from PostgreSQL |

**POST /ingest**
```json
{
  "userId": "user-abc-123",
  "userName": "Alice",
  "conversationTurn": "I was frustrated with Vendor X because they kept delaying our deliveries.",
  "source": "standup"
}
```
`source` is optional and defaults to `"conversation"`. Useful values: `"standup"`, `"chat"`, `"api"`.

**GET /memory/:userId** — response shape:
```json
{
  "sentiments": [
    {
      "entityId": "...", "entityName": "Vendor X", "entityType": "Organization",
      "emotion": "frustration", "sentiment": "negative",
      "reason": "user expressed frustration due to repeated delivery delays",
      "confidence": 0.96, "observedAt": "2026-05-21"
    }
  ],
  "facts": [...],
  "preferences": [...],
  "episodes": [
    {
      "episodeId": "...", "timestamp": "2026-05-21T09:14:22.000Z",
      "source": "standup",
      "entities": [
        { "id": "...", "name": "Vendor X", "type": "Organization" }
      ]
    }
  ],
  "associations": [
    {
      "entityAId": "...", "entityAName": "Vendor X",
      "entityBId": "...", "entityBName": "Delivery Delays",
      "weight": 0.4, "observedCount": 4, "lastSeen": "2026-05-26"
    }
  ]
}
```

---

## Graph Schema in Neo4j

**Node labels:**
```
(:User    { id: string, name: string })
(:Entity  { id: string, name: string, type: string, aliases: string[] })
(:Episode { id: string, userId: string, timestamp: string, source: string })
```

Entity types: `Person`, `Organization`, `Product`, `Event`, `Concept`.

**Relationship types:**
```
(:User)-[:FACT     { relation, confidence, observedAt }]->(:Entity)
(:User)-[:PREFERS  { polarity, reason, confidence, observedAt }]->(:Entity)
(:User)-[:SENTIMENT {
  emotion, sentiment, reason,
  confidence, observedAt,
  halfLifeDays, decayPolicy, archived
}]->(:Entity)

(:Episode)-[:CONTAINS]->(:Entity)
(:Entity)-[:CO_OCCURS { weight, observedCount, lastSeen }]->(:Entity)
```

**Fact relations:** `mentioned`, `worked_with`, `caused`, `has_goal`, `reported_to`

**Preference polarities:** `prefers`, `avoids`, `likes`, `dislikes`

**Sentiment values:** `positive`, `negative`, `neutral`, `mixed`

**Emotions (Plutchik):** `frustration`, `joy`, `trust`, `anger`, `sadness`, `surprise`, `anticipation`, `fear`, `satisfaction`, `disappointment`

**Decay policies:** `exponential`, `linear`, `none`

Uniqueness constraints are created automatically on startup for `User.id`, `Entity.id`, and `Episode.id`.

---

## ERD

### PostgreSQL — audit log tables

```mermaid
erDiagram
    smg_extraction_log {
        varchar   extraction_log_id        PK
        varchar   extraction_log_user_id
        text      extraction_log_conversation
        date      extraction_log_extracted_at
        integer   extraction_log_entities_count
        integer   extraction_log_facts_count
        integer   extraction_log_preferences_count
        integer   extraction_log_sentiments_count
        jsonb     extraction_log_raw_json
    }

    smg_sentiment_log {
        varchar   sentiment_log_id         PK
        varchar   sentiment_log_user_id
        varchar   sentiment_log_entity_id
        varchar   sentiment_log_entity_name
        varchar   sentiment_log_sentiment
        varchar   sentiment_log_emotion
        text      sentiment_log_reason
        float     sentiment_log_confidence
        date      sentiment_log_observed_at
        boolean   sentiment_log_archived
        timestamp sentiment_log_recorded_at
    }

    smg_fact_log {
        varchar   fact_log_id              PK
        varchar   fact_log_user_id
        varchar   fact_log_entity_id
        varchar   fact_log_entity_name
        varchar   fact_log_relation
        float     fact_log_confidence
        date      fact_log_observed_at
        timestamp fact_log_recorded_at
    }

    smg_preference_log {
        varchar   preference_log_id        PK
        varchar   preference_log_user_id
        varchar   preference_log_entity_id
        varchar   preference_log_entity_name
        varchar   preference_log_polarity
        text      preference_log_reason
        float     preference_log_confidence
        date      preference_log_observed_at
        timestamp preference_log_recorded_at
    }

    smg_extraction_log ||--o{ smg_sentiment_log  : "user_id"
    smg_extraction_log ||--o{ smg_fact_log        : "user_id"
    smg_extraction_log ||--o{ smg_preference_log  : "user_id"
```

### Neo4j — live memory graph

```mermaid
graph LR
    U(["👤 User\n─────────\nid\nname"])
    E(["🏷️ Entity\n─────────\nid · name\ntype · aliases"])
    EP(["📍 Episode\n─────────\nid · userId\ntimestamp · source"])

    U -->|"FACT\nrelation · confidence · observedAt"| E
    U -->|"PREFERS\npolarity · reason · confidence · observedAt"| E
    U -->|"SENTIMENT ×N\n(one per emotion)\nemotion · sentiment · reason\nconfidence · decayPolicy · archived"| E
    EP -->|"CONTAINS"| E
    E -->|"CO_OCCURS\nweight · observedCount · lastSeen"| E
```

---

## Project Structure

```
src/
├── main.ts                            # entry point — bootstraps AppModule
├── app.module.ts                      # root module: initialises Neo4j + Postgres, registers MemoryModule
│
├── config/
│   ├── env.ts                         # requireEnvString / requireEnvFloat / requireEnvInt helpers
│   └── constants.ts                   # env-derived runtime constants (thresholds, model name, hebbian delta)
│
├── database/
│   ├── neo4j/
│   │   └── client.ts                  # Neo4j driver singleton + constraint init (User, Entity, Episode)
│   └── postgres/
│       ├── data-source.ts             # PostgresClient singleton (TypeORM DataSource)
│       └── column-types.ts            # shared ColumnOptions constants
│
└── modules/
    └── memory/
        ├── memory.module.ts           # wires all dependencies, registers controller routes
        ├── memory.controller.ts       # Fastify route handlers (ingest, getMemory, getHistory)
        ├── memory.service.ts          # orchestrates extract → resolve → store → log
        │
        ├── dtos/
        │   ├── ingest.dto.ts          # Zod request schema + IngestRequest type (includes source)
        │   ├── memory.dto.ts          # MemoryResponseDto (sentiments, facts, preferences, episodes, associations)
        │   └── history.dto.ts         # HistoryResponseDto (audit log rows)
        │
        ├── domain/
        │   ├── decay.ts               # pure decay + reinforcement logic (DecayEngine)
        │   ├── salience.ts            # emotion-intensity multipliers (applySalience)
        │   ├── hebbian.ts             # co-occurrence pair generation + delta (HebbianEngine)
        │   └── schema/
        │       ├── nodes.ts           # Zod schemas for User, Entity, and Episode nodes
        │       ├── edges.ts           # Zod schemas for Fact, Preference, Sentiment edges
        │       ├── extraction.ts      # Zod schema for LLM extraction output
        │       └── types/             # TypeScript types inferred from the schemas above
        │
        ├── extraction/
        │   ├── extractor.ts           # Gemini call + Zod parse
        │   └── prompt.ts              # system prompt
        │
        └── infrastructure/
            └── persistence/
                ├── entity-repository.abstract.ts   # IEntityRepository interface
                ├── memory-repository.abstract.ts   # IMemoryRepository interface
                ├── log-repository.abstract.ts      # ILogRepository interface
                │
                ├── neo4j/
                │   ├── entity.repository.ts        # entity resolution + all graph writes
                │   └── memory.repository.ts        # graph reads (sentiments, facts, preferences, episodes, associations)
                │
                └── relational/
                    ├── entities/                   # TypeORM entities (schema source of truth)
                    │   ├── extraction-log.entity.ts
                    │   ├── sentiment-log.entity.ts
                    │   ├── fact-log.entity.ts
                    │   └── preference-log.entity.ts
                    └── repositories/
                        └── log.repository.ts       # audit log writes + history reads
```

---

## Setup

**Prerequisites**
- Node.js 22+
- pnpm
- Neo4j instance (local, Docker, or Neo4j Aura)
- PostgreSQL instance (local or Docker)
- Gemini API key

**Option A — Docker Compose (recommended)**

Starts Neo4j and PostgreSQL automatically:
```bash
cp .env.example .env   # fill in GEMINI_API_KEY, NEO4J_PASSWORD, POSTGRES_PASSWORD
docker compose up -d
```

**Option B — local services**

```bash
pnpm install
cp .env.example .env
```

Edit `.env`:
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

DATABASE_URL=postgresql://smg:your_postgres_password@localhost:5432/memory_graph
POSTGRES_PASSWORD=your_postgres_password

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

ARCHIVE_THRESHOLD=0.15
REINFORCEMENT_DELTA=0.15
FUZZY_MATCH_THRESHOLD=0.85
DEFAULT_HALF_LIFE_DAYS=30
HEBBIAN_DELTA=0.1
```

Then start the server:
```bash
pnpm dev
```

**Run tests**
```bash
pnpm test
```

---

## Design Guardrails

**Hedged language only.** The Gemini system prompt enforces that sentiment reasons use phrases like "user expressed frustration" rather than "user hates." This keeps stored memory epistemically honest.

**Confidence is always explicit.** Nothing is stored without a confidence score. Gemini is instructed that 0.0 means a guess and 1.0 means an explicit statement.

**Emotions are independent.** Each `(user, entity, emotion)` pair is its own edge. Fear and anticipation toward the same topic are separate tracked signals that decay independently.

**Intensity is encoded at write time.** Salience multipliers are applied once on ingest and baked into the initial confidence. They do not affect subsequent decay — the decay curve is the same for all edges.

**Associations are global, not per-user.** `CO_OCCURS` edges are between Entity nodes. If two entities appear together for any user, their association strengthens. The read query filters associations to entities the requesting user has touched, but the weight accumulates globally.

**Feelings are not permanent.** Every sentiment edge decays by default. A memory from six months ago with no reinforcement carries very little weight.

**Archival over deletion.** Edges that fall below the confidence threshold are marked archived rather than removed. The trace of a past sentiment remains visible in the graph.

**Entity resolution is conservative.** The fuzzy match threshold is 0.85. Below that, an entity is treated as new rather than silently merged with an existing one.

---

## Tech Stack

| Concern | Library |
|---|---|
| Language | TypeScript (ESM) |
| HTTP server | Fastify |
| Graph database | Neo4j via `neo4j-driver` |
| Relational database | PostgreSQL via TypeORM |
| LLM | Gemini 2.0 Flash via `@google/genai` |
| Schema validation | Zod |
| Fuzzy matching | `fastest-levenshtein` |
| Runtime | `tsx` |
| Tests | Vitest |
