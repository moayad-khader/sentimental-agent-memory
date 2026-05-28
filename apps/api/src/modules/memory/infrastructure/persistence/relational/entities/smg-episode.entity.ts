import { Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { SmgUser } from "./smg-user.entity";

@Entity("smg_episodes")
@Index(["user_id", "occurred_at"])
export class SmgEpisode {
  @PrimaryColumn({ type: "uuid" })
  episode_id!: string;

  @Column({ type: "varchar" })
  user_id!: string;

  @ManyToOne(() => SmgUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: SmgUser;

  @Column({ type: "varchar" })
  source!: string;

  @Column({ type: "timestamp" })
  occurred_at!: string;
}
