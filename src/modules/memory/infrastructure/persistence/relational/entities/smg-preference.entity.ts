import { Entity, PrimaryColumn, Column, Unique, Index, ManyToOne, JoinColumn } from "typeorm";
import { SmgMemoryEntity } from "./smg-entity.entity";

@Entity("smg_preferences")
@Unique(["subject_id", "entity_id", "polarity"])
@Index(["entity_id"])
export class SmgPreference {
  @PrimaryColumn({ type: "uuid" })
  preference_id!: string;

  // varchar — can be a userId (arbitrary string) or entityId (UUID)
  @Column({ type: "varchar" })
  subject_id!: string;

  @Column({ type: "uuid" })
  entity_id!: string;

  @ManyToOne(() => SmgMemoryEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "entity_id" })
  entity?: SmgMemoryEntity;

  @Column({ type: "varchar" })
  polarity!: string;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "double precision" })
  confidence!: number;

  @Column({ type: "date" })
  observed_at!: string;

  @Column({ type: "timestamp" })
  updated_at!: string;
}
