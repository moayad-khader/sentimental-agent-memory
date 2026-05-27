import type { UserNode, EntityNode, EpisodeNode } from "@/modules/memory/domain/schema/types/nodes.types";
import type { FactEdge, PreferenceEdge, SentimentEdge } from "@/modules/memory/domain/schema/types/edges.types";

export interface IStoreRepository {
  upsertUser(user: UserNode): Promise<void>;
  upsertEntities(entities: EntityNode[]): Promise<void>;
  upsertSentiments(sentiments: SentimentEdge[]): Promise<void>;
  upsertFacts(facts: FactEdge[]): Promise<void>;
  upsertPreferences(preferences: PreferenceEdge[]): Promise<void>;
  upsertEpisode(episode: EpisodeNode, entityIds: string[]): Promise<void>;
  upsertCoOccurrences(entityIds: string[], now: string): Promise<void>;
}
