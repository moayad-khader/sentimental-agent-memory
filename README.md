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
POST /ingest
       │
       ▼
  IngestHandler      validates request body (userId, userName, conversationTurn)
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
       │    (upsert*)           sentiments to Neo4j via MERGE. For sentiment edges,
       │                        reads the existing edge first and applies decay.
       │
       ├──▶ DecayEngine         runs at write time. Decays stored confidence by time
       │                        elapsed, then applies a reinforcement boost if the same
       │                        sentiment is re-expressed. Edges below 0.15 are archived.
       │
       └──▶ LogRepository       writes a full audit trail to PostgreSQL — one row per
                                extraction, plus rows for every fact, preference, and
                                sentiment that was written in this turn.
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
  "conversationTurn": "I was frustrated with Vendor X because they kept delaying our deliveries."
}
```

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
    E(["🏷️ Entity\n─────────\nid\nname\ntype\naliases"])

    U -->|"FACT\nrelation · confidence · observedAt"| E
    U -->|"PREFERS\npolarity · reason · confidence · observedAt"| E
    U -->|"SENTIMENT\nsentiment · emotion · reason\nconfidence · observedAt\nhalfLifeDays · decayPolicy · archived"| E
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
│   └── constants.ts                   # env-derived runtime constants (thresholds, model name)
│
├── database/
│   ├── neo4j/
│   │   └── client.ts                  # Neo4j driver singleton + constraint init
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
        │   ├── ingest.dto.ts          # Zod request schema + IngestRequest type
        │   ├── memory.dto.ts          # MemoryResponseDto (sentiments, facts, preferences)
        │   └── history.dto.ts         # HistoryResponseDto (audit log rows)
        │
        ├── domain/
        │   ├── decay.ts               # pure decay + reinforcement logic
        │   └── schema/
        │       ├── nodes.ts           # Zod schemas for User and Entity nodes
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
                │   ├── entity.repository.ts        # entity resolution + graph writes
                │   └── memory.repository.ts        # graph reads
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
GEMINI_MODEL=gemini-flash-lite-latest
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
