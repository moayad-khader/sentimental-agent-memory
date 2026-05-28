import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("smg_entity_types")
export class SmgEntityType {
  @PrimaryColumn({ type: "uuid" })
  entity_type_id!: string;

  @Column({ type: "varchar", unique: true })
  name!: string;
}
