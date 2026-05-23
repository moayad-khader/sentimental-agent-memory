import { Entity, PrimaryColumn, Column } from "typeorm";
import { COL_TEXT, COL_DATE, COL_TIMESTAMP, COL_FLOAT } from "@/database/postgres/column-types";

@Entity("smg_preference_log")
export class PreferenceLog {
  @PrimaryColumn()
  preference_log_id!: string;

  @Column()
  preference_log_user_id!: string;

  @Column()
  preference_log_entity_id!: string;

  @Column()
  preference_log_entity_name!: string;

  @Column()
  preference_log_polarity!: string;

  @Column(COL_TEXT)
  preference_log_reason!: string;

  @Column(COL_FLOAT)
  preference_log_confidence!: number;

  @Column(COL_DATE)
  preference_log_observed_at!: string;

  @Column(COL_TIMESTAMP)
  preference_log_recorded_at!: string;
}
