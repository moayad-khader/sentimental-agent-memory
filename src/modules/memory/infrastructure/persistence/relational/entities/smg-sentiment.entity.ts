import { Entity, PrimaryColumn, Column, Unique, Index, ManyToOne, JoinColumn } from "typeorm";
import { SmgMemoryEntity } from "./smg-entity.entity";

@Entity("smg_sentiments")
@Index(["entity_id"])
@Index(["subject_id", "archived"])
@Unique(["subject_id", "entity_id", "emotion"])
export class SmgSentiment {
  @PrimaryColumn({ type: "uuid" })
  sentiment_id!: string;

  // varchar — can be a userId (arbitrary string) or entityId (UUID)
  @Column({ type: "varchar" })
  subject_id!: string;

  @Column({ type: "uuid" })
  entity_id!: string;

  @ManyToOne(() => SmgMemoryEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "entity_id" })
  entity?: SmgMemoryEntity;

  @Column({ type: "varchar" })
  sentiment!: string;

  @Column({ type: "varchar" })
  emotion!: string;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "double precision" })
  confidence!: number;

  @Column({ type: "int" })
  half_life_days!: number;

  @Column({ type: "varchar" })
  decay_policy!: string;

  @Column({ type: "boolean" })
  archived!: boolean;

  @Column({ type: "date" })
  observed_at!: string;

  @Column({ type: "timestamp" })
  updated_at!: string;
}
