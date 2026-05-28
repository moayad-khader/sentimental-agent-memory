import { Entity, PrimaryColumn, Column, Unique, Index, ManyToOne, JoinColumn } from "typeorm";
import { SmgMemoryEntity } from "./smg-entity.entity";

@Entity("smg_facts")
@Unique(["subject_id", "object_entity_id", "relation"])
@Index(["object_entity_id"])
export class SmgFact {
  @PrimaryColumn({ type: "uuid" })
  fact_id!: string;

  // varchar — can be a userId (arbitrary string) or entityId (UUID)
  @Column({ type: "varchar" })
  subject_id!: string;

  @Column({ type: "uuid" })
  object_entity_id!: string;

  @ManyToOne(() => SmgMemoryEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "object_entity_id" })
  objectEntity?: SmgMemoryEntity;

  @Column({ type: "varchar" })
  relation!: string;

  @Column({ type: "double precision" })
  confidence!: number;

  @Column({ type: "date" })
  observed_at!: string;

  @Column({ type: "timestamp" })
  updated_at!: string;
}
