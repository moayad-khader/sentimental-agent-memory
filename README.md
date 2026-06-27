# Project Affectum — Sentimental Memory Graph

I've been working on something lately. I call it **Project Affectum**.

It started with a question I couldn't stop thinking about: how does the human brain actually store memory? Not the pop-science version. The real thing. A few hours of reading in, something clicked. I looked at the AI agent I'd been building and realized it had almost nothing in common with what I'd just read. So I built something different.

---

## The Problem

Vector database of past messages. Key-value store for user facts. System prompt stuffed with context.

This is semantic memory at best. Flat. No weight. No age. No emotion. The agent has no idea whether you mentioned something once while hedging or said it with conviction every week for a month. Everything lands the same.

That's not memory. That's a log file with a search index.

---

## What Neuroscience Says

Memory isn't one thing. It's a coalition of systems:

**Episodic** — autobiographical, timestamped, tied to context. **Semantic** — raw facts, stripped of emotion. **Affective** — the brain tags everything with emotional weight. Fear, trust, frustration. That tagging changes what gets encoded and what shapes future decisions. **Associative** — neurons that fire together, wire together. The brain builds a graph of co-occurrence over time.

None of this exists in the agents we build.

---

## System Architecture

Three layers: a Next.js frontend, a Fastify API, and a dual-database store (Neo4j for the live graph, PostgreSQL for structured persistence and audit logs).

```mermaid
flowchart TB
    subgraph WEB ["apps/web — Next.js 15"]
        CA["ChatApp\nchat · memory toggle · flush"]
        MP["MemoryPanel\nsentiments · facts · prefs · episodes · links"]
        SP["SimulationPanel\npropagation ticks · drift viewer"]
    end

    subgraph API ["apps/api — Fastify"]
        direction LR
        AG["POST /chat\nAgentService"]
        MEM["POST /ingest\nGET /memory/:userId\nGET /history/:userId\nMemoryService"]
        SIM["POST /simulate/:userId\nSimulationService"]
    end

    subgraph PIPELINE ["Memory Pipeline (inside MemoryService)"]
        direction LR
        EX["Gemini Extractor"]
        ER["Entity Resolver\n(Levenshtein ≥ 0.85)"]
        CE["Certainty\nCalibration"]
        SAL["Salience\nEngine"]
        DEC["Decay Engine"]
        HEB["Hebbian Engine"]
    end

    subgraph DATA ["Data Layer"]
        NEO["Neo4j\nlive memory graph"]
        PG["PostgreSQL\nrelational store + audit log"]
    end

    CA -->|HTTP| AG
    CA -->|HTTP| MEM
    CA -->|HTTP| SIM
    MP -->|HTTP| MEM
    SP -->|HTTP| SIM

    AG -->|reads + ingests| MEM
    MEM --> PIPELINE
    PIPELINE --> NEO
    PIPELINE --> PG
    SIM -->|reads CO_OCCURS, writes SENTIMENT| NEO
```

---

## Features

### 1. Memory Ingestion Pipeline

Every conversation turn flows through a six-stage pipeline before anything is written to the graph.

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
       ├──▶ CertaintyEngine     penalises hedged language before salience is applied.
       │                        "Maybe", "kind of", "I guess" → ×0.75 penalty.
       │                        "Absolutely", "definitely", "hate" → ×1.10 boost.
       │
       ├──▶ SalienceEngine      multiplies confidence by an emotion-intensity factor.
       │                        anger/fear → ×1.20, anticipation → ×0.85.
       │
       ├──▶ DecayEngine         runs at write time. Decays stored confidence by time
       │                        elapsed, then applies +0.15 reinforcement if the same
       │                        emotion is re-expressed. Edges below 0.15 are archived.
       │
       ├──▶ EntityRepository    writes users, entities, facts, preferences, and
       │    (upsert*)           sentiments to Neo4j via MERGE. Sentiment edges are
       │                        keyed by (subject, object, emotion) so each emotion
       │                        maintains its own independent decay track.
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

The same upserts are also mirrored to the PostgreSQL relational store via `StoreRepository`, keeping both databases in sync.

---

### 2. Episodic Memory

Every conversation turn is stamped as an `Episode` node and linked to every entity mentioned in it.

```
(Episode { id, userId, timestamp, source: "standup" })-[:CONTAINS]->(Vendor X)
(Episode)-[:CONTAINS]->(Alice)
(Episode)-[:CONTAINS]->(Sprint Planning)
```

Episodes give the agent a temporal narrative: which entities were discussed together, and when. The agent surfaces the five most recent episodes when building its system prompt, ordered by recency.

---

### 3. Sentiment Tracking with Emotion Independence

Emotional signals are extracted per entity, per emotion. Fear and anticipation toward the same thing coexist as separate edges. One does not overwrite the other.

```
(User)-[:SENTIMENT {
  emotion:      "frustration",
  sentiment:    "negative",
  confidence:   0.96,
  ...
}]->(Vendor X)

(User)-[:SENTIMENT {
  emotion:      "anticipation",
  sentiment:    "positive",
  confidence:   0.72,
  ...
}]->(Vendor X)
```

The edge is keyed by `(subjectId, objectId, emotion)`. Updating a frustration reading does not touch the anticipation edge.

---

### 4. Certainty Calibration

Before salience is applied, confidence is adjusted for the language certainty of the conversation turn — not the extracted sentiment score, which only reflects what the LLM read, but the actual hedging in what the user said.

| Pattern | Multiplier |
|---|---|
| Strong hedges: "not sure", "might be wrong", "possibly", "unclear" | ×0.60 |
| Mild hedges: "think", "feel like", "maybe", "kind of", "probably" | ×0.75 |
| Strong conviction: "always", "never", "hate", "absolutely", "love" | ×1.10 |

A Gemini score of 0.80 with "I kind of feel..." becomes 0.60. The same score with "I absolutely cannot stand it" becomes 0.88. Hedging is not conviction.

---

### 5. Emotional Salience

After certainty calibration, an intensity multiplier is applied based on the emotion type, mirroring how the amygdala boosts encoding for emotionally charged events.

| Multiplier | Emotions |
|---|---|
| ×1.20 | `anger`, `fear` |
| ×1.10 | `frustration` |
| ×1.05 | `sadness`, `disappointment` |
| ×1.00 | `surprise` |
| ×0.95 | `joy` |
| ×0.90 | `trust`, `satisfaction` |
| ×0.85 | `anticipation` |

Multipliers are applied once at write time and baked into the initial confidence. The decay curve is the same for all edges after that.

---

### 6. Temporal Decay & Reinforcement

Sentiment edges are not permanent. Confidence degrades over time and is updated whenever a new observation for the same `(user, entity, emotion)` triple arrives.

**Exponential decay** (default):
```
confidence(t) = confidence₀ × 0.5 ^ (days_elapsed / half_life_days)
```

With a default half-life of 30 days, a 0.87 confidence drops to ~0.44 after 30 days and ~0.22 after 60 days.

**Linear decay:**
```
confidence(t) = max(0, confidence₀ − (confidence₀ / half_life_days) × days_elapsed)
```

**No decay:** confidence stays fixed.

**Reinforcement:** if the same sentiment and emotion are re-expressed, the decayed edge receives a +0.15 boost (capped at 1.0). If the direction changes (previously negative, now positive), the incoming score replaces the stored one rather than stacking on top of it.

**Archival:** edges below 0.15 are marked `archived: true` rather than deleted. The history is preserved but excluded from live reads.

---

### 7. Hebbian Associations

Entities that appear together in the same conversation turn form a `CO_OCCURS` edge. The weight increments on each co-occurrence and is capped at 1.0.

```
(Vendor X)-[:CO_OCCURS { weight: 0.4, observedCount: 4, lastSeen: "2026-05-26" }]->(Delivery Delays)
```

Weight starts at `HEBBIAN_DELTA` (default `0.1`) on the first co-occurrence. By the fourth, `(Vendor X, Delivery Delays)` carries weight `0.4` — a learned implicit association the user never stated directly.

`CO_OCCURS` edges are global, not per-user. If two entities appear together for any user, the weight accumulates. Reads filter to entities the requesting user has touched.

---

### 8. ABM Propagation Simulation

When sentiment shifts in one entity, it should ripple through the graph. That's the job of the simulation module.

Each entity acts as an autonomous agent with its own sentiment state. A tick runs across the whole network: for each entity, it collects the sentiment valences of its direct neighbors (via `CO_OCCURS` edges above the minimum weight threshold), computes a weighted average, and nudges the entity's sentiment toward it.

```
newValence = current.valence + influenceRate × (weightedAvgNeighbor − current.valence)
```

Default `influenceRate` is `0.08`. An entity that has never received a direct sentiment reading drifts slowly from the sentiment of nearby things that have been mentioned.

The result is a `TickResult`:

```json
{
  "userId": "...",
  "totalAgents": 12,
  "drifts": [
    {
      "entityName": "Sprint Planning",
      "emotion": "frustration",
      "before": { "sentiment": "neutral", "confidence": 0.50 },
      "after":  { "sentiment": "negative", "confidence": 0.54 },
      "influencedBy": ["Vendor X", "Delivery Delays"]
    }
  ]
}
```

The frontend auto-runs a tick every 5 messages and shows drift rows with before/after bars and the influencing neighbors.

---

### 9. Memory-Augmented Chat Agent

The agent reads the full live memory graph before generating a response. Memory is formatted into a natural-language system prompt — not "according to my data" phrasing, but the voice of someone who was actually there.

```
## What you know about Moayad

**Feelings & emotions:**
  • frustration toward Vendor X [96%] — "user expressed frustration due to repeated delivery delays"
  • anticipation toward Vendor X [72%] — "new vendor shortlist in progress"

**Facts you know:**
  • Vendor X worked_with (88%)

**Preferences:**
  • Moayad dislikes Slow Responses — past vendor delays

**Recent interactions:**
  • [standup] 2026-05-21: Vendor X, Alice, Sprint Planning

**People & things that come up together:**
  • Vendor X ↔ Delivery Delays (strength: 0.40)
```

With `useMemory: false`, the agent skips the graph read entirely and responds as a stateless assistant. Every message sent with memory on is also ingested — the agent learns from every exchange.

---

### 10. Live Web UI

A three-panel Next.js interface built with Framer Motion.

**Chat panel** — standard conversation UI. After each agent turn, an expandable "learned N items" row shows the entities and sentiments extracted from that message.

**Memory panel** — five tabs:
- **Sentiments** — entities grouped by name, each with per-emotion rows showing polarity tag, confidence bar, and reason string. Hover reveals an archive button.
- **Facts** — relation badges and confidence bars. Hover to delete.
- **Prefs** — polarity dots, reason strings, confidence bars. Hover to delete.
- **Episodes** — timestamped entries with entity chips per turn.
- **Links** — Hebbian association pairs with co-occurrence count and weight bar.

**Simulation panel** — a "Run tick" button fires the ABM propagation. Results show agent count, drift count, and sentiment flip count. Each drift row shows the entity, emotion, before/after sentiment with animated progress bars, delta percentage, and which neighbors caused the influence.

Memory is refreshed automatically after each message. A simulation tick runs automatically every 5 messages if there are drifts, then refreshes memory again.

---

## Memory Architecture

```mermaid
flowchart TD
    subgraph PIPELINE ["Ingest Pipeline (per conversation turn)"]
        direction LR
        T["Conversation Turn"] --> GEM["Gemini 2.0 Flash\nExtractor"]
        GEM --> ER["Entity Resolver\nLevenshtein ≥ 0.85"]
        ER --> CE["Certainty\nCalibration"]
        CE --> SAL["Salience\nEngine"]
        SAL --> DEC["Decay Engine\n(decay + reinforce + archive)"]
    end

    subgraph NEO4J ["Neo4j — Live Memory Graph"]
        direction TB
        U(["User\nid · name"])
        E(["Entity\nid · name · type · aliases"])
        EP(["Episode\nid · userId\ntimestamp · source"])

        U -->|"FACT\nrelation · confidence · observedAt"| E
        U -->|"PREFERS\npolarity · reason\nconfidence · observedAt"| E
        U -->|"SENTIMENT ×N per emotion\nemotion · sentiment · reason\nconfidence · halfLifeDays\ndecayPolicy · archived"| E
        EP -->|"CONTAINS"| E
        E -->|"CO_OCCURS\nweight · observedCount · lastSeen"| E
    end

    subgraph ABM ["ABM Propagation (simulation tick)"]
        direction LR
        ADJ["Build adjacency\nfrom CO_OCCURS edges"] --> INF["Weighted influence\nper entity × per emotion"]
        INF --> DRIFT["Compute SentimentDrift\nbefore → after valence"]
        DRIFT --> UPD["Write updated\nconfidence back to Neo4j"]
    end

    subgraph PG ["PostgreSQL — Persistence + Audit"]
        STORE["Relational store\nsmg_entity · smg_fact\nsmg_preference · smg_sentiment\nsmg_episode · smg_co_occurrence"]
        LOG["Audit log\nsmg_extraction_log\nsmg_fact_log · smg_preference_log\nsmg_sentiment_log"]
    end

    DEC -->|"MERGE nodes + edges"| NEO4J
    DEC -->|"upsert rows"| STORE
    DEC -->|"append rows"| LOG
    NEO4J -->|"CO_OCCURS edges"| ABM
    ABM -->|"SENTIMENT updates"| NEO4J
```

### Confidence lifecycle

```
Extracted score
      │
      ├─▶ applyCertainty()   hedging / conviction modifier
      │
      ├─▶ applySalience()    emotion-intensity multiplier
      │
      └─▶ DecayEngine        at write time:
                               1. decay stored confidence by elapsed days
                               2. if same emotion re-expressed → +0.15 boost
                               3. if direction flipped → replace with incoming
                               4. if result < 0.15 → archive edge
```

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

**Associations** — Hebbian co-activation links between entities.
```
(Vendor X)-[:CO_OCCURS { weight: 0.4, observedCount: 4, lastSeen: "2026-05-26" }]->(Delivery Delays)
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

## HTTP API

| Method | Path | Description |
|---|---|---|
| `POST` | `/ingest` | Extract memory from a conversation turn and write to Neo4j + PostgreSQL |
| `GET`  | `/memory/:userId` | Read the live memory graph for a user from Neo4j |
| `GET`  | `/history/:userId` | Read the full audit log for a user from PostgreSQL |
| `POST` | `/chat` | Chat with the memory-augmented agent |
| `POST` | `/simulate/:userId` | Run one ABM propagation tick for a user's entity network |

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

**POST /chat**
```json
{
  "userId": "user-abc-123",
  "userName": "Alice",
  "message": "What do you think I should do about Vendor X?",
  "useMemory": true
}
```

Response includes `response` (the agent reply), `userId`, `useMemory`, and an optional `extracted` field showing what the agent learned from this message.

**POST /simulate/:userId**

Optional body:
```json
{
  "influenceRate": 0.08,
  "minEdgeWeight": 0.05
}
```

Response is a `TickResult` — total agents, drift count, and an array of sentiment changes with before/after confidence and which neighbors caused them.

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
      "entities": [{ "id": "...", "name": "Vendor X", "type": "Organization" }]
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

## Project Structure

```
sentimental-memory-graph/          Nx monorepo (pnpm)
├── apps/
│   ├── api/                       Fastify backend
│   │   └── src/
│   │       ├── main.ts            entry point
│   │       ├── app.module.ts      bootstraps Neo4j + Postgres, registers modules
│   │       │
│   │       ├── config/
│   │       │   ├── env.ts         typed env helpers
│   │       │   └── constants.ts   runtime constants (thresholds, model, hebbian delta)
│   │       │
│   │       ├── database/
│   │       │   ├── neo4j/client.ts           driver singleton + constraint init
│   │       │   └── postgres/data-source.ts   TypeORM DataSource singleton
│   │       │
│   │       ├── llm/
│   │       │   ├── strategy.ts    LLM adapter factory
│   │       │   └── vendors/gemini/adapter.ts  Gemini implementation
│   │       │
│   │       └── modules/
│   │           ├── agent/
│   │           │   ├── agent.controller.ts   POST /chat
│   │           │   ├── agent.service.ts      memory read → system prompt → LLM → ingest
│   │           │   └── dtos/chat.dto.ts      ChatRequest / ChatResponse schemas
│   │           │
│   │           ├── memory/
│   │           │   ├── memory.controller.ts  /ingest, /memory/:id, /history/:id
│   │           │   ├── memory.service.ts     pipeline orchestrator
│   │           │   │
│   │           │   ├── domain/
│   │           │   │   ├── certainty.ts      hedging calibration
│   │           │   │   ├── decay.ts          decay + reinforcement logic
│   │           │   │   ├── hebbian.ts        co-occurrence pair generation
│   │           │   │   ├── salience.ts       emotion-intensity multipliers
│   │           │   │   └── schema/           Zod schemas + inferred TS types
│   │           │   │       ├── nodes.ts
│   │           │   │       ├── edges.ts
│   │           │   │       └── extraction.ts
│   │           │   │
│   │           │   ├── extraction/
│   │           │   │   ├── extractor.ts      Gemini call + Zod parse
│   │           │   │   └── prompt.ts         system prompt for extraction
│   │           │   │
│   │           │   └── infrastructure/persistence/
│   │           │       ├── neo4j/
│   │           │       │   ├── entity.repository.ts   all graph writes (MERGE)
│   │           │       │   └── memory.repository.ts   graph reads
│   │           │       └── relational/
│   │           │           ├── entities/              TypeORM entities (schema source)
│   │           │           └── repositories/
│   │           │               ├── log.repository.ts   audit log writes + reads
│   │           │               └── store.repository.ts relational store writes
│   │           │
│   │           └── simulation/
│   │               ├── simulation.controller.ts  POST /simulate/:userId
│   │               ├── simulation.service.ts     tick orchestrator
│   │               ├── domain/
│   │               │   ├── agent.ts          AgentState + SentimentDrift types
│   │               │   └── propagation.ts    runTick() — ABM logic
│   │               └── infrastructure/
│   │                   └── simulation.repository.ts  reads agents, writes drifts
│   │
│   └── web/                       Next.js 15 frontend
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   └── page.tsx
│           ├── components/
│           │   ├── ChatApp.tsx        root — chat, header, state, auto-tick
│           │   ├── MemoryPanel.tsx    5-tab sidebar: sentiments/facts/prefs/episodes/links
│           │   └── SimulationPanel.tsx propagation results viewer
│           ├── lib/
│           │   ├── api.ts             typed API client (all fetch calls)
│           │   └── utils.ts           cn() helper
│           └── types.d.ts
│
└── libs/
    └── shared/src/index.ts        shared TS types (ChatResponse, MemoryResponse, TickResult, ...)
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

Then start the apps:
```bash
pnpm install
pnpm dev         # runs api + web in parallel
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

Start individual apps:
```bash
pnpm dev:api     # Fastify API only
pnpm dev:web     # Next.js frontend only
pnpm dev         # both in parallel
```

**Run tests:**
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
| Monorepo | Nx + pnpm |
| API server | Fastify 5 |
| Frontend | Next.js 15 + React 19 |
| Animations | Framer Motion |
| Styling | Tailwind CSS 4 |
| Graph database | Neo4j via `neo4j-driver` |
| Relational database | PostgreSQL via TypeORM |
| LLM | Gemini 2.0 Flash via `@google/genai` |
| Schema validation | Zod |
| Fuzzy matching | `fastest-levenshtein` |
| Tests | Vitest |
