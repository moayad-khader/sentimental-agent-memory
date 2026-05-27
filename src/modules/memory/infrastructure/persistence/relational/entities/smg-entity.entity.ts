import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity("smg_entities")
@Index(["name"])
@Index(["type"])
export class SmgMemoryEntity {
  @PrimaryColumn({ type: "uuid" })
  entity_id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar" })
  type!: string;

  @Column({ type: "jsonb" })
  aliases!: string[];

  @Column({ type: "timestamp" })
  updated_at!: string;
}
