import { Entity, PrimaryColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { SmgEpisode } from "./smg-episode.entity";
import { SmgMemoryEntity } from "./smg-entity.entity";

@Entity("smg_episode_entities")
@Index(["entity_id"])
export class SmgEpisodeEntity {
  @PrimaryColumn({ type: "uuid" })
  episode_id!: string;

  @ManyToOne(() => SmgEpisode, { onDelete: "CASCADE" })
  @JoinColumn({ name: "episode_id" })
  episode?: SmgEpisode;

  @PrimaryColumn({ type: "uuid" })
  entity_id!: string;

  @ManyToOne(() => SmgMemoryEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "entity_id" })
  entity?: SmgMemoryEntity;
}
