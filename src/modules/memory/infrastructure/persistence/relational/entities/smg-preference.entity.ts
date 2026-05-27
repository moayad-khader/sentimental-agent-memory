import { Entity, PrimaryColumn, Column, Unique, Index, ManyToOne, JoinColumn } from "typeorm";
import { SmgUser } from "./smg-user.entity";
import { SmgMemoryEntity } from "./smg-entity.entity";

@Entity("smg_preferences")
@Unique(["user_id", "entity_id", "polarity"])
@Index(["entity_id"])
export class SmgPreference {
  @PrimaryColumn({ type: "uuid" })
  preference_id!: string;

  @Column({ type: "varchar" })
  user_id!: string;

  @ManyToOne(() => SmgUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: SmgUser;

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
