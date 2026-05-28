import { Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { SmgEntityType } from "./smg-entity-type.entity";

@Entity("smg_entities")
@Index(["name"])
@Index(["entity_type_id"])
export class SmgMemoryEntity {
  @PrimaryColumn({ type: "uuid" })
  entity_id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "uuid" })
  entity_type_id!: string;

  @ManyToOne(() => SmgEntityType, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "entity_type_id" })
  entityType?: SmgEntityType;

  @Column({ type: "jsonb" })
  aliases!: string[];

  @Column({ type: "timestamp" })
  updated_at!: string;
}
