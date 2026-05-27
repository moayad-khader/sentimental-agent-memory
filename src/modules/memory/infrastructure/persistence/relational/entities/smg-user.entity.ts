import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("smg_users")
export class SmgUser {
  @PrimaryColumn({ type: "varchar" })
  user_id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "timestamp" })
  updated_at!: string;
}
