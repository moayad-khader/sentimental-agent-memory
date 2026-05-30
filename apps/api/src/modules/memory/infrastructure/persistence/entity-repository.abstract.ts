import type { ExtractedEntity } from "@/modules/memory/domain/schema/types/extraction.types";
import type { UserNode, EntityNode, EpisodeNode } from "@/modules/memory/domain/schema/types/nodes.types";
import type { FactEdge, PreferenceEdge, SentimentEdge } from "@/modules/memory/domain/schema/types/edges.types";

export interface IEntityRepository {
  resolve(extracted: ExtractedEntity[]): Promise<EntityNode[]>;
  upsertUser(user: UserNode): Promise<void>;
  upsertEntities(entities: EntityNode[]): Promise<void>;
  upsertFacts(facts: FactEdge[]): Promise<void>;
  upsertPreferences(preferences: PreferenceEdge[]): Promise<void>;
  upsertSentiments(sentiments: SentimentEdge[], now: string): Promise<void>;
  upsertEpisode(episode: EpisodeNode, entityIds: string[]): Promise<void>;
  upsertCoOccurrences(entityIds: string[], now: string): Promise<void>;
  archiveSentiment(userId: string, entityId: string, emotion: string): Promise<void>;
  deleteFact(userId: string, entityId: string, relation: string): Promise<void>;
  deletePreference(userId: string, entityId: string): Promise<void>;
}
