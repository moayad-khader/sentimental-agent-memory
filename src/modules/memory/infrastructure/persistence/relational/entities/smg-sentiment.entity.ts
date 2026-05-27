import { Entity, PrimaryColumn, Column, Unique, Index, ManyToOne, JoinColumn } from "typeorm";
import { SmgUser } from "./smg-user.entity";
import { SmgMemoryEntity } from "./smg-entity.entity";

@Entity("smg_sentiments")
@Index(["entity_id"])
@Index(["user_id", "archived"])
@Unique(["user_id", "entity_id", "emotion"])
export class SmgSentiment {
  @PrimaryColumn({ type: "uuid" })
  sentiment_id!: string;

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
