import { Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { SmgMemoryEntity } from "./smg-entity.entity";

@Entity("smg_co_occurrences")
@Index(["entity_b_id"])
@Index(["weight"])
export class SmgCoOccurrence {
  @PrimaryColumn({ type: "uuid" })
  entity_a_id!: string;

  @ManyToOne(() => SmgMemoryEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "entity_a_id" })
  entityA?: SmgMemoryEntity;

  @PrimaryColumn({ type: "uuid" })
  entity_b_id!: string;

  @ManyToOne(() => SmgMemoryEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "entity_b_id" })
  entityB?: SmgMemoryEntity;

  @Column({ type: "double precision" })
  weight!: number;

  @Column({ type: "int" })
  observed_count!: number;

  @Column({ type: "date" })
  last_seen!: string;
}
