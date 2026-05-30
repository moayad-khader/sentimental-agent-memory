# What neuroscience taught me about AI agent memory — and why I built a simulation instead of a database

I spent Eid reading about how the human brain actually stores memory. It broke my mental model of what AI agents should be.

Most of us — engineers especially — think of memory as a database. You write something in, you read it back out. Simple. Clean. Queryable.

The brain doesn't work like that at all.

---

## What neuroscience actually says

Memory isn't one thing. It's a loose coalition of systems that barely talk to each other, each optimized for something different.

**Episodic memory** is autobiographical. It stores *when* and *where* — "I was in that café when I heard that news." It's not facts about the world, it's facts about your experience of the world. It decays. It distorts. You reconstruct it slightly differently every time you recall it.

**Semantic memory** is your internal Wikipedia. Stripped of context, stripped of emotion — just propositions: "Paris is the capital of France." It doesn't remember where you learned that. It just knows.

**Affective memory** is the piece nobody talks about in AI circles. The brain doesn't just remember what happened — it tags everything with an emotional valence. Fear, joy, frustration, trust. This tagging changes how strongly something gets encoded, how easily it's retrieved, and how much it influences future decisions. The amygdala doesn't take notes — it colors them.

**Associative memory** is how concepts cluster. Neurons that fire together, wire together. If you always hear about your boss when you're stressed, that association gets reinforced. The brain builds a graph of co-occurrence over time.

**Temporal decay** is the default state. Memories that aren't recalled fade. Salience — emotional intensity, novelty, repetition — determines what survives.

---

## Then I looked at how AI agents store memory

A system prompt. Maybe a vector database of past messages. Sometimes a key-value store for "user facts."

That's semantic memory at best. No affect. No episodic structure. No association graph. No decay. No distinction between something the user mentioned once while hedging — "I think I kind of don't like my manager" — and something they said with full conviction — "I absolutely cannot stand working there anymore."

Every message carries the same weight. Nothing ages. The agent has no sense of what's salient.

---

## So I built something different

The architecture stores entities — people, places, companies, ideas — as nodes in a graph. Each node accumulates emotional tags: not just "user knows person X" but "user feels frustrated toward X, with 78% confidence, because of Y." These aren't static facts. They drift over time as new signals come in.

Entities that co-appear in conversation build weighted connections between them. Your manager and the word "deadline" start appearing together. That edge gets stronger. The graph now knows something you never said explicitly.

Here's where the simulation layer comes in — and this is where I had to make architectural decisions between several different approaches.

---

## Three ways to propagate state through a graph

The problem: given a graph of entities with emotional valence attached, how do you model the *spread* of sentiment across connected nodes over time?

### Option 1: Spreading Activation

The cognitive science literature has had this model since Collins & Loftus (1975). When a node is activated — either by direct input or retrieval — it emits activation along outgoing edges, proportional to edge weight and inversely proportional to distance. Neighboring nodes accumulate activation, which then decays exponentially unless refreshed.

Formally, for node *i* at time *t*:

```
a_i(t) = Σ_j  w_ij · a_j(t-1) · decay^distance(i,j)
```

Computationally cheap and cognitively grounded. The problem: it treats all nodes as passive. Activation flows *through* them; they don't react to it. There's no notion of a node resisting influence, or having a stable resting state it returns to. Appropriate for retrieval models — not dynamics.

### Option 2: Opinion Dynamics (Deffuant / Hegselmann-Krause)

These are continuous-time models from computational social science. The Deffuant model updates pairs of agents when their opinions fall within a bounded confidence interval ε:

```
if |x_i - x_j| < ε:
    x_i(t+1) = x_i(t) + μ · (x_j(t) - x_i(t))
    x_j(t+1) = x_j(t) + μ · (x_i(t) - x_j(t))
```

Interesting emergent properties: polarization appears naturally when ε is small. Clusters form. Opinion monocultures arise. You can model echo chambers without programming them in.

The problem for this use case: the model assumes symmetric influence between equal agents. But in a personal memory graph, the edge from "job" to "manager" isn't the same as the reverse. A person can feel anxious about their job without that shifting how they feel about their manager — but the reverse may be stronger. You need directional, asymmetric propagation with heterogeneous node behavior.

### Option 3: Loopy Belief Propagation

If you model the graph as a Markov Random Field, you can run belief propagation to compute marginal posteriors over each node's emotional state given observed evidence. Each node sends messages to neighbors representing its current belief:

```
m_ij(t) = Σ_xi  φ(xi) · ψ(xi, xj) · Π_{k∈N(i)\j}  m_ki(t-1)
```

Principled, handles uncertainty well, gives you a proper posterior. The problem: it's expensive on loopy graphs (doesn't converge — only approximates), and more fundamentally it's a *static* inference method. It answers "given current evidence, what's the belief at each node?" — not "how does the system evolve over time as new evidence arrives?"

---

## Why Agent-Based Modeling

ABM is the fourth option — and the one I went with.

The core idea: instead of treating nodes as passive variables updated by a global algorithm, you treat each entity as an autonomous agent with its own local state and update rule. Global dynamics *emerge* from local interactions. There's no central coordinator.

Formally, each entity agent *i* has state vector:

```
s_i = (valence, certainty, last_seen, activation_level)
```

At each simulation tick, every agent updates its own state based on:

1. Its current state
2. The states of its *k*-nearest neighbors, weighted by edge weight
3. A stochastic noise term ε

```
valence_i(t+1) = valence_i(t)
               + α · Σ_j [w_ij · (valence_j(t) - valence_i(t))]
               + β · direct_signal_i(t)
               - γ · (t - last_seen_i)   // temporal decay
               + ε
```

Where:
- **α** — neighborhood influence coefficient
- **β** — direct observation weight
- **γ** — decay constant
- **ε** ~ N(0, σ²) — stochastic noise

### Heterogeneous agents

Not every node uses the same update rule. An entity tagged as a "core relationship" (high centrality, long history) has a dampened α — it resists emotional drift from neighbors. A peripheral entity has high α — it's susceptible to coloring from nearby nodes. This mirrors something real: your feelings about your oldest friend are harder to shift by association than your feelings about a company you started using last month.

### Asynchronous updates

In a synchronous model, all nodes update simultaneously — the system ticks like a clock. But memory doesn't work that way. Some entities are activated daily (your job), others go dormant for months (an old colleague). Asynchronous ABM lets you model quiescence: a node that hasn't been activated doesn't update — it just decays. When it wakes, it re-syncs with its current neighborhood rather than catching up on every missed tick.

### Watching a ripple in practice

After enough ticks the graph reaches local equilibrium — a stable emotional configuration given current edge weights. When new conversation input arrives, it perturbs the equilibrium. The manager scenario plays out like this:

```
t=0  job.valence = -0.6,  manager.valence = -0.2,  edge(job → manager) = 0.7
t=1  manager receives -0.28 from job neighbor  (0.7 × -0.6 × α)
t=2  manager.valence = -0.35, begins influencing "deadline"  (edge = 0.5)
t=5  equilibrium:  manager.valence = -0.41
```

Nothing new was said about the manager. The graph inferred the drift from structural proximity.

---

## The implementation details I got obsessive about

### Certainty calibration

Language carries confidence signals. Certainty is estimated by a regression over hedge markers:

- "I guess," "sort of," "maybe" → confidence penalty
- "Absolutely," "definitely," "cannot stand" → confidence boost

The valence update is then gated:

```
effective_signal = raw_valence · certainty_score
```

A high-confidence weak signal can outweigh a low-confidence strong one. The system doesn't overfit to hedged language.

### Temporal decay with entity-specific half-lives

Decay isn't a global constant. Peripheral entities decay faster than core relationships. Entities with high edge centrality decay slower — they get reactivated as collateral whenever neighbors fire. The decay term in the update rule becomes:

```
decay_i(t) = γ_i · (t - last_seen_i)
```

Where γ_i is learned per entity category, not fixed globally.

### Episodic anchoring

Every conversation turn is timestamped and linked to the entities present in it. The system knows not just *what* but *when* — and recent episodes carry more weight in computing effective_signal. Older episodes contribute but are discounted by an exponential time kernel:

```
episode_weight(e) = exp(-λ · (t_now - t_e))
```

---

## Tradeoffs I'm still working through

ABM is noisy. Stochastic updates mean the graph doesn't converge to the same equilibrium every run — it converges to a *distribution* of equilibria. This is actually desirable (it mirrors real psychological uncertainty), but it makes evaluation hard. What's ground truth for "how anxious should this node be?"

The decay constants and neighborhood influence coefficients are currently hand-tuned on a small eval set. The right path is a learned model — but that requires labeled data on how emotional valence propagates across relationships, which doesn't really exist as a public dataset.

Propagation depth is capped at k=2 hops to avoid global diffusion from a single signal. Whether that's the right bound is an open question.

---

## What this changes for agents

An agent with this kind of memory doesn't just remember what you said. It models how you feel about your world — and that model evolves continuously, even between conversations.

It can notice that you've grown more guarded about a topic. It can weight recent emotional signals more heavily than old ones. It can surface connections you never made explicit — because the graph made them for you.

That's not retrieval. That's something closer to what a good therapist, a long-time friend, or a great manager does — building a mental model of you that accumulates, shifts, and learns over time.

We're still early. The extraction is imperfect, the propagation is noisy, the decay constants are hand-tuned. But the direction feels right.

If you're building agents that are supposed to have long-term relationships with users — assistants, coaches, companions, CRMs — think less about databases and more about neuroscience.

The brain spent 500 million years figuring out how to remember what matters. We should at least steal the best parts.

---

Building this as an open project — happy to talk architecture with anyone thinking about agent memory.
